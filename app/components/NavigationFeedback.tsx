"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { routeLang } from "../lib/i18n";

const PROGRESS_DELAY_MS = 80;
const DIM_DELAY_MS = 260;
const SLOW_NAV_MS = 3500;
const DONE_FLASH_MS = 220;

const COPY = {
  zh: {
    slow: "正在加载页面，网络较慢…",
    offline: "网络连接已断开，暂时无法跳转",
    openDirect: "改用整页打开",
    retry: "重试",
    stay: "留在本页",
    progressLabel: "页面加载进度",
  },
  en: {
    slow: "Loading page… slow connection",
    offline: "You appear to be offline",
    openDirect: "Open directly",
    retry: "Retry",
    stay: "Stay here",
    progressLabel: "Page loading progress",
  },
} as const;

type NavPhase = "idle" | "waiting" | "done";

type PendingNav = {
  href: string;
  startedAt: number;
};

function normPath(pathname: string): string {
  return pathname.replace(/\/+$/u, "") || "/";
}

function clearPendingAnchor(ref: { current: HTMLAnchorElement | null }) {
  if (ref.current) {
    ref.current.removeAttribute("data-nav-pending");
    ref.current = null;
  }
}

function setMainPending(active: boolean) {
  const main = document.getElementById("main-content");
  if (!main) return;
  if (active) main.setAttribute("data-nav-pending", "true");
  else main.removeAttribute("data-nav-pending");
}

export function NavigationFeedback() {
  const pathname = usePathname() || "/";
  const lang = routeLang(pathname);
  const t = COPY[lang];

  const [phase, setPhase] = useState<NavPhase>("idle");
  const [barVisible, setBarVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const pendingRef = useRef<PendingNav | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const lastPathRef = useRef(normPath(pathname));

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const resetAll = useCallback(() => {
    clearTimers();
    pendingRef.current = null;
    clearPendingAnchor(anchorRef);
    setMainPending(false);
    setPhase("idle");
    setBarVisible(false);
    setSlow(false);
    setOffline(false);
    setPendingHref(null);
  }, [clearTimers]);

  const finishNavigation = useCallback(() => {
    if (!pendingRef.current) return;
    clearTimers();
    pendingRef.current = null;
    clearPendingAnchor(anchorRef);
    setMainPending(false);
    setSlow(false);
    setOffline(false);
    setPendingHref(null);
    setPhase("done");
    const hideId = window.setTimeout(() => {
      setPhase("idle");
      setBarVisible(false);
    }, DONE_FLASH_MS);
    timersRef.current.push(hideId);
  }, [clearTimers]);

  const startNavigation = useCallback(
    (href: string, anchor: HTMLAnchorElement | null) => {
      clearTimers();
      clearPendingAnchor(anchorRef);
      if (anchor) {
        anchor.setAttribute("data-nav-pending", "true");
        anchorRef.current = anchor;
      }

      pendingRef.current = { href, startedAt: Date.now() };
      setPendingHref(href);
      setPhase("waiting");
      setSlow(false);

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setOffline(true);
        setBarVisible(true);
        return;
      }
      setOffline(false);

      const barId = window.setTimeout(() => {
        if (pendingRef.current) setBarVisible(true);
      }, PROGRESS_DELAY_MS);
      const dimId = window.setTimeout(() => {
        if (pendingRef.current) setMainPending(true);
      }, DIM_DELAY_MS);
      const slowId = window.setTimeout(() => {
        if (pendingRef.current) setSlow(true);
      }, SLOW_NAV_MS);
      timersRef.current.push(barId, dimId, slowId);
    },
    [clearTimers],
  );

  // Route committed -> finish feedback cleanly.
  useEffect(() => {
    const current = normPath(pathname);
    if (current !== lastPathRef.current) {
      lastPathRef.current = current;
      const id = window.setTimeout(() => finishNavigation(), 0);
      return () => window.clearTimeout(id);
    }
  }, [finishNavigation, pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.closest("[data-no-nav-feedback]")) return;

      const rawHref = anchor.getAttribute("href") ?? "";
      if (!rawHref || rawHref.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (normPath(url.pathname) === normPath(window.location.pathname)) return;

      startNavigation(url.href, anchor);
    };

    const onPopState = () => {
      const id = window.setTimeout(() => finishNavigation(), 0);
      timersRef.current.push(id);
    };

    const onOffline = () => {
      if (pendingRef.current) {
        setOffline(true);
        setBarVisible(true);
      }
    };

    const onOnline = () => {
      setOffline(false);
    };

    const onErrorOrRejection = () => {
      if (pendingRef.current) {
        setSlow(true);
        setBarVisible(true);
      }
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("unhandledrejection", onErrorOrRejection);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("unhandledrejection", onErrorOrRejection);
      clearTimers();
      clearPendingAnchor(anchorRef);
      setMainPending(false);
    };
  }, [clearTimers, finishNavigation, startNavigation]);

  const showToast = Boolean(pendingHref && (slow || offline));

  return (
    <>
      {barVisible || phase === "done" ? (
        <div
          className="sh-nav-progress"
          data-state={phase}
          role="progressbar"
          aria-label={t.progressLabel}
          aria-valuetext={phase === "done" ? "100%" : "loading"}
        >
          <span className="sh-nav-progress-bar" />
        </div>
      ) : null}

      {showToast && pendingHref ? (
        <div className="sh-nav-toast" role="status" aria-live="polite">
          <span className="sh-nav-toast-msg">{offline ? t.offline : t.slow}</span>
          <div className="sh-nav-toast-actions">
            <button
              type="button"
              className="sh-nav-toast-btn is-primary"
              onClick={() => window.location.assign(pendingHref)}
            >
              {offline ? t.retry : t.openDirect}
            </button>
            <button
              type="button"
              className="sh-nav-toast-btn"
              onClick={resetAll}
            >
              {t.stay}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
