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
        primaryColor: token("--paper"),
        primaryBorderColor: token("--ink"),
        primaryTextColor: token("--ink"),
        textColor: token("--ink"),
        lineColor: token("--ink"),
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
      setSvg("");
      try {
        const id = `mermaid-${reactId.replaceAll(":", "")}-${theme}`;
        const result = await renderMermaid(source, id);
        if (active) setSvg(result.svg);
      } catch {
        if (active) setSvg("");
      }
    };
    void draw();
    return () => {
      active = false;
    };
  }, [reactId, source, theme]);

  return (
    <figure
      className={`g-mermaid mermaid-block language-mermaid${svg ? " ok" : ""}`}
      data-g="mermaid"
      data-mermaid-theme="a2"
    >
      {svg ? <div className="g-mermaid-out mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      <pre className="code mermaid-src">
        <code>{source}</code>
      </pre>
    </figure>
  );
}
