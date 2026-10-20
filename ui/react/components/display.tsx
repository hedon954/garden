"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { TONE_LABELS, TONES } from "../../core/catalog.mjs";
import { formatValue } from "../../core/format.mjs";
import { asNumber, asString, expandChildren, propValue, registerComponents, RenderNodes, rowValue, useRuntime, type Runtime } from "../runtime";
import type { Env, UiNode } from "../types";
import { useRuntimeText } from "../lang";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toneOf = (value: unknown, fallback = "plain") => (typeof value === "string" && (TONES as string[]).includes(value) ? value : fallback);

function Stat({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const format = propValue(runtime, node, "format", env) as string | undefined;
  const unit = propValue(runtime, node, "unit", env);
  const hint = propValue(runtime, node, "hint", env);
  const size = asString(propValue(runtime, node, "size", env), "md");
  const tone = toneOf(propValue(runtime, node, "tone", env));
  return (
    <div className={`garden-ui-stat garden-ui-stat-${size} garden-ui-tone-${tone}`}>
      <span className="garden-ui-stat-label">{asString(propValue(runtime, node, "label", env))}</span>
      <span className="garden-ui-stat-value" aria-live="polite">
        {formatValue(propValue(runtime, node, "value", env), format)}
        {unit !== undefined ? <small>{` ${asString(unit)}`}</small> : null}
      </span>
      {hint !== undefined ? <span className="garden-ui-stat-hint">{formatValue(hint)}</span> : null}
    </div>
  );
}

function Meter({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const tx = useRuntimeText();
  const format = propValue(runtime, node, "format", env) as string | undefined;
  const max = asNumber(propValue(runtime, node, "max", env)) ?? 0;
  const rawParts = propValue(runtime, node, "parts", env);
  const parts = Array.isArray(rawParts)
    ? rawParts.filter(isPlainObject).map((part) => ({ label: asString(part.label), value: asNumber(part.value) ?? 0, tone: toneOf(part.tone, "muted") }))
    : null;
  const total = parts ? parts.reduce((sum, part) => sum + part.value, 0) : asNumber(propValue(runtime, node, "value", env)) ?? 0;
  const over = max > 0 && total > max;
  const label = propValue(runtime, node, "label", env);
  const width = (value: number) => `${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%`;
  const tone = toneOf(propValue(runtime, node, "tone", env), "accent");
  return (
    <div className="garden-ui-meter" data-over={over ? "true" : undefined}>
      <div className="garden-ui-meter-head" aria-live="polite">
        <span>{label !== undefined ? asString(label) : ""}</span>
        <span>
          {formatValue(total, format)} / {formatValue(max, format)}
          {over ? <strong>{tx.over(formatValue(total - max, format))}</strong> : null}
        </span>
      </div>
      <div className="garden-ui-meter-track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={total} aria-label={label !== undefined ? asString(label) : undefined}>
        {over ? (
          <span className="garden-ui-meter-fill garden-ui-tone-accent" style={{ width: "100%" }} />
        ) : parts ? (
          parts.map((part, index) => <span key={index} className={`garden-ui-meter-fill garden-ui-tone-${part.tone}`} style={{ width: width(part.value) }} />)
        ) : (
          <span className={`garden-ui-meter-fill garden-ui-tone-${tone}`} style={{ width: width(total) }} />
        )}
      </div>
      {parts ? (
        <ul className="garden-ui-legend">
          {parts.map((part, index) => (
            <li key={index}><span className={`garden-ui-swatch garden-ui-tone-${part.tone}`} />{part.label} {formatValue(part.value, format)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Badge({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  return (
    <span className={`garden-ui-badge garden-ui-tone-${toneOf(propValue(runtime, node, "tone", env), "muted")}`}>
      <RenderNodes nodes={node.c} env={env} />
    </span>
  );
}

type RowModel = { label: string | null; cells: unknown[]; tones: string[]; notes: string[] };

function rowsOf(runtime: Runtime, node: UiNode, env: Env): RowModel[] {
  return expandChildren(runtime, node.c, env)
    .filter((item) => item.node.n === "Row")
    .map((item) => {
      const cellsValue = propValue(runtime, item.node, "cells", item.env);
      const cells = Array.isArray(cellsValue) ? cellsValue : [];
      const tonesValue = propValue(runtime, item.node, "tones", item.env);
      const notesValue = propValue(runtime, item.node, "notes", item.env);
      const label = propValue(runtime, item.node, "label", item.env);
      return {
        label: label === undefined ? null : asString(label),
        cells,
        tones: cells.map((_, index) => toneOf(Array.isArray(tonesValue) ? tonesValue[index] : tonesValue)),
        notes: cells.map((_, index) => (Array.isArray(notesValue) && typeof notesValue[index] === "string" ? notesValue[index] : "")),
      };
    });
}

function NoteArea({ text }: { text: string }) {
  return <p className="garden-ui-note" aria-live="polite">{text}</p>;
}

function Table({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const columnsValue = propValue(runtime, node, "columns", env);
  const columns = (Array.isArray(columnsValue) ? columnsValue : []).map((column) =>
    isPlainObject(column)
      ? { label: asString(column.label ?? column.key), key: typeof column.key === "string" ? column.key : null, format: column.format as string | undefined, align: column.align as string | undefined }
      : { label: asString(column), key: null, format: undefined, align: undefined },
  );
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  let rows: RowModel[];
  if (node.p?.data) {
    const data = propValue(runtime, node, "data", env);
    rows = (Array.isArray(data) ? data.slice(0, 50) : []).map((row) => {
      const tone = toneOf(rowValue(runtime, node.p?.rowTone, row, env));
      return {
        label: null,
        cells: columns.map((column) => (column.key && isPlainObject(row) ? row[column.key] : undefined)),
        tones: columns.map(() => tone),
        notes: columns.map(() => ""),
      };
    });
  } else {
    rows = rowsOf(runtime, node, env);
  }
  const hasLabels = rows.some((row) => row.label !== null);
  // The first column is the row key unless rows carry their own labels; keys stay left even when numeric.
  const numeric = columns.map((_, index) => (index > 0 || hasLabels) && rows.length > 0 && rows.every((row) => typeof row.cells[index] === "number"));
  const note = selected ? rows[selected.row]?.notes[selected.col] : "";
  // A label column plus one value column reads as a list of quantities: value on the right, emphasized.
  const keyValue = hasLabels && columns.length === 1;
  return (
    <div className="garden-ui-table-wrap">
      <table className={`garden-ui-table${keyValue ? " garden-ui-table-kv" : ""}`}>
        <thead>
          <tr>
            {hasLabels ? <th aria-hidden="true" /> : null}
            {columns.map((column, index) => (
              <th key={index} scope="col" data-align={column.align ?? (numeric[index] ? "right" : "left")}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowTone = row.tones.length > 0 && row.tones.every((tone) => tone === row.tones[0]) && row.tones[0] !== "plain" ? row.tones[0] : null;
            return (
            <tr key={rowIndex} className={rowTone ? `garden-ui-tone-${rowTone}` : undefined} data-tone={rowTone ? "row" : undefined}>
              {hasLabels ? <th scope="row">{row.label ?? ""}</th> : null}
              {row.cells.map((cell, colIndex) => {
                const text = formatValue(cell, columns[colIndex]?.format);
                const hasNote = Boolean(row.notes[colIndex]);
                return (
                  <td key={colIndex} className={`garden-ui-tone-${row.tones[colIndex]}`} data-align={columns[colIndex]?.align ?? (numeric[colIndex] ? "right" : "left")}>
                    {hasNote ? (
                      <button type="button" className="garden-ui-note-trigger" aria-pressed={selected?.row === rowIndex && selected?.col === colIndex} onClick={() => setSelected({ row: rowIndex, col: colIndex })}>
                        {text}
                      </button>
                    ) : text}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
      {rows.some((row) => row.notes.some(Boolean)) ? <NoteArea text={note ?? ""} /> : null}
    </div>
  );
}

function Grid({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const tx = useRuntimeText();
  const colsValue = propValue(runtime, node, "cols", env);
  const cols = (Array.isArray(colsValue) ? colsValue : []).map((col) => asString(col));
  const legendValue = propValue(runtime, node, "legend", env);
  const legend = isPlainObject(legendValue) ? legendValue : {};
  const rows = rowsOf(runtime, node, env);
  const [focus, setFocus] = useState({ row: 0, col: 0 });
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const baseId = useId().replaceAll(":", "");
  const usedTones = [...new Set(rows.flatMap((row) => row.tones))].filter((tone) => tone !== "plain");
  const moveFocus = (event: KeyboardEvent, row: number, col: number) => {
    const next = { row: Math.max(0, Math.min(rows.length - 1, row)), col: Math.max(0, Math.min(cols.length - 1, col)) };
    event.preventDefault();
    setFocus(next);
    cellRefs.current.get(`${next.row}:${next.col}`)?.focus();
  };
  const current = selected ? rows[selected.row] : null;
  const note = current && selected
    ? tx.cellNote(current.label ?? tx.rowN(selected.row + 1), cols[selected.col] ?? "", current.notes[selected.col] || formatValue(current.cells[selected.col]))
    : "";
  return (
    <div className="garden-ui-grid-wrap">
      <table className="garden-ui-grid" role="grid" aria-describedby={`${baseId}-note`}>
        <thead>
          <tr>
            <th aria-hidden="true" />
            {cols.map((col, index) => <th key={index} scope="col">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th scope="row">{row.label ?? ""}</th>
              {row.cells.map((cell, colIndex) => {
                const isFocus = focus.row === rowIndex && focus.col === colIndex;
                return (
                  <td key={colIndex}>
                    <button
                      ref={(element) => {
                        if (element) cellRefs.current.set(`${rowIndex}:${colIndex}`, element);
                      }}
                      type="button"
                      className={`garden-ui-cell garden-ui-tone-${row.tones[colIndex]}`}
                      tabIndex={isFocus ? 0 : -1}
                      aria-pressed={selected?.row === rowIndex && selected?.col === colIndex}
                      aria-label={`${row.label ?? ""} ${cols[colIndex] ?? ""}：${formatValue(cell)}${row.tones[colIndex] !== "plain" ? `，${asString(legend[row.tones[colIndex]], TONE_LABELS[row.tones[colIndex] as keyof typeof TONE_LABELS])}` : ""}`}
                      onFocus={() => setFocus({ row: rowIndex, col: colIndex })}
                      onClick={() => setSelected({ row: rowIndex, col: colIndex })}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowRight") moveFocus(event, rowIndex, colIndex + 1);
                        if (event.key === "ArrowLeft") moveFocus(event, rowIndex, colIndex - 1);
                        if (event.key === "ArrowDown") moveFocus(event, rowIndex + 1, colIndex);
                        if (event.key === "ArrowUp") moveFocus(event, rowIndex - 1, colIndex);
                      }}
                    >
                      {formatValue(cell)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="garden-ui-note" id={`${baseId}-note`} aria-live="polite">{note || tx.tapCell}</p>
      {usedTones.length ? (
        <ul className="garden-ui-legend">
          {usedTones.map((tone) => (
            <li key={tone}><span className={`garden-ui-swatch garden-ui-tone-${tone}`} />{asString(legend[tone], TONE_LABELS[tone as keyof typeof TONE_LABELS])}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Caption({ node, env }: { node: UiNode; env: Env }) {
  return (
    <p className="garden-ui-caption">
      <RenderNodes nodes={node.c} env={env} />
    </p>
  );
}

function Divider() {
  return <hr className="garden-ui-divider" />;
}

function faviconSrc(href: string) {
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=32`;
  } catch {
    return null;
  }
}

function Cite({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const label = asString(propValue(runtime, node, "label", env));
  const href = asString(propValue(runtime, node, "href", env), "");
  const icon = href ? faviconSrc(href) : null;
  const body = (
    <>
      {icon ? <span className="garden-ui-cite-icon" aria-hidden="true" style={{ backgroundImage: `url("${icon}")` }} /> : null}
      {label}
    </>
  );
  return href ? (
    <a className="garden-ui-cite" href={href}>{body}</a>
  ) : (
    <span className="garden-ui-cite">{body}</span>
  );
}

registerComponents({ Stat, Meter, Badge, Table, Grid, Caption, Divider, Cite });
