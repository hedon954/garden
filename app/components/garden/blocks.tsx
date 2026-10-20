"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { interactiveUiSource } from "../../../ui/core/garden-fence.mjs";
import { markdownPlugins } from "../../lib/markdown-plugins";
import { compileUiBlock } from "../../../ui/core/compile.mjs";
import { splitCompareLine } from "../../../ui/garden/compare-line.mjs";
import { UiErrorCard, UiFigure, type Diagnostic, type UiPayload } from "../../../ui/react";
import { FullscreenFrame, SandboxFrame } from "./chrome";

function Rich({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={markdownPlugins} components={{ p: ({ children }) => <>{children}</> }}>
      {String(text ?? "")}
    </ReactMarkdown>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return "";
  }
}

function SourceChip({ source }: { source: unknown }) {
  const list = (Array.isArray(source) ? source : source ? [source] : []).map((item) => {
    if (typeof item === "string") return { url: item, site: hostOf(item) };
    if (item && typeof item === "object" && "url" in item) {
      const url = String((item as { url?: unknown }).url ?? "");
      const site = String((item as { site?: unknown }).site ?? hostOf(url));
      return { url, site };
    }
    return null;
  }).filter((item): item is { url: string; site: string } => Boolean(item?.url));
  if (!list.length) return null;
  return (
    <span className="g-srcs">
      <a className="g-src ext" href={list[0].url} target="_blank" rel="noopener noreferrer">
        <span className="g-src-ic" aria-hidden="true">{[...list[0].site][0] || "·"}</span>
        <span>{list[0].site}</span>
      </a>
      {list.length > 1 ? <span className="g-src-more">+{list.length - 1}</span> : null}
    </span>
  );
}

function itemsOf(props: Record<string, unknown>) {
  return Array.isArray(props.items) ? props.items as Record<string, unknown>[] : [];
}

export function GardenCard({ props }: { props: Record<string, unknown> }) {
  const url = typeof props.url === "string" ? props.url : "";
  const title = String(props.title ?? url);
  const description = typeof props.description === "string" ? props.description : typeof props.text === "string" ? props.text : "";
  const points = Array.isArray(props.points) ? props.points : Array.isArray(props.items) ? props.items : [];
  return (
    <article className="g-entity">
      {typeof props.image === "string" ? (
        <div className="g-entity-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.image} alt={String(props.alt ?? title)} />
        </div>
      ) : null}
      <div className="g-entity-b">
        <h4 className="g-entity-t">{url ? <a className="ext" href={url} target="_blank" rel="noopener noreferrer"><Rich text={title} /></a> : <Rich text={title} />}</h4>
        {typeof props.meta === "string" ? <p className="g-entity-m"><Rich text={props.meta} /></p> : null}
        {description ? <p><Rich text={description} /> <SourceChip source={props.source} /></p> : null}
      </div>
      {points.length ? (
        <ol className="g-entity-list">
          {points.map((point, index) => {
            const item = typeof point === "string" ? { title: point } : point as Record<string, unknown>;
            return (
              <li key={index}>
                <p className="g-entity-lt"><Rich text={String(item.title ?? "")} /></p>
                {typeof item.text === "string" ? <p><Rich text={item.text} /></p> : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </article>
  );
}

export function GardenStat({ props }: { props: Record<string, unknown> }) {
  const items = itemsOf(props).length ? itemsOf(props) : [props];
  const rich = items.some((item) => item.caption || item.source || item.text);
  return (
    <div className={`g-stats${rich ? " g-stats-rich" : ""}`}>
      {items.map((item, index) => (
        <div className="g-stat" key={index}>
          {item.label ? <div className="g-stat-l"><Rich text={String(item.label)} /></div> : null}
          <div className="g-stat-n">
            {String(item.value ?? "")}
            {item.unit ? <small>{String(item.unit)}</small> : null}
          </div>
          {item.caption ? <div className="g-stat-c"><Rich text={String(item.caption)} /></div> : null}
          {item.text || item.source ? <p className="g-stat-t">{item.text ? <Rich text={String(item.text)} /> : null} <SourceChip source={item.source} /></p> : null}
        </div>
      ))}
    </div>
  );
}

function CompareLine({ line }: { line: string }) {
  const split = splitCompareLine(line);
  if (!split) return <p><Rich text={line} /></p>;
  return (
    <p className="g-cmp-line">
      <span className="g-cmp-h"><span className="g-cmp-t"><Rich text={split.title} /></span><span className="g-cmp-sep">{split.separator}</span></span>
      <Rich text={split.text} />
    </p>
  );
}

export function GardenCompare({ props }: { props: Record<string, unknown> }) {
  const items = Array.isArray(props.items) ? props.items as unknown[] : [];
  return (
    <div className="g-compare" role="group">
      {items.map((entry, index) => {
        if (typeof entry === "string" || typeof entry === "number") {
          return <section className="g-cmp" key={index}><CompareLine line={String(entry)} /></section>;
        }
        if (!entry || typeof entry !== "object") return null;
        const { title, text, ...rest } = entry as Record<string, unknown>;
        const texts = text == null ? [] : Array.isArray(text) ? text : [text];
        return (
          <section className="g-cmp" key={index}>
            {title ? <h4><Rich text={String(title)} /></h4> : null}
            {texts.map((paragraph, paragraphIndex) => <p key={paragraphIndex}><Rich text={String(paragraph)} /></p>)}
            {Object.keys(rest).length ? (
              <dl>
                {Object.entries(rest).map(([key, value]) => (
                  <span key={key}>
                    <dt><Rich text={key} /></dt>
                    <dd><Rich text={String(value)} /></dd>
                  </span>
                ))}
              </dl>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function GardenTimeline({ props }: { props: Record<string, unknown> }) {
  return (
    <figure className="g-timeline">
      {typeof props.title === "string" ? <p className="g-timeline-h"><Rich text={props.title} /></p> : null}
      <ol>
        {itemsOf(props).map((item, index) => (
          <li key={index}>
            {item.date ? <p className="g-tl-d"><Rich text={String(item.date)} /></p> : null}
            <p className="g-tl-t"><Rich text={String(item.title ?? "")} /></p>
            {item.text ? <p className="g-tl-x"><Rich text={String(item.text)} /> <SourceChip source={item.source} /></p> : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}

function chartRows(props: Record<string, unknown>) {
  if (Array.isArray(props.data) && props.data.every((row) => row && typeof row === "object" && "x" in (row as object))) {
    return (props.data as { x: unknown; y: unknown; label?: unknown }[]).map((row) => ({
      x: String(row.x),
      y: Number(row.y) || 0,
      label: String(row.label ?? `${row.y}${props.unit ? ` ${props.unit}` : ""}`),
    }));
  }
  const series = Array.isArray(props.series) ? props.series[0] as { data?: unknown[]; name?: string } : null;
  const values = Array.isArray(series?.data) ? series.data : Array.isArray(props.data) ? props.data : [];
  const labels = Array.isArray(props.x) ? props.x.map(String) : null;
  return values.map((value, index) => ({
    x: labels?.[index] ?? String(index + 1),
    y: Number(value) || 0,
    label: `${value}${props.unit ? ` ${props.unit}` : ""}`,
  }));
}

export function GardenChart({ props }: { props: Record<string, unknown> }) {
  const rows = chartRows(props);
  const max = Math.max(...rows.map((row) => row.y), 1);
  const title = String(props.title ?? "图表");
  return (
    <figure className="g-chart" role="group" aria-label={title}>
      {props.title ? <p className="g-chart-t">{title}</p> : null}
      <div className="g-bars" aria-hidden="true">
        {rows.map((row) => (
          <div className="g-bar" key={row.x}>
            <span className="g-bar-k">{row.x}</span>
            <span className="g-bar-track"><span className="g-bar-fill" style={{ width: `${(row.y / max) * 100}%` }} /></span>
            <span className="g-bar-v">{row.label}</span>
          </div>
        ))}
      </div>
      <details className="g-chart-data">
        <summary>查看数据表</summary>
        <table>
          <thead><tr><th>{String(props.xLabel ?? (typeof props.x === "string" ? props.x : "项目"))}</th><th>{String(props.yLabel ?? "数值")}</th></tr></thead>
          <tbody>
            {rows.map((row) => <tr key={row.x}><td>{row.x}</td><td>{row.label}</td></tr>)}
          </tbody>
        </table>
      </details>
      {typeof props.caption === "string" ? <figcaption><Rich text={props.caption} /></figcaption> : null}
    </figure>
  );
}

type Part = { id: string; label: string; text: string };

function partsOf(props: Record<string, unknown>): Part[] {
  if (!Array.isArray(props.parts)) return [];
  return props.parts.map((part, index) => {
    const item = part as Record<string, unknown>;
    const label = String(item.label ?? item.name ?? `部分 ${index + 1}`);
    return { id: String(item.id ?? item.name ?? label), label, text: String(item.text ?? "") };
  });
}

function partOn(selected: string, token: string) {
  if (selected === "all" || selected === "全部") return true;
  const parts = token.trim().split(/\s+/u).filter(Boolean);
  const has = (id: string) => parts.includes(id);
  const starts = (prefix: string) => parts.some((part) => part === prefix || part.startsWith(prefix));
  if (has(selected)) return true;
  if (selected === "q") return has("attn");
  if (selected === "k") return starts("k") || has("attn");
  if (selected === "v") return starts("v") || has("out");
  if (selected === "cache") return has("cache") || has("kn") || has("vn") || starts("k") || starts("v");
  if (selected === "out") return has("out");
  return false;
}

export function GardenFigure({ props, children }: { props: Record<string, unknown>; children?: string }) {
  const parts = partsOf(props);
  const [selected, setSelected] = useState(parts[0]?.id ?? "all");
  const svgRef = useRef<HTMLDivElement>(null);
  const base = useId();
  const fromChild = typeof children === "string" && children.includes("<svg") ? children : "";
  const svg = typeof props.svg === "string" && props.svg.includes("<svg") ? props.svg : fromChild;

  useEffect(() => {
    const root = svgRef.current;
    const drawing = root?.querySelector("svg");
    if (!drawing) return;
    const shapes = [...drawing.querySelectorAll<SVGGraphicsElement>("rect[data-p], ellipse[data-p], circle[data-p]")];
    drawing.querySelectorAll("text").forEach((text) => {
      const x = Number(text.getAttribute("x"));
      const y = Number(text.getAttribute("y"));
      const shape = shapes.find((item) => {
        const box = item.getBBox();
        return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height + 2;
      });
      if (!shape) return;
      if (!text.hasAttribute("data-p")) text.setAttribute("data-p", shape.getAttribute("data-p") || "");
      try {
        const room = shape.getBBox().width - 12;
        const width = text.getComputedTextLength();
        if (width > room && room > 0) {
          const size = Number.parseFloat(getComputedStyle(text).fontSize);
          text.style.fontSize = `${(size * room / width).toFixed(2)}px`;
        }
      } catch {
        /* getBBox can fail before layout */
      }
    });
  }, [svg]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    root.querySelectorAll("[data-p]").forEach((element) => {
      const token = ` ${element.getAttribute("data-p") || ""} `;
      element.classList.toggle("on", partOn(selected, token));
    });
  }, [selected, svg]);

  const body = (
    <figure className="g-explore" data-g="explore" data-sel={selected} ref={svgRef}>
      {parts.length ? (
        <div role="tablist" aria-label="选择一个部分">
          {parts.map((part, index) => (
            <button
              key={part.id}
              type="button"
              role="tab"
              aria-selected={selected === part.id}
              tabIndex={selected === part.id ? 0 : -1}
              data-sel={part.id}
              onClick={() => setSelected(part.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const next = event.key === "ArrowRight" ? (index + 1) % parts.length : (index - 1 + parts.length) % parts.length;
                setSelected(parts[next].id);
              }}
            >
              {part.label}
            </button>
          ))}
        </div>
      ) : null}
      {svg ? <div className="dx-wrap" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {typeof props.image === "string" ? (
        <div className="fig-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.image} alt={String(props.alt ?? props.caption ?? "")} />
        </div>
      ) : null}
      {typeof props.mermaid === "string" ? <pre className="code"><code>{props.mermaid}</code></pre> : null}
      <div className="dx-exp" aria-live="polite">
        {parts.map((part) => (
          <p key={part.id} id={`${base}-${part.id}`} hidden={selected !== part.id}><Rich text={part.text} /></p>
        ))}
      </div>
      {typeof props.caption === "string" ? <figcaption><Rich text={props.caption} /></figcaption> : null}
    </figure>
  );
  return parts.length || svg ? <FullscreenFrame label="结构图">{body}</FullscreenFrame> : body;
}

function htmlHasScript(source: string) {
  return /<script\b(?![^>]*\btype\s*=\s*["']application\/json["'])/iu.test(source);
}

function isLightWidget(source: string) {
  return /data-g="(?:quiz|calc|tabs|stepper|kvplay)"|class="[^"]*\b(?:g-steps|g-faq|g-quiz|g-tabs|g-play|g-calc)\b/iu.test(source);
}

function bindGardenWidgets(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-g=tabs]").forEach((widget) => {
    const list = widget.querySelector<HTMLElement>(":scope > [role=tablist]");
    const tabs = [...(list?.querySelectorAll<HTMLElement>(":scope > [role=tab]") ?? [])];
    const select = (index: number, focus = false) => {
      tabs.forEach((tab, tabIndex) => {
        const on = index === tabIndex;
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute("aria-controls") || "");
        if (panel) panel.hidden = !on;
      });
      if (focus) tabs[index]?.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(index));
      tab.addEventListener("keydown", (event) => {
        const count = tabs.length;
        const next = event.key === "ArrowRight" ? (index + 1) % count
          : event.key === "ArrowLeft" ? (index - 1 + count) % count
            : event.key === "Home" ? 0
              : event.key === "End" ? count - 1 : -1;
        if (next < 0) return;
        event.preventDefault();
        select(next, true);
      });
    });
  });

  root.querySelectorAll<HTMLFormElement>("[data-g=quiz]").forEach((form) => {
    const out = form.querySelector<HTMLElement>(".g-quiz-out");
    const explain = form.querySelector<HTMLElement>(".g-quiz-ex");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!out) return;
      const chosen = form.querySelector<HTMLInputElement>("input:checked");
      if (!chosen) {
        out.className = "g-quiz-out";
        out.textContent = "先选一个答案。";
        return;
      }
      const correct = chosen.value === form.dataset.answer;
      out.className = `g-quiz-out ${correct ? "ok" : "no"}`;
      out.textContent = correct ? "✓ 答对了" : "✗ 再想想";
      if (explain) explain.hidden = !correct;
    });
  });

  root.querySelectorAll<HTMLElement>("[data-g=stepper]").forEach((stepper) => {
    const panels = [...stepper.querySelectorAll<HTMLElement>("[data-step]")];
    const dots = [...stepper.querySelectorAll<HTMLElement>(".g-stepper-dots i")];
    const count = stepper.querySelector(".g-stepper-n");
    const title = stepper.querySelector(".g-stepper-t");
    const prev = stepper.querySelector<HTMLButtonElement>("[data-prev]");
    const next = stepper.querySelector<HTMLButtonElement>("[data-next]");
    let index = 0;
    const show = () => {
      panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
      if (count) count.textContent = `${index + 1} / ${panels.length}`;
      if (title) title.textContent = panels[index]?.dataset.title || "";
      dots.forEach((dot, dotIndex) => dot.classList.toggle("on", dotIndex <= index));
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === panels.length - 1;
    };
    prev?.addEventListener("click", () => { if (index > 0) { index -= 1; show(); } });
    next?.addEventListener("click", () => { if (index < panels.length - 1) { index += 1; show(); } });
    show();
  });

  root.querySelectorAll<HTMLElement>("[data-g=calc]").forEach((calc) => {
    const raw = calc.querySelector("script[type='application/json'], script[type=\"application/json\"]")?.textContent;
    if (!raw) return;
    const spec = JSON.parse(raw) as {
      formula: string;
      vars: Record<string, { fixed?: number; values?: number[]; label?: string }>;
      format?: string;
      unit?: string;
      show?: string;
    };
    const names = Object.keys(spec.vars);
    const fn = new Function(...names, `return (${spec.formula})`) as (...args: number[]) => number;
    const read = (key: string) => {
      const variable = spec.vars[key];
      if (variable?.fixed !== undefined) return Number(variable.fixed);
      const field = calc.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-k="${key}"]:checked`)
        ?? calc.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-k="${key}"]`);
      if (!field) return 0;
      if (variable?.values && field instanceof HTMLInputElement && field.type === "range") {
        const value = variable.values[Number(field.value)] ?? variable.values[0];
        const output = field.parentElement?.querySelector("output");
        if (output) output.textContent = String(value);
        field.setAttribute("aria-valuetext", String(value));
        return Number(value);
      }
      const value = Number(field.value);
      const output = field.parentElement?.querySelector("output");
      if (output && field instanceof HTMLInputElement && field.type === "range") output.textContent = field.value;
      return value;
    };
    const run = () => {
      const values = Object.fromEntries(names.map((key) => [key, read(key)]));
      const result = fn(...names.map((key) => values[key]));
      const out = calc.querySelector("[data-out]");
      if (out) {
        out.textContent = spec.format === "GB"
          ? `${(result / 2 ** 30).toFixed(2)} GB`
          : `${Math.round(result * 1e4) / 1e4}${spec.unit ? ` ${spec.unit}` : ""}`;
      }
      const equation = calc.querySelector("[data-calc]");
      if (equation && spec.show) {
        const shown = spec.show.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));
        equation.textContent = `${shown} = ${spec.format === "GB" ? `${Math.round(result).toLocaleString("en-US")} 字节` : String(Math.round(result * 1e4) / 1e4)}`;
      }
    };
    calc.addEventListener("input", run);
    calc.addEventListener("change", run);
    run();
  });
}

function StaticGardenHtml({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = code;
  }, [code]);
  return (
    <div
      className="g-html"
      ref={ref}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: `<template shadowrootmode="open">${code}</template>` }}
    />
  );
}

function LightGardenHtml({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (host) bindGardenWidgets(host);
  }, [code]);
  return <div className="g-widget" ref={ref} dangerouslySetInnerHTML={{ __html: code }} />;
}

export function GardenHtml({ props, children }: { props: Record<string, unknown>; children?: string }) {
  const code = typeof props.code === "string" ? props.code : children || "";
  const title = String(props.title ?? "HTML");
  if (!code && typeof props.src === "string") {
    return <p className="g-embed-note">HTML 在 {props.src}。发布时由同名目录读入。</p>;
  }
  if (htmlHasScript(code)) {
    return <SandboxFrame html={code} title={title} />;
  }
  if (isLightWidget(code)) {
    const view = <LightGardenHtml code={code} />;
    return /class="[^"]*\bg-play\b|data-g="calc"/iu.test(code) ? <FullscreenFrame label={title}>{view}</FullscreenFrame> : view;
  }
  return <FullscreenFrame label={title}><StaticGardenHtml code={code} /></FullscreenFrame>;
}

export function GardenInteractive({ block }: { block: { id?: string | null; props: Record<string, unknown>; children?: string } }) {
  // Same source `garden ui check` validates (ui/core/garden-fence.mjs).
  const { source, header } = interactiveUiSource({ id: block.id ?? null, props: block.props, children: block.children ?? "" });
  const { payload, check } = compileUiBlock(source);
  if (!payload) {
    return (
      <UiErrorCard
        id={String(header.id)}
        caption={String(header.caption)}
        diagnostics={(check.diagnostics ?? []) as Diagnostic[]}
      />
    );
  }
  return (
    <FullscreenFrame label={String(header.caption || "交互")}>
      <div className="g-play">
        <UiFigure payload={payload as UiPayload} />
      </div>
    </FullscreenFrame>
  );
}

export function GardenIdea({ text }: { text: string }) {
  return (
    <aside className="g-idea">
      <p className="g-example-label">想法 · 发布前编译</p>
      <p>{text}</p>
    </aside>
  );
}

export function GardenLegacy({ suggestion }: { suggestion: string }) {
  return <p className="g-embed-note">{suggestion}</p>;
}

export function GardenUnknown({ name }: { name: string }) {
  return <p className="g-embed-note">未知 Garden 块：{name}</p>;
}

export function GardenMessage({ children }: { children: ReactNode }) {
  return <p className="g-embed-note">{children}</p>;
}
