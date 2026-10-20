"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Labels = { nextPage: string; loadingMore: string; loadFailed: string; feedEnd: string };

/**
 * The end of a feed page. Without JavaScript it is a plain 下一页 link to the
 * next pre-rendered page. With JavaScript, when it scrolls near the viewport it
 * fetches that page's HTML, appends its items to the list above and moves on.
 */
export function FeedMore({ next, streamSelector, labels }: { next: string | null; streamSelector: string; labels: Labels }) {
  const [href, setHref] = useState(next);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const navRef = useRef<HTMLElement>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!href || busy.current) return;
    busy.current = true;
    setState("loading");
    try {
      const response = await fetch(href, { headers: { Accept: "text/html" } });
      if (!response.ok) throw new Error(String(response.status));
      const page = new DOMParser().parseFromString(await response.text(), "text/html");
      const incoming = page.querySelector(streamSelector);
      const stream = navRef.current?.parentElement?.querySelector(streamSelector);
      if (!incoming || !stream) throw new Error("feed markup");
      stream.append(...Array.from(incoming.children).map((node) => document.importNode(node, true)));
      setHref(page.querySelector<HTMLAnchorElement>("[data-feed-next]")?.getAttribute("href") ?? null);
      setState("idle");
    } catch {
      setState("error");
    } finally {
      busy.current = false;
    }
  }, [href, streamSelector]);

  useEffect(() => {
    const node = navRef.current;
    if (!node || !href || state !== "idle" || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void load();
    }, { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [href, state, load]);

  return (
    <nav ref={navRef} className="feed-more" aria-live="polite">
      {href ? (
        <a
          href={href}
          rel="next"
          data-feed-next=""
          onClick={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          {state === "loading" ? labels.loadingMore : state === "error" ? labels.loadFailed : labels.nextPage}
        </a>
      ) : (
        <span className="feed-end">{labels.feedEnd}</span>
      )}
    </nav>
  );
}
