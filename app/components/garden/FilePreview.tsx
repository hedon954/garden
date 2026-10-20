"use client";

import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ui, type UiLang } from "../../lib/i18n";
import { previewBody, previewFrameProps } from "../../../ui/garden/file-block.mjs";
import { ActionGlyph, FileGlyph } from "./file-icons";

export type PreviewFile = {
  title: string;
  name: string;
  meta: string;
  icon: string;
  url: string;
  preview: "md" | "html" | "pdf";
  /** Markdown only: the preview rendered at build time, in its own file. */
  src?: string;
};

type Loaded = { state: "idle" | "loading" | "error" } | { state: "ready"; html: string };

/**
 * The 预览 control and its drawer. Markdown is fetched from its prerendered
 * file the first time the drawer opens (the page does not carry it); HTML runs
 * in a sandbox without the site's origin; PDF uses the browser's own viewer.
 * The control is a link: without JavaScript it opens the same preview (or the
 * file) in a new tab, next to the card's download link.
 */
export function FilePreview({ file, compact, lang }: { file: PreviewFile; compact: boolean; lang?: UiLang }) {
  const t = ui(lang);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded>({ state: "idle" });
  const trigger = useRef<HTMLAnchorElement>(null);
  const request = useRef<AbortController | null>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    request.current?.abort();
    setOpen(false);
    trigger.current?.focus();
  }, []);

  const load = useCallback(() => {
    if (!file.src) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoaded({ state: "loading" });
    fetch(file.src, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((text) => {
        if (request.current !== controller) return;
        const html = previewBody(text);
        setLoaded(html ? { state: "ready", html } : { state: "error" });
      })
      .catch(() => {
        if (request.current !== controller) return;
        // Closed before it arrived: the next open starts again.
        setLoaded(controller.signal.aborted ? { state: "idle" } : { state: "error" });
      });
  }, [file.src]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("ux-lock");
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("a[href], button, iframe, [tabindex]:not([tabindex='-1'])")].filter((element) => !element.hasAttribute("data-gf-sentinel"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("ux-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Focus loops inside the drawer even when it starts in the iframe.
  // After the iframe: Tab left it, so go round to the drawer's first control.
  const fromAfter = () => {
    panel.current?.querySelector<HTMLElement>(".gf-dh a[href], .gf-dh button")?.focus();
  };
  // Before the iframe: coming forward from the header, go on into the iframe;
  // coming back out of it (Shift+Tab, or from outside), go to the close button.
  const fromBefore = (event: FocusEvent<HTMLSpanElement>) => {
    const from = event.relatedTarget as Node | null;
    if (from && panel.current?.querySelector(".gf-dh")?.contains(from)) frameRef.current?.focus();
    else closeButton.current?.focus();
  };

  // A plain click opens the drawer; a modified click (new tab, new window) keeps the link.
  const openDrawer = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setOpen(true);
    // Fetched on first open and kept; a failed or interrupted load starts again.
    if (file.preview === "md" && loaded.state !== "ready" && loaded.state !== "loading") load();
  };

  const frame = previewFrameProps(file) as { src: string; title: string; referrerPolicy: "no-referrer"; sandbox?: string } | null;
  const drawer = open
    ? createPortal(
        <div className="gf-layer">
          <div className="gf-scrim" onClick={close} aria-hidden="true" />
          <aside ref={panel} className="gf-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} data-preview={file.preview}>
            <div className="gf-dh">
              <span className="gf-ico" aria-hidden="true"><FileGlyph kind={file.icon} /></span>
              <div className="gf-main">
                <div className="gf-name" id={titleId} title={file.title}>{file.title}</div>
                {file.meta ? <div className="gf-meta">{file.meta}</div> : null}
              </div>
              <div className="gf-act">
                <a className="gf-btn icon" href={file.url} download={file.name} aria-label={t.downloadNamed(file.name)} title={t.download}>
                  <ActionGlyph name="download" />
                </a>
                <a className="gf-btn icon" href={file.url} target="_blank" rel="noopener noreferrer" aria-label={t.openNamedInTab(file.name)} title={t.openInTab}>
                  <ActionGlyph name="external" />
                </a>
                <button ref={closeButton} type="button" className="gf-btn icon" onClick={close} aria-label={t.closePreview} title={ui(lang).close.trim()}>
                  <ActionGlyph name="close" />
                </button>
              </div>
            </div>
            {!frame ? (
              <div className="gf-db" aria-busy={loaded.state === "loading" ? "true" : undefined}>
                {loaded.state === "ready" ? (
                  <div className="markdown-body prose gf-doc" dangerouslySetInnerHTML={{ __html: loaded.html }} />
                ) : loaded.state === "error" ? (
                  <div className="gf-state" role="alert">
                    <p>{t.previewFailed}</p>
                    <div className="gf-state-act">
                      <button type="button" className="gf-btn" onClick={() => load()}>{t.retry}</button>
                      <a className="gf-btn" href={file.url} download={file.name}>{t.downloadFile}</a>
                    </div>
                  </div>
                ) : (
                  <div className="gf-state" role="status">{t.previewLoading}</div>
                )}
              </div>
            ) : (
              <div className="gf-db gf-db-frame">
                {/* Keys pressed inside the iframe never reach this page, so Tab out of it is caught here and kept in the drawer. */}
                <span tabIndex={0} className="gf-sentinel" data-gf-sentinel="before" onFocus={fromBefore} />
                <iframe ref={frameRef} className="gf-frame" {...frame} />
                <span tabIndex={0} className="gf-sentinel" data-gf-sentinel="after" onFocus={fromAfter} />
              </div>
            )}
            <p className="gf-hint">{t.escClose}</p>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <a
        ref={trigger}
        href={file.preview === "md" && file.src ? file.src : file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="gf-btn gf-preview"
        data-compact={compact ? "true" : undefined}
        onClick={openDrawer}
        aria-haspopup="dialog"
        aria-label={t.previewNamed(file.name)}
      >
        <ActionGlyph name="eye" />
        <span className="gf-lb">{t.preview}</span>
      </a>
      {drawer}
    </>
  );
}
