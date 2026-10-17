"use client";

import { useEffect, useId, useState } from "react";

let mermaidRenderQueue: Promise<unknown> = Promise.resolve();

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderMermaid(source: string, id: string) {
  const task = mermaidRenderQueue.then(async () => {
    const mermaid = (await import("mermaid")).default;
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const prepared = source
      .replace(/^\s*classDef .*$/gm, "")
      .replace(/^\s*style .*$/gm, "");
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      fontFamily: token("--sans") || "-apple-system, PingFang SC, sans-serif",
      flowchart: { useMaxWidth: true, htmlLabels: false },
      themeVariables: {
        darkMode: dark,
        background: token("--paper"),
        primaryColor: token("--card"),
        primaryBorderColor: token("--rule-strong"),
        primaryTextColor: token("--ink"),
        lineColor: token("--muted"),
        secondaryColor: token("--well"),
        tertiaryColor: token("--well"),
        fontSize: "14px",
        edgeLabelBackground: token("--paper"),
      },
    });
    return mermaid.render(id, prepared);
  });
  mermaidRenderQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

export function MermaidDiagram({ source }: { source: string }) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const draw = async () => {
      setError(false);
      setSvg("");
      try {
        const id = `mermaid-${reactId.replaceAll(":", "")}-${theme}`;
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
  }, [reactId, source, theme]);

  return (
    <figure className="g-mermaid mermaid-block language-mermaid" data-g="mermaid" data-mermaid-theme="a2">
      {svg && !error ? <div className="g-mermaid-out mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {!svg && !error ? <span className="mermaid-loading">正在绘制图表…</span> : null}
      {error ? (
        <pre className="code mermaid-src">
          <code>{source}</code>
        </pre>
      ) : null}
    </figure>
  );
}
