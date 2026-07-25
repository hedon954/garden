"use client";

import { useEffect, useId, useState } from "react";

let mermaidRenderQueue: Promise<unknown> = Promise.resolve();

function renderMermaid(source: string, id: string) {
  const task = mermaidRenderQueue.then(async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      fontFamily: "var(--font-mono)",
      securityLevel: "strict",
      suppressErrorRendering: true,
    });
    return mermaid.render(id, source);
  });
  mermaidRenderQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export function MermaidDiagram({ source }: { source: string }) {
  const reactId = useId();
  const [view, setView] = useState<"render" | "code">("render");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const panelId = `mermaid-panel-${reactId.replaceAll(":", "")}`;

  useEffect(() => {
    let active = true;
    const draw = async () => {
      setError(false);
      try {
        const id = `mermaid-${reactId.replaceAll(":", "")}`;
        const result = await renderMermaid(source, id);
        if (active) setSvg(result.svg);
      } catch {
        if (active) setError(true);
      }
    };
    void draw();
    return () => {
      active = false;
    };
  }, [reactId, source]);

  return (
    <figure
      className="mermaid-block language-mermaid"
      data-mermaid-theme="neutral"
    >
      <figcaption className="mermaid-toolbar">
        <span>Mermaid</span>
        <span
          className="mermaid-view-switcher"
          role="tablist"
          aria-label="切换 Mermaid 显示方式"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "render"}
            aria-controls={panelId}
            tabIndex={view === "render" ? 0 : -1}
            onClick={() => setView("render")}
          >
            图表
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "code"}
            aria-controls={panelId}
            tabIndex={view === "code" ? 0 : -1}
            onClick={() => setView("code")}
          >
            Code
          </button>
        </span>
      </figcaption>
      {view === "render" ? (
        <div
          className="mermaid-canvas"
          id={panelId}
          role="tabpanel"
          aria-live="polite"
        >
          {svg ? (
            <div
              className="mermaid-svg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : null}
          {!svg && !error ? (
            <span className="mermaid-loading">正在绘制图表…</span>
          ) : null}
          {error ? (
            <span className="mermaid-error">图表渲染失败，请检查语法。</span>
          ) : null}
        </div>
      ) : (
        <pre
          className="mermaid-code"
          id={panelId}
          role="tabpanel"
          data-language="MERMAID"
        >
          <code>{source}</code>
        </pre>
      )}
    </figure>
  );
}
