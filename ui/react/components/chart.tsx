"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TONES } from "../../core/catalog.mjs";
import { formatValue } from "../../core/format.mjs";
import { isPowerOfTwo, lookupFrom, sampleDomain } from "../../core/state.mjs";
import { asNumber, asString, evalExpr, expandChildren, propValue, registerComponents, rowValue, useRuntime } from "../runtime";
import type { Env, Lookup, UiNode } from "../types";

const SERIES = new Set(["Line", "Area", "Bar", "Point"]);
const DEFAULT_TONES = ["accent", "muted", "new", "same"];
const MARGIN = { top: 14, right: 16, bottom: 30, left: 60 };

type Scale = { map: (value: number) => number; ticks: number[] };

function niceTicks(min: number, max: number, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const rough = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const ratio = rough / magnitude;
  const step = (ratio >= 7.5 ? 10 : ratio >= 3.5 ? 5 : ratio >= 1.5 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Math.abs(value) < step * 1e-9 ? 0 : Number(value.toPrecision(12)));
  }
  return ticks;
}

/** Ticks that read well in the axis format: nice numbers inside the chosen binary unit for bytes. */
function formatTicks(min: number, max: number, count: number, format?: string) {
  if (format !== "bytes" || max <= 0) return niceTicks(min, max, count);
  let unit = 1;
  while (max / unit >= 1024 && unit < 1024 ** 5) unit *= 1024;
  return niceTicks(min / unit, max / unit, count).map((tick) => tick * unit);
}

function logTicks(min: number, max: number) {
  const tens: number[] = [];
  for (let exponent = Math.ceil(Math.log10(min)); 10 ** exponent <= max * (1 + 1e-9); exponent += 1) tens.push(10 ** exponent);
  if (tens.length >= 3) return tens;
  const twos: number[] = [];
  for (let exponent = Math.ceil(Math.log2(min)); 2 ** exponent <= max * (1 + 1e-9); exponent += 1) twos.push(2 ** exponent);
  return twos.length > 7 ? twos.filter((_, index) => index % Math.ceil(twos.length / 6) === 0) : twos;
}

// Advance of one character at the 11px monospace tick size; CJK characters take two.
const TICK_CHAR_WIDTH = 6.8;
const TICK_GAP = 6;
type Anchor = "start" | "middle" | "end";

const labelWidth = (text: string) => [...text].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 0x2e80 ? 2 : 1), 0) * TICK_CHAR_WIDTH;

/** Every k-th tick, for the smallest k whose labels no longer overlap at this width. */
function fitTicks(ticks: number[], position: (tick: number) => number, label: (tick: number) => string, anchor: (x: number) => Anchor) {
  const extent = (tick: number) => {
    const x = position(tick);
    const width = labelWidth(label(tick));
    const side = anchor(x);
    return side === "start" ? [x, x + width] : side === "end" ? [x - width, x] : [x - width / 2, x + width / 2];
  };
  for (let stride = 1; stride < ticks.length; stride += 1) {
    const kept = ticks.filter((_, index) => index % stride === 0);
    if (kept.every((tick, index) => index === 0 || extent(kept[index - 1])[1] + TICK_GAP <= extent(tick)[0])) return kept;
  }
  return ticks.slice(0, 1);
}

function makeScale(min: number, max: number, from: number, to: number, kind: "linear" | "log"): Scale {
  if (kind === "log" && min > 0 && max > min) {
    const low = Math.log(min);
    const high = Math.log(max);
    return { map: (value) => from + ((Math.log(value) - low) / (high - low)) * (to - from), ticks: logTicks(min, max) };
  }
  const span = max - min || 1;
  return { map: (value) => from + ((value - min) / span) * (to - from), ticks: niceTicks(min, max, 5) };
}

type Model = {
  categorical: boolean;
  xs: number[];
  categories: string[];
  series: Array<{ kind: string; label: string; tone: string; format?: string; ys: number[] }>;
  marker: number | null;
  xScaleKind: "linear" | "log";
  xFormat?: string;
};

function Chart({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const baseId = useId().replaceAll(":", "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Draw in once, the first time the chart scrolls into view.
  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setDrawn(true);
      observer.disconnect();
    }, { threshold: 0.3 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const value = (name: string) => propValue(runtime, node, name, env);
  const baseHeight = Math.max(120, Math.min(480, asNumber(value("height")) ?? 200));
  const height = width < 480 ? Math.max(140, Math.round(baseHeight * 0.8)) : baseHeight;
  const seriesNodes = expandChildren(runtime, node.c, env).filter((item) => SERIES.has(item.node.n ?? ""));

  const model = ((): Model | null => {
    const describe = (item: { node: UiNode; env: Env }, index: number) => ({
      kind: item.node.n ?? "Line",
      label: asString(propValue(runtime, item.node, "label", item.env), `系列 ${index + 1}`),
      tone: (() => {
        const tone = propValue(runtime, item.node, "tone", item.env);
        return typeof tone === "string" && (TONES as string[]).includes(tone) ? tone : DEFAULT_TONES[index % DEFAULT_TONES.length];
      })(),
      format: (propValue(runtime, item.node, "format", item.env) as string | undefined) ?? (value("yFormat") as string | undefined),
    });
    if (node.p?.data) {
      const rows = value("data");
      const list = Array.isArray(rows) ? rows.slice(0, 2000) : [];
      const xValues = list.map((row) => rowValue(runtime, node.p?.x, row, env));
      const categorical = seriesNodes.some((item) => item.node.n === "Bar") || xValues.some((x) => typeof x !== "number");
      const order = list.map((_, index) => index);
      if (!categorical) order.sort((a, b) => (xValues[a] as number) - (xValues[b] as number));
      return {
        categorical,
        xs: categorical ? order.map((_, index) => index) : order.map((index) => xValues[index] as number),
        categories: order.map((index) => formatValue(xValues[index], value("xFormat") as string | undefined)),
        series: seriesNodes.map((item, index) => ({
          ...describe(item, index),
          ys: order.map((rowIndex) => {
            const y = rowValue(runtime, item.node.p?.y, list[rowIndex], item.env);
            return typeof y === "number" ? y : Number.NaN;
          }),
        })),
        marker: null,
        xScaleKind: "linear",
        xFormat: value("xFormat") as string | undefined,
      };
    }
    const sweep = value("sweep");
    if (typeof sweep !== "string") return null;
    const slider = runtime.sliders.get(sweep);
    const sliderValue = (name: string) => (slider ? propValue(runtime, slider, name, { locals: [] }) : undefined);
    const from = asNumber(value("from")) ?? asNumber(sliderValue("min"));
    const to = asNumber(value("to")) ?? asNumber(sliderValue("max"));
    if (from === undefined || to === undefined || from >= to) return null;
    const scaleValue = value("scale") ?? sliderValue("scale");
    const scale = scaleValue === "log" && from > 0 ? "log" : "linear";
    const snap = sliderValue("snap") ?? (scale === "log" && isPowerOfTwo(from) && isPowerOfTwo(to) ? "pow2" : "none");
    const xs = sampleDomain({
      from,
      to,
      scale,
      samples: asNumber(value("samples")) ?? 64,
      pow2: snap === "pow2",
    }) as number[];
    return {
      categorical: false,
      xs,
      categories: [],
      series: seriesNodes.map((item, index) => ({
        ...describe(item, index),
        ys: xs.map((x) => {
          const scope = runtime.scopeFor({ ...runtime.state, [sweep]: x });
          const y = item.node.p?.y;
          const result = y?.k === "expr" ? evalExpr(y.e, lookupFrom(...item.env.locals, scope) as Lookup) : y?.v;
          return typeof result === "number" ? result : Number.NaN;
        }),
      })),
      marker: asNumber(runtime.state[sweep]) ?? null,
      xScaleKind: scale,
      xFormat: (value("xFormat") as string | undefined) ?? (sliderValue("format") as string | undefined),
    };
  })();

  if (!model || !model.series.length) return <p className="garden-ui-error-inline">图表缺少有效的范围或数据</p>;

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;
  const finite = model.series.flatMap((series) => series.ys.filter((y) => Number.isFinite(y)));
  const yScaleKind = value("yScale") === "log" ? "log" : "linear";
  const hasFill = model.series.some((series) => series.kind === "Bar" || series.kind === "Area");
  let yMin = asNumber(value("yMin")) ?? (yScaleKind === "log" ? Math.min(...finite.filter((y) => y > 0)) : Math.min(hasFill ? 0 : Infinity, ...finite, 0));
  const yMax = asNumber(value("yMax")) ?? Math.max(...finite, yMin + 1);
  if (!Number.isFinite(yMin)) yMin = 0;
  const y = makeScale(yMin, yMax, MARGIN.top + innerHeight, MARGIN.top, yScaleKind);
  const yFormatForTicks = (value("yFormat") as string | undefined) ?? model.series[0]?.format;
  const yTicks = yScaleKind === "linear" ? formatTicks(yMin, yMax, 4, yFormatForTicks) : y.ticks;

  const categoryCount = model.categories.length || 1;
  const band = innerWidth / categoryCount;
  const x = model.categorical
    ? { map: (index: number) => MARGIN.left + band * index + band / 2, ticks: model.xs }
    : makeScale(model.xs[0], model.xs[model.xs.length - 1], MARGIN.left, MARGIN.left + innerWidth, model.xScaleKind);
  const anchorAt = (px: number): Anchor => (px > MARGIN.left + innerWidth - 24 ? "end" : px < MARGIN.left + 24 ? "start" : "middle");
  const xTickLabel = (tick: number) => (model.categorical ? String(model.categories[tick] ?? "") : formatValue(tick, model.xFormat));
  const xTicks = fitTicks(
    model.categorical
      ? model.xs
      : model.xScaleKind === "log" ? x.ticks : formatTicks(model.xs[0], model.xs[model.xs.length - 1], 5, model.xFormat),
    x.map,
    xTickLabel,
    anchorAt,
  );

  const yFormat = (value("yFormat") as string | undefined) ?? model.series[0]?.format;
  const xLabel = (index: number) => (model.categorical ? model.categories[index] : formatValue(model.xs[index], model.xFormat));
  const path = (ys: number[]) => {
    let d = "";
    let penDown = false;
    ys.forEach((value, index) => {
      if (!Number.isFinite(value) || (yScaleKind === "log" && value <= 0)) {
        penDown = false;
        return;
      }
      d += `${penDown ? "L" : "M"}${x.map(model.xs[index]).toFixed(1)},${y.map(value).toFixed(1)}`;
      penDown = true;
    });
    return d;
  };
  const barSeries = model.series.filter((series) => series.kind === "Bar");
  const barWidth = Math.max(2, (band - 8) / Math.max(1, barSeries.length) - 2);

  const nearest = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    model.xs.forEach((xValue, index) => {
      if (Math.abs(x.map(xValue) - px) < Math.abs(x.map(model.xs[best]) - px)) best = index;
    });
    return best;
  };
  const markerX = model.marker !== null ? x.map(model.marker) : null;
  const markerIndex = model.marker !== null ? model.xs.reduce((best, xValue, index) => (Math.abs(xValue - (model.marker as number)) < Math.abs(model.xs[best] - (model.marker as number)) ? index : best), 0) : null;
  const tooltipIndex = hover;

  return (
    <div className="garden-ui-chart">
      {model.series.length > 1 ? (
        <ul className="garden-ui-legend">
          {model.series.map((series, index) => (
            <li key={index}><span className={`garden-ui-swatch garden-ui-series-${series.tone}`} />{series.label}</li>
          ))}
        </ul>
      ) : null}
      <div
        ref={wrapRef}
        className="garden-ui-chart-canvas"
        tabIndex={0}
        role="group"
        aria-label={`${asString(value("yLabel"), "图表")}，左右方向键查看各点`}
        aria-describedby={`${baseId}-table`}
        onPointerMove={(event) => setHover(nearest(event.clientX))}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const start = hover ?? markerIndex ?? 0;
          setHover(Math.max(0, Math.min(model.xs.length - 1, start + (event.key === "ArrowRight" ? 1 : -1))));
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} aria-hidden="true" className={drawn ? "garden-ui-chart-drawn" : undefined}>
          {yTicks.map((tick) => (
            <g key={`y${tick}`}>
              <line className="garden-ui-chart-grid" x1={MARGIN.left} x2={MARGIN.left + innerWidth} y1={y.map(tick)} y2={y.map(tick)} />
              <text className="garden-ui-chart-tick" x={MARGIN.left - 6} y={y.map(tick)} textAnchor="end" dominantBaseline="middle">{formatValue(tick, yFormat)}</text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text
              key={`x${tick}`}
              className="garden-ui-chart-tick"
              x={x.map(tick)}
              y={MARGIN.top + innerHeight + 18}
              textAnchor={anchorAt(x.map(tick))}
            >
              {xTickLabel(tick)}
            </text>
          ))}
          <line className="garden-ui-chart-axis" x1={MARGIN.left} x2={MARGIN.left + innerWidth} y1={MARGIN.top + innerHeight} y2={MARGIN.top + innerHeight} />
          {value("yLabel") !== undefined ? (
            <text className="garden-ui-chart-label" x={MARGIN.left} y={10}>{asString(value("yLabel"))}</text>
          ) : null}
          {value("xLabel") !== undefined ? (
            <text className="garden-ui-chart-label" x={MARGIN.left + innerWidth} y={height - 2} textAnchor="end">{asString(value("xLabel"))}</text>
          ) : null}
          {model.series.map((series, seriesIndex) => {
            if (series.kind === "Line") {
              const mark = series.ys.length <= 16;
              return (
                <g key={seriesIndex}>
                  <path className={`garden-ui-chart-line garden-ui-series-${series.tone}`} d={path(series.ys)} pathLength={1} />
                  {mark
                    ? series.ys.map((yValue, index) => (
                        Number.isFinite(yValue) && !(yScaleKind === "log" && yValue <= 0)
                          ? <circle key={index} className={`garden-ui-chart-point garden-ui-series-${series.tone}`} cx={x.map(model.xs[index])} cy={y.map(yValue)} r={3.5} />
                          : null
                      ))
                    : null}
                </g>
              );
            }
            if (series.kind === "Area") {
              const line = path(series.ys);
              const baseline = y.map(yScaleKind === "log" ? yMin : Math.max(yMin, 0));
              const first = x.map(model.xs[0]);
              const last = x.map(model.xs[model.xs.length - 1]);
              return (
                <g key={seriesIndex}>
                  <path className={`garden-ui-chart-area garden-ui-series-${series.tone}`} d={`${line}L${last},${baseline}L${first},${baseline}Z`} />
                  <path className={`garden-ui-chart-line garden-ui-series-${series.tone}`} d={line} pathLength={1} />
                </g>
              );
            }
            if (series.kind === "Bar") {
              const barIndex = barSeries.indexOf(series);
              return series.ys.map((value, index) => {
                if (!Number.isFinite(value)) return null;
                const center = x.map(model.xs[index]);
                const left = center - ((barWidth + 2) * barSeries.length) / 2 + barIndex * (barWidth + 2);
                const top = y.map(Math.max(value, yMin));
                const base = y.map(yScaleKind === "log" ? yMin : Math.max(yMin, 0));
                return <rect key={`${seriesIndex}-${index}`} className={`garden-ui-chart-bar garden-ui-series-${series.tone}`} x={left} y={Math.min(top, base)} width={barWidth} height={Math.abs(base - top)} rx={Math.min(4, barWidth / 4)} />;
              });
            }
            return series.ys.map((value, index) =>
              Number.isFinite(value) ? <circle key={`${seriesIndex}-${index}`} className={`garden-ui-chart-point garden-ui-series-${series.tone}`} cx={x.map(model.xs[index])} cy={y.map(value)} r={3} /> : null,
            );
          })}
          {markerX !== null && markerIndex !== null ? (
            <g>
              <line className="garden-ui-chart-marker" x1={markerX} x2={markerX} y1={MARGIN.top} y2={MARGIN.top + innerHeight} />
              {model.series.map((series, index) => {
                const yValue = series.ys[markerIndex];
                if (!Number.isFinite(yValue)) return null;
                return (
                  <g key={index}>
                    <circle className={`garden-ui-chart-dot garden-ui-series-${series.tone}`} cx={x.map(model.xs[markerIndex])} cy={y.map(yValue)} r={4} />
                    <text className="garden-ui-chart-value" x={x.map(model.xs[markerIndex]) + (markerX > MARGIN.left + innerWidth * 0.7 ? -8 : 8)} y={y.map(yValue) - 8} textAnchor={markerX > MARGIN.left + innerWidth * 0.7 ? "end" : "start"}>
                      {formatValue(yValue, series.format)}
                    </text>
                  </g>
                );
              })}
            </g>
          ) : null}
          {tooltipIndex !== null ? (
            <line className="garden-ui-chart-cross" x1={x.map(model.xs[tooltipIndex])} x2={x.map(model.xs[tooltipIndex])} y1={MARGIN.top} y2={MARGIN.top + innerHeight} />
          ) : null}
        </svg>
        {tooltipIndex !== null ? (
          <div
            className="garden-ui-chart-tooltip"
            style={{ left: `${(x.map(model.xs[tooltipIndex]) / width) * 100}%` }}
            data-side={x.map(model.xs[tooltipIndex]) > width * 0.6 ? "left" : "right"}
          >
            <strong>{xLabel(tooltipIndex)}</strong>
            {model.series.map((series, index) => (
              <span key={index}>{model.series.length > 1 ? `${series.label}：` : ""}{formatValue(series.ys[tooltipIndex], series.format)}</span>
            ))}
          </div>
        ) : null}
      </div>
      {/* Tables ignore width: 1px, so the hiding box is a wrapper. */}
      <div className="garden-ui-sr-only">
      <table id={`${baseId}-table`}>
        <thead>
          <tr>
            <th>{asString(value("xLabel"), "x")}</th>
            {model.series.map((series, index) => <th key={index}>{series.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {model.xs.slice(0, 200).map((_, index) => (
            <tr key={index}>
              <td>{xLabel(index)}</td>
              {model.series.map((series, seriesIndex) => <td key={seriesIndex}>{formatValue(series.ys[index], series.format)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

const PIE_COLORS = ["#539af8", "#6bc67f", "#ef8b57", "#0d0d0d", "#8f8f8f"];
const PIE_VIEW = { width: 742, height: 400, cx: 371, cy: 181, inner: 70.4, outer: 137.28 };

function ringPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  const tau = Math.PI * 2;
  const sweep = end - start;
  if (sweep >= tau - 1e-4) {
    const mid = start + Math.PI;
    return `${ringPath(cx, cy, inner, outer, start, mid)} ${ringPath(cx, cy, inner, outer, mid, start + tau)}`;
  }
  const point = (radius: number, angle: number) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  const [x0, y0] = point(outer, start);
  const [x1, y1] = point(outer, end);
  const [x2, y2] = point(inner, end);
  const [x3, y3] = point(inner, start);
  const large = sweep > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`;
}

function Pie({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const title = propValue(runtime, node, "title", env);
  const slices = expandChildren(runtime, node.c, env)
    .filter((item) => item.node.n === "Slice")
    .map((item) => ({
      label: asString(propValue(runtime, item.node, "label", item.env)),
      value: Math.max(0, asNumber(propValue(runtime, item.node, "value", item.env)) ?? 0),
    }))
    .filter((slice) => slice.value > 0);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let angle = -Math.PI / 2;
  const arcs: Array<(typeof slices)[number] & { path: string; color: string }> = [];
  for (const [index, slice] of slices.entries()) {
    const sweep = total > 0 ? (slice.value / total) * Math.PI * 2 : 0;
    const path = ringPath(PIE_VIEW.cx, PIE_VIEW.cy, PIE_VIEW.inner, PIE_VIEW.outer, angle, angle + sweep);
    angle += sweep;
    arcs.push({ ...slice, path, color: PIE_COLORS[index % PIE_COLORS.length] });
  }
  return (
    <figure className="garden-ui-pie">
      {title !== undefined ? <p className="garden-ui-pie-title">{asString(title)}</p> : null}
      <div className="garden-ui-pie-chart">
        <svg viewBox={`0 0 ${PIE_VIEW.width} ${PIE_VIEW.height}`} role="img" aria-label={title !== undefined ? asString(title) : "圆环图"}>
          {arcs.map((arc) => <path key={arc.label} d={arc.path} fill={arc.color} />)}
        </svg>
        <ul className="garden-ui-legend">
          {arcs.map((arc) => (
            <li key={arc.label}>
              <span className="garden-ui-swatch" style={{ background: arc.color }} />
              {arc.label}
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

function Slice() {
  return null;
}

registerComponents({ Chart, Pie, Slice });
