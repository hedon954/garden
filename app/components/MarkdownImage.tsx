"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";

// react-markdown also hands over its syntax-tree `node`; it must not reach the DOM.
type MarkdownImageProps = ComponentPropsWithoutRef<"img"> & { node?: unknown };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MarkdownImage({ alt = "", src, node, style, ...props }: MarkdownImageProps) {
  const [open, setOpen] = useState(false);
  const description = alt || "查看原图";

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("image-preview-open");

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("image-preview-open");
    };
  }, [open]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        className="markdown-image-trigger"
        onClick={() => setOpen(true)}
        aria-label={`放大查看：${description}`}
      >
        {/* Native images preserve Typora-authored relative paths. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" alt={alt} src={src} {...props} style={style} />
      </button>

      {open ? (
        <div
          className="markdown-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={description}
          onClick={() => setOpen(false)}
        >
          <div className="markdown-image-lightbox-content" onClick={(event) => event.stopPropagation()}>
            {/* The preview sizes itself; the article's inline width stays on the article image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} width={props.width} height={props.height} />
            <button
              type="button"
              className="markdown-image-lightbox-close"
              onClick={() => setOpen(false)}
              aria-label="关闭图片预览"
            >
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
