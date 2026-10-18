"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { previewFrameProps } from "../../../ui/garden/file-block.mjs";
import { ActionGlyph, FileGlyph } from "./file-icons";

export type PreviewFile = {
  title: string;
  name: string;
  meta: string;
  icon: string;
  url: string;
  preview: "md" | "html" | "pdf";
};

/**
 * The 预览 button and its drawer. Markdown arrives already rendered on the
 * server as `children`; HTML runs in a sandbox without the site's origin; PDF
 * uses the browser's own viewer. Without scripts the button is hidden by CSS
 * and the card's download link still works.
 */
export function FilePreview({ file, compact, children }: { file: PreviewFile; compact: boolean; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

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
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("a[href], button, iframe, [tabindex]:not([tabindex='-1'])")];
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
                <a className="gf-btn icon" href={file.url} download={file.name} aria-label={`下载 ${file.name}`} title="下载">
                  <ActionGlyph name="download" />
                </a>
                <a className="gf-btn icon" href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`在新标签页打开 ${file.name}`} title="在新标签页打开">
                  <ActionGlyph name="external" />
                </a>
                <button ref={closeButton} type="button" className="gf-btn icon" onClick={close} aria-label="关闭预览" title="关闭">
                  <ActionGlyph name="close" />
                </button>
              </div>
            </div>
            {!frame ? (
              <div className="gf-db">{children}</div>
            ) : (
              <div className="gf-db gf-db-frame">
                <iframe className="gf-frame" {...frame} />
              </div>
            )}
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="gf-btn gf-preview"
        data-compact={compact ? "true" : undefined}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`预览 ${file.name}`}
      >
        <ActionGlyph name="eye" />
        <span className="gf-lb">预览</span>
      </button>
      {drawer}
    </>
  );
}
