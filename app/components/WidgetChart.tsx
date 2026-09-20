"use client";

import { ArrowUpRight, Browser, CaretDown, FilePdf } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { parse } from "yaml";

type WidgetKind = "chart" | "html" | "pdf";

type WidgetData = {
  src: string;
  caption: string;
  kind: WidgetKind;
  height?: number;
};

const widgetKinds = new Set<WidgetKind>(["chart", "html", "pdf"]);

function kindFromInput(src: string, requested: unknown): WidgetKind | null {
  if (typeof requested === "string" && widgetKinds.has(requested.trim() as WidgetKind)) {
    return requested.trim() as WidgetKind;
  }
  if (/\.pdf(?:[?#]|$)/iu.test(src)) return "pdf";
  if (/\.html(?:[?#]|$)/iu.test(src)) return "chart";
  return null;
}

function readWidgetData(source: string): WidgetData | null {
  try {
    const value = parse(source.trim()) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    if (typeof input.src !== "string" || !input.src.trim()) return null;
    if (typeof input.caption !== "string" || !input.caption.trim()) return null;

    const src = input.src.trim();
    if (!src.startsWith("/") || src.startsWith("//")) return null;
    const kind = kindFromInput(src, input.kind);
    if (!kind) return null;

    const height =
      typeof input.height === "number" && Number.isFinite(input.height) && input.height > 0
        ? Math.round(input.height)
        : undefined;
    return { src, caption: input.caption.trim(), kind, height };
  } catch {
    return null;
  }
}

function themeFromDocument() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function withTheme(src: string, theme: "light" | "dark") {
  const [path, query = ""] = src.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("theme", theme);
  return `${path}?${params.toString()}`;
}

function fileName(src: string) {
  const path = src.split(/[?#]/u, 1)[0] ?? src;
  const segment = path.split("/").filter(Boolean).pop() ?? path;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function DocumentThumb({ kind }: { kind: "html" | "pdf" }) {
  return (
    <span className={`garden-doc-thumb garden-doc-thumb-${kind}`} aria-hidden="true">
      <span className="garden-doc-thumb-bar" />
      <span className="garden-doc-thumb-line" />
      <span className="garden-doc-thumb-line" />
      <span className="garden-doc-thumb-line garden-doc-thumb-line-short" />
    </span>
  );
}

export function WidgetChart({ source }: { source: string }) {
  const data = readWidgetData(source);
  const src = data?.src;
  const kind = data?.kind;
  const isDocument = kind === "html" || kind === "pdf";
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [height, setHeight] = useState(data?.height ?? (data?.kind === "pdf" ? 720 : 360));
  const [frameSrc, setFrameSrc] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  const [armed, setArmed] = useState(!isDocument);
  const active = Boolean(src && kind && armed);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(themeFromDocument());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!src || !kind || !active) return;

    if (kind === "pdf") {
      setFrameSrc(src);
      return;
    }

    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const payload = event.data;
      if (
        !payload ||
        typeof payload !== "object" ||
        (payload as { source?: unknown }).source !== "garden-chart" ||
        typeof (payload as { height?: unknown }).height !== "number" ||
        !Number.isFinite((payload as { height: number }).height)
      ) {
        return;
      }
      setHeight(Math.max(160, Math.min(1600, Math.round((payload as { height: number }).height))));
    };

    window.addEventListener("message", onMessage);
    setFrameSrc(withTheme(src, theme));
    return () => window.removeEventListener("message", onMessage);
  }, [src, kind, theme, active]);

  if (!data) {
    return (
      <p className="external-embed-error">
        无法解析这个嵌入块。请在与 Markdown 同名的目录里放一份 .html 或 .pdf，并在围栏中写 src 与 caption。
      </p>
    );
  }

  const frame = (
    <div className="garden-chart-frame" style={{ height: isDocument ? data.height : height }}>
      <iframe
        ref={frameRef}
        src={frameSrc}
        title={data.caption}
        sandbox={data.kind === "pdf" ? undefined : "allow-scripts"}
        referrerPolicy="no-referrer"
      />
    </div>
  );

  if (!isDocument) {
    return (
      <figure className="garden-chart">
        {frame}
        <figcaption>
          <span>{data.caption}</span>
          <a href={data.src} target="_blank" rel="noopener noreferrer">
            打开页面
          </a>
        </figcaption>
        <noscript>
          <p>{data.caption}</p>
        </noscript>
      </figure>
    );
  }

  const Icon = data.kind === "pdf" ? FilePdf : Browser;
  const kindLabel = data.kind === "pdf" ? "PDF" : "页面";
  const openLabel = data.kind === "pdf" ? "打开 PDF" : "打开页面";

  return (
    <figure
      className={`garden-chart garden-doc garden-doc-${data.kind}`}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="garden-doc-launch">
        <button
          type="button"
          className="garden-doc-toggle"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((current) => {
              const next = !current;
              if (next) setArmed(true);
              return next;
            });
          }}
        >
          <DocumentThumb kind={data.kind} />
          <span className="garden-doc-copy">
            <small>
              <Icon size={15} weight="regular" />
              {kindLabel} · {fileName(data.src)}
            </small>
            <strong>{data.caption}</strong>
          </span>
          <span className="garden-doc-action">
            {expanded ? "收起" : "展开"}
            <CaretDown size={14} className="garden-doc-caret" />
          </span>
        </button>
        <a className="garden-doc-open" href={data.src} target="_blank" rel="noopener noreferrer">
          {openLabel}
          <ArrowUpRight size={14} />
        </a>
      </div>
      <div className="garden-doc-pane">
        <div className="garden-doc-pane-inner">{armed ? frame : null}</div>
      </div>
      <noscript>
        <p>
          {data.caption}{" "}
          <a href={data.src} target="_blank" rel="noopener noreferrer">
            {openLabel}
          </a>
        </p>
      </noscript>
    </figure>
  );
}
