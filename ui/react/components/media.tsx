"use client";

import { useEffect, useId, useRef, useState } from "react";
import { asNumber, asString, expandChildren, propValue, registerComponents, RenderNodes, useRuntime } from "../runtime";
import type { Env, UiNode } from "../types";
import { codeLanguageLabel } from "../../garden/code-language.mjs";

function Image({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const src = asString(propValue(runtime, node, "src", env));
  const alt = asString(propValue(runtime, node, "alt", env));
  const ratio = asString(propValue(runtime, node, "ratio", env));
  const hotspots = expandChildren(runtime, node.c, env).filter((item) => item.node.n === "Hotspot");
  const [selected, setSelected] = useState<number | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const ratioMatch = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/u.exec(ratio);
  const current = selected !== null ? hotspots[selected] : null;
  return (
    <div className="garden-ui-image">
      <div className="garden-ui-image-stage" style={ratioMatch ? { aspectRatio: `${ratioMatch[1]} / ${ratioMatch[2]}` } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
        {hotspots.map((item, index) => {
          const x = Math.max(0, Math.min(1, asNumber(propValue(runtime, item.node, "x", item.env)) ?? 0));
          const y = Math.max(0, Math.min(1, asNumber(propValue(runtime, item.node, "y", item.env)) ?? 0));
          return (
            <button
              key={index}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              className="garden-ui-hotspot"
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              aria-pressed={selected === index}
              aria-label={`${index + 1}. ${asString(propValue(runtime, item.node, "title", item.env))}`}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const next = (index + (event.key === "ArrowRight" ? 1 : -1) + hotspots.length) % hotspots.length;
                setSelected(next);
                refs.current[next]?.focus();
              }}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="garden-ui-note" aria-live="polite">
        {current ? (
          <>
            <strong>{`${(selected ?? 0) + 1}. ${asString(propValue(runtime, current.node, "title", current.env))}`}</strong>
            <RenderNodes nodes={current.node.c} env={current.env} />
          </>
        ) : (
          <p>点图上的序号看说明。</p>
        )}
      </div>
    </div>
  );
}

function parseHighlight(value: unknown) {
  const lines = new Set<number>();
  for (const part of String(value ?? "").split(",")) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/u.exec(part);
    if (!match) continue;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    for (let line = start; line <= end && line - start < 200; line += 1) lines.add(line);
  }
  return lines;
}

function Code({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const lang = asString(propValue(runtime, node, "lang", env));
  const code = asString(propValue(runtime, node, "code", env)).replace(/^\n/u, "");
  const highlight = parseHighlight(propValue(runtime, node, "highlight", env));
  return (
    <pre className="garden-ui-code" data-language={codeLanguageLabel(lang) || undefined}>
      <code>
        {code.split("\n").map((line, index) => (
          <span key={index} className="garden-ui-code-line" data-highlight={highlight.has(index + 1) ? "true" : undefined}>
            <span className="garden-ui-code-number" aria-hidden="true">{index + 1}</span>
            {line || " "}
            {"\n"}
          </span>
        ))}
      </code>
    </pre>
  );
}

let mermaidQueue: Promise<unknown> = Promise.resolve();

const MERMAID_FONT = 'ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, "PingFang SC", sans-serif';
const MERMAID_THEMES = {
  light: { background: "#FAF9F5", primaryColor: "#FFFFFF", primaryBorderColor: "#D6D2C9", primaryTextColor: "#1B1A18", lineColor: "#6E6B64", secondaryColor: "#F0EEE6", tertiaryColor: "#F0EEE6", fontSize: "14px" },
  dark: { background: "#1F1E1D", primaryColor: "#262624", primaryBorderColor: "#45423C", primaryTextColor: "#EEECE7", lineColor: "#A09B91", secondaryColor: "#30302E", tertiaryColor: "#30302E", fontSize: "14px" },
};

function renderMermaid(source: string, id: string, dark: boolean) {
  const task = mermaidQueue.then(async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: { ...MERMAID_THEMES[dark ? "dark" : "light"], fontFamily: MERMAID_FONT, fontSize: "14px" },
      fontFamily: MERMAID_FONT,
      flowchart: { htmlLabels: true, padding: 16 },
      securityLevel: "strict",
      suppressErrorRendering: true,
    });
    return mermaid.render(id, source);
  });
  mermaidQueue = task.then(() => undefined, () => undefined);
  return task;
}

function Diagram({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const source = asString(propValue(runtime, node, "mermaid", env)).trim();
  const highlightValue = propValue(runtime, node, "highlight", env);
  const edgesValue = propValue(runtime, node, "edges", env);
  const highlight = (Array.isArray(highlightValue) ? highlightValue : []).map(String);
  const edges = (Array.isArray(edgesValue) ? edgesValue : []).map(String);
  const reactId = useId().replaceAll(":", "");
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const dark = canvasRef.current?.closest("[data-theme]")?.getAttribute("data-theme") === "dark";
    renderMermaid(source, `garden-ui-mermaid-${reactId}`, dark).then(
      (result) => {
        if (!active) return;
        setSvg((result as { svg: string }).svg);
        setFailed(false);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [source, reactId]);

  const highlightKey = highlight.join("|");
  const edgesKey = edges.join("|");
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.querySelectorAll(".garden-ui-diagram-on").forEach((element) => element.classList.remove("garden-ui-diagram-on"));
    const clean = (value: string) => value.replace(/[^\w-]/gu, "");
    for (const id of highlightKey.split("|").map(clean).filter(Boolean)) {
      canvas.querySelectorAll(`[id*="-${id}-"], [id$="-${id}"], [data-id="${id}"]`).forEach((element) => {
        (element.closest(".node, .statediagram-state") ?? element).classList.add("garden-ui-diagram-on");
      });
    }
    for (const edge of edgesKey.split("|").filter(Boolean)) {
      const [from, to] = edge.split("->").map((part) => clean(part.trim()));
      if (!from || !to) continue;
      canvas
        .querySelectorAll(`[id*="L-${from}-${to}"], [id*="L_${from}_${to}"], [data-id*="${from}_${to}"]`)
        .forEach((element) => element.classList.add("garden-ui-diagram-on"));
    }
  }, [svg, highlightKey, edgesKey]);

  return (
    <div className="garden-ui-diagram">
      {failed ? <p className="garden-ui-error-inline">图没能画出来（语法有误，或这里没有 Mermaid）。下面是源码。</p> : null}
      {failed ? <pre className="garden-ui-code"><code>{source}</code></pre> : null}
      {!svg && !failed ? <p className="garden-ui-note">正在绘制图…</p> : null}
      <div ref={canvasRef} className="garden-ui-diagram-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
      {highlight.length ? <p className="garden-ui-sr-only" aria-live="polite">{`当前高亮：${highlight.join("、")}`}</p> : null}
    </div>
  );
}

registerComponents({ Image, Code, Diagram });
