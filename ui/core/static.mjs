import { TONE_LABELS } from "./catalog.mjs";
import { createBudget, evaluate } from "./expr.mjs";
import { formatValue } from "./format.mjs";
import { collectDecls, computeScope, defaultStateValues, isPowerOfTwo, lookupFrom, sampleDomain } from "./state.mjs";

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const text = (value) => ({ k: "t", v: String(value) });

/** Builds a format-neutral document of the payload at its default state. */
export function toDoc(payload) {
  const { root, data = {} } = payload;
  const decls = collectDecls(root);
  const defaults = defaultStateValues(decls);
  const budget = createBudget(800000);
  const scopes = new Map();
  const scopeFor = (stateValues) => {
    const key = JSON.stringify(stateValues);
    if (!scopes.has(key)) scopes.set(key, computeScope(decls, { stateValues, dataValues: data, budget, onError: () => {} }));
    return scopes.get(key);
  };
  const sliders = new Map();
  const findSliders = (node) => {
    if (node?.t === "el" && node.n === "Slider" && node.p.bind?.k === "lit") sliders.set(node.p.bind.v, node);
    node?.c?.forEach?.(findSliders);
  };
  findSliders(root);

  const makeLookup = (ctx) => lookupFrom(...ctx.locals, scopeFor(ctx.state));
  const value = (node, name, ctx) => {
    const prop = node.p[name];
    if (!prop) return undefined;
    if (prop.k === "lit") return prop.v;
    try {
      return evaluate(prop.e, makeLookup(ctx), budget);
    } catch {
      return undefined;
    }
  };
  const rowValue = (prop, row, ctx) => {
    if (!prop) return undefined;
    if (prop.k === "lit") return prop.v;
    try {
      return evaluate(prop.e, lookupFrom(isPlainObject(row) ? row : {}, ...ctx.locals, scopeFor(ctx.state)), budget);
    } catch {
      return undefined;
    }
  };

  const expand = (children, ctx) => {
    const output = [];
    for (const child of children) {
      if (child.t === "el" && child.n === "If") {
        if (value(child, "test", ctx)) output.push(...expand(child.c, ctx));
      } else if (child.t === "el" && child.n === "Each") {
        const items = value(child, "of", ctx);
        if (!Array.isArray(items)) continue;
        items.slice(0, 200).forEach((item, index) => {
          const local = { [child.p.as.v]: item };
          if (child.p.index?.k === "lit") local[child.p.index.v] = index;
          output.push(...expand(child.c, { ...ctx, locals: [local, ...ctx.locals] }));
        });
      } else {
        output.push({ node: child, ctx });
      }
    }
    return output;
  };

  const inlines = (nodes, ctx) => nodes.flatMap((node) => {
    switch (node.t) {
      case "text":
        return [text(node.v)];
      case "x": {
        let result;
        try {
          result = evaluate(node.e, makeLookup(ctx), budget);
        } catch {
          result = undefined;
        }
        return [text(formatValue(result))];
      }
      case "strong":
        return [{ k: "b", c: inlines(node.c, ctx) }];
      case "em":
        return [{ k: "i", c: inlines(node.c, ctx) }];
      case "code":
        return [{ k: "code", v: node.v }];
      case "br":
        return [{ k: "br" }];
      case "link":
        return [{ k: "a", href: node.u, c: inlines(node.c, ctx) }];
      case "p":
        return inlines(node.c, ctx);
      case "el":
        if (node.n === "Badge") return [text(`［${plainInline(inlines(node.c, ctx))}］`)];
        if (node.n === "Cite") return [text(value(node, "label", ctx) ?? "")];
        if (node.n === "If" || node.n === "Each") return expand([node], ctx).flatMap((item) => inlines([item.node], item.ctx));
        return [];
      default:
        return [];
    }
  });

  const cellText = (cell) => formatValue(cell);
  const toneSuffix = (tone, legend) => {
    if (!tone || tone === "plain") return "";
    const label = (isPlainObject(legend) && typeof legend[tone] === "string" && legend[tone]) || TONE_LABELS[tone] || tone;
    return `（${label}）`;
  };
  const rowsOf = (node, ctx, legend) => {
    const rows = [];
    const notes = [];
    for (const item of expand(node.c, ctx)) {
      if (item.node.n !== "Row") continue;
      const cells = value(item.node, "cells", item.ctx);
      if (!Array.isArray(cells)) continue;
      const tones = value(item.node, "tones", item.ctx);
      const rowNotes = value(item.node, "notes", item.ctx);
      const label = value(item.node, "label", item.ctx);
      rows.push({
        label: label === undefined ? null : cellText(label),
        cells: cells.map((cell, index) => `${cellText(cell)}${toneSuffix(Array.isArray(tones) ? tones[index] : tones, legend)}`),
      });
      if (Array.isArray(rowNotes)) {
        rowNotes.forEach((note, index) => {
          if (typeof note === "string" && note.trim()) notes.push({ row: label === undefined ? `第 ${rows.length} 行` : cellText(label), index, note });
        });
      }
    }
    return { rows, notes };
  };

  const blocks = (nodes, ctx) => nodes.flatMap((node) => block(node, ctx));

  function block(node, ctx) {
    switch (node.t) {
      case "p":
        return [{ k: "p", inl: inlines(node.c, ctx) }];
      case "list":
        return [{ k: "list", ordered: node.o, items: node.c.map((item) => blocks(item.c, ctx)) }];
      case "quote":
        return [{ k: "quote", blocks: blocks(node.c, ctx) }];
      case "hr":
        return [{ k: "hr" }];
      case "text":
      case "x":
        return [{ k: "p", inl: inlines([node], ctx) }];
      case "el":
        return element(node, ctx);
      default:
        return [];
    }
  }

  function element(node, ctx) {
    const v = (name) => value(node, name, ctx);
    switch (node.n) {
      case "State":
      case "Let":
      case "Data":
      case "Button":
        return [];
      case "If":
      case "Each":
        return expand([node], ctx).flatMap((item) => block(item.node, item.ctx));
      case "Stack":
      case "Columns":
        return blocks(node.c, ctx);
      case "Card": {
        const title = v("title");
        return [...(title ? [{ k: "p", inl: [{ k: "b", c: [text(title)] }] }] : []), ...blocks(node.c, ctx)];
      }
      case "Tabs":
        return expand(node.c, ctx).flatMap((item) => [
          { k: "p", inl: [{ k: "b", c: [text(value(item.node, "title", item.ctx) ?? "")] }] },
          ...blocks(item.node.c, item.ctx),
        ]);
      case "Steps": {
        const bind = node.p.bind?.k === "lit" ? node.p.bind.v : null;
        const items = expand(node.c, ctx);
        return [{
          k: "list",
          ordered: true,
          items: items.map((item, index) => {
            const stepCtx = bind ? { ...item.ctx, state: { ...item.ctx.state, [bind]: index } } : item.ctx;
            const title = value(item.node, "title", stepCtx) ?? "";
            const content = blocks(item.node.c, stepCtx);
            const [firstBlock, ...restBlocks] = content;
            if (firstBlock?.k === "p") return [{ k: "p", inl: [{ k: "b", c: [text(title)] }, text("："), ...firstBlock.inl] }, ...restBlocks];
            return [{ k: "p", inl: [{ k: "b", c: [text(title)] }] }, ...content];
          }),
        }];
      }
      case "Slider": {
        const current = ctx.state[v("bind")];
        return [{ k: "p", inl: [text(`${v("label")}：${formatValue(current, v("format"))}${v("unit") ? ` ${v("unit")}` : ""}（网页中可调，范围 ${formatValue(v("min"), v("format"))}–${formatValue(v("max"), v("format"))}）`)] }];
      }
      case "Choice": {
        const options = Array.isArray(v("options")) ? v("options") : [];
        const labelOf = (option) => (isPlainObject(option) ? String(option.label ?? option.value) : String(option));
        const current = options.find((option) => (isPlainObject(option) ? option.value : option) === ctx.state[v("bind")]);
        return [{ k: "p", inl: [text(`${v("label")}：${current === undefined ? "—" : labelOf(current)}（网页中可选：${options.map(labelOf).join(" / ")}）`)] }];
      }
      case "Toggle":
        return [{ k: "p", inl: [text(`${v("label")}：${ctx.state[v("bind")] ? "开" : "关"}（网页中可切换）`)] }];
      case "Checklist": {
        const items = Array.isArray(v("items")) ? v("items") : [];
        const title = v("title");
        return [
          ...(title ? [{ k: "p", inl: [{ k: "b", c: [text(title)] }] }] : []),
          {
            k: "list",
            ordered: false,
            items: items.map((item) => {
              const entry = isPlainObject(item) ? item : { title: String(item) };
              const line = `☐ ${entry.time ? `${entry.time} ` : ""}${entry.title ?? ""}${entry.note ? ` —— ${entry.note}` : ""}`;
              return [{ k: "p", inl: [text(line)] }];
            }),
          },
        ];
      }
      case "Stepper": {
        const current = ctx.state[v("bind")];
        return [{ k: "p", inl: [text(`${v("label") ?? "数量"}：${formatValue(current)}${v("unit") ? ` ${v("unit")}` : ""}（网页中可调，范围 ${formatValue(v("min"))}–${formatValue(v("max"))}）`)] }];
      }
      case "Caption":
        return [{ k: "p", inl: inlines(node.c, ctx) }];
      case "Divider":
        return [{ k: "hr" }];
      case "Cite":
        return [{ k: "p", inl: [text(String(v("label") ?? ""))] }];
      case "Pie": {
        const slices = expand(node.c, ctx).filter((item) => item.node.n === "Slice");
        const title = v("title");
        return [
          ...(title ? [{ k: "p", inl: [{ k: "b", c: [text(title)] }] }] : []),
          {
            k: "list",
            ordered: false,
            items: slices.map((item) => [{ k: "p", inl: [text(`${value(item.node, "label", item.ctx) ?? ""}：${formatValue(value(item.node, "value", item.ctx))}`)] }]),
          },
        ];
      }
      case "Slice":
        return [];
      case "Stat": {
        const hint = v("hint");
        return [{ k: "p", inl: [text(`${v("label")}：`), { k: "b", c: [text(`${formatValue(v("value"), v("format"))}${v("unit") ? ` ${v("unit")}` : ""}`)] }, ...(hint ? [text(`（${formatValue(hint)}）`)] : [])] }];
      }
      case "Meter": {
        const format = v("format");
        const parts = Array.isArray(v("parts")) ? v("parts").filter(isPlainObject) : null;
        const total = parts ? parts.reduce((sum, part) => sum + (typeof part.value === "number" ? part.value : 0), 0) : v("value");
        const detail = parts ? `：${parts.map((part) => `${part.label ?? ""} ${formatValue(part.value, format)}`).join("，")}` : "";
        return [{ k: "p", inl: [text(`${v("label") ?? ""}${v("label") ? "：" : ""}${formatValue(total, format)} / ${formatValue(v("max"), format)}${detail}`)] }];
      }
      case "Badge":
        return [{ k: "p", inl: inlines([node], ctx) }];
      case "Table": {
        const columns = Array.isArray(v("columns")) ? v("columns") : [];
        const head = columns.map((column) => (isPlainObject(column) ? String(column.label ?? column.key ?? "") : String(column)));
        if (node.p.data) {
          const rows = Array.isArray(v("data")) ? v("data").slice(0, 50) : [];
          return [{
            k: "table",
            head,
            rows: rows.map((row) => {
              const tone = rowValue(node.p.rowTone, row, ctx);
              return columns.map((column, index) => {
                const cell = isPlainObject(column) && isPlainObject(row) ? row[column.key] : undefined;
                return `${formatValue(cell, isPlainObject(column) ? column.format : undefined)}${index === 0 ? toneSuffix(tone) : ""}`;
              });
            }),
          }];
        }
        const { rows, notes } = rowsOf(node, ctx, null);
        const hasLabels = rows.some((row) => row.label !== null);
        return [
          { k: "table", head: hasLabels ? ["", ...head] : head, rows: rows.map((row) => (hasLabels ? [row.label ?? "", ...row.cells] : row.cells)) },
          ...notes.map((note) => ({ k: "p", inl: [text(`${note.row} · ${head[note.index] ?? ""}：${note.note}`)] })),
        ];
      }
      case "Grid": {
        const cols = Array.isArray(v("cols")) ? v("cols").map(String) : [];
        const legend = v("legend");
        const { rows, notes } = rowsOf(node, ctx, legend);
        return [
          { k: "table", head: ["", ...cols], rows: rows.map((row) => [row.label ?? "", ...row.cells]) },
          ...notes.map((note) => ({ k: "p", inl: [text(`${note.row} · ${cols[note.index] ?? ""}：${note.note}`)] })),
        ];
      }
      case "Chart": {
        const series = expand(node.c, ctx).filter((item) => ["Line", "Area", "Bar", "Point"].includes(item.node.n));
        const labels = series.map((item, index) => value(item.node, "label", item.ctx) ?? `系列 ${index + 1}`);
        const formats = series.map((item) => value(item.node, "format", item.ctx) ?? v("yFormat"));
        const note = { k: "p", inl: [text("（网页中为可交互图表）")] };
        if (node.p.data) {
          const rows = Array.isArray(v("data")) ? v("data").slice(0, 50) : [];
          return [note, {
            k: "table",
            head: [v("xLabel") ?? "x", ...labels],
            rows: rows.map((row) => [
              formatValue(rowValue(node.p.x, row, ctx), v("xFormat")),
              ...series.map((item, index) => formatValue(rowValue(item.node.p.y, row, item.ctx), formats[index])),
            ]),
          }];
        }
        const sweep = v("sweep");
        const slider = sliders.get(sweep);
        const sliderValue = (name) => (slider ? value(slider, name, ctx) : undefined);
        const from = v("from") ?? sliderValue("min");
        const to = v("to") ?? sliderValue("max");
        if (typeof from !== "number" || typeof to !== "number") return [note];
        const scale = v("scale") ?? sliderValue("scale") ?? "linear";
        const snap = sliderValue("snap") ?? (scale === "log" && isPowerOfTwo(from) && isPowerOfTwo(to) ? "pow2" : "none");
        let points = sampleDomain({ from, to, scale, samples: 6 });
        if (snap === "pow2") {
          const powers = sampleDomain({ from, to, pow2: true });
          points = powers.length <= 6 ? powers : Array.from({ length: 6 }, (_, index) => powers[Math.round((index * (powers.length - 1)) / 5)]);
        }
        const rows = points.map((x) => {
          const scope = computeScope(decls, { stateValues: { ...ctx.state, [sweep]: x }, dataValues: data, budget, onError: () => {} });
          return [
            formatValue(x, v("xFormat") ?? sliderValue("format")),
            ...series.map((item, index) => {
              const y = item.node.p.y;
              try {
                const expression = y.k === "expr" ? y.e : { type: "Literal", value: y.v };
                return formatValue(evaluate(expression, lookupFrom(...item.ctx.locals, scope), budget), formats[index]);
              } catch {
                return "—";
              }
            }),
          ];
        });
        return [note, { k: "table", head: [v("xLabel") ?? (slider ? value(slider, "label", ctx) : sweep), ...labels], rows }];
      }
      case "Image": {
        const hotspots = expand(node.c, ctx).filter((item) => item.node.n === "Hotspot");
        return [
          { k: "image", src: String(v("src") ?? ""), alt: String(v("alt") ?? "") },
          ...(hotspots.length
            ? [{
                k: "list",
                ordered: true,
                items: hotspots.map((item) => {
                  const content = blocks(item.node.c, item.ctx);
                  const lead = { k: "b", c: [text(value(item.node, "title", item.ctx) ?? "")] };
                  const [firstBlock, ...restBlocks] = content;
                  return firstBlock?.k === "p" ? [{ k: "p", inl: [lead, text("："), ...firstBlock.inl] }, ...restBlocks] : [{ k: "p", inl: [lead] }, ...content];
                }),
              }]
            : []),
        ];
      }
      case "Code": {
        const highlight = v("highlight");
        return [
          ...(highlight ? [{ k: "p", inl: [text(`高亮：第 ${String(highlight).replaceAll("-", "–").replaceAll(",", "、")} 行`)] }] : []),
          { k: "code", lang: String(v("lang") ?? ""), text: String(v("code") ?? "") },
        ];
      }
      case "Diagram": {
        const highlight = Array.isArray(v("highlight")) ? v("highlight") : [];
        return [
          ...(highlight.length ? [{ k: "p", inl: [text(`高亮：${highlight.join("、")}`)] }] : []),
          { k: "code", lang: "mermaid", text: String(v("mermaid") ?? "") },
        ];
      }
      default:
        return [];
    }
  }

  return blocks(root.c, { state: defaults, locals: [] });
}

export function plainInline(inline) {
  return inline.map((item) => {
    if (item.k === "t") return item.v;
    if (item.k === "code") return item.v;
    if (item.k === "br") return " ";
    if (item.c) return plainInline(item.c);
    return "";
  }).join("");
}

const escapeHtml = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const safeHref = (href) => (/^(?:https:\/\/|\.{0,2}\/|#)/u.test(href) ? href : "#");

function inlineHtml(inline) {
  return inline.map((item) => {
    switch (item.k) {
      case "t":
        return escapeHtml(item.v);
      case "b":
        return `<strong>${inlineHtml(item.c)}</strong>`;
      case "i":
        return `<em>${inlineHtml(item.c)}</em>`;
      case "code":
        return `<code>${escapeHtml(item.v)}</code>`;
      case "br":
        return "<br>";
      case "a":
        return `<a href="${escapeHtml(safeHref(item.href))}">${inlineHtml(item.c)}</a>`;
      default:
        return "";
    }
  }).join("");
}

export function docToHtml(doc) {
  return doc.map((block) => {
    switch (block.k) {
      case "p":
        return `<p>${inlineHtml(block.inl)}</p>`;
      case "list": {
        const tag = block.ordered ? "ol" : "ul";
        return `<${tag}>${block.items.map((item) => `<li>${docToHtml(item)}</li>`).join("")}</${tag}>`;
      }
      case "quote":
        return `<blockquote>${docToHtml(block.blocks)}</blockquote>`;
      case "hr":
        return "<hr>";
      case "table": {
        const head = block.head?.length ? `<thead><tr>${block.head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>` : "";
        return `<table>${head}<tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      }
      case "code":
        return `<pre><code${block.lang ? ` class="language-${escapeHtml(block.lang)}"` : ""}>${escapeHtml(block.text).replaceAll("\n", "&#10;")}</code></pre>`;
      case "image":
        return `<p><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}"></p>`;
      default:
        return "";
    }
  }).join("");
}

const escapeMarkdown = (value) => String(value).replace(/([\\`*_[\]<>|])/gu, "\\$1");

function inlineMarkdown(inline) {
  return inline.map((item) => {
    switch (item.k) {
      case "t":
        return escapeMarkdown(item.v);
      case "b":
        return `**${inlineMarkdown(item.c)}**`;
      case "i":
        return `*${inlineMarkdown(item.c)}*`;
      case "code":
        return `\`${item.v.replaceAll("`", "'")}\``;
      case "br":
        return "  \n";
      case "a":
        return `[${inlineMarkdown(item.c)}](${safeHref(item.href)})`;
      default:
        return "";
    }
  }).join("");
}

export function docToMarkdown(doc, indent = "") {
  return doc.map((block) => {
    switch (block.k) {
      case "p":
        return `${indent}${inlineMarkdown(block.inl)}`;
      case "list":
        return block.items.map((item, index) => {
          const bullet = block.ordered ? `${index + 1}. ` : "- ";
          const body = docToMarkdown(item, `${indent}${" ".repeat(bullet.length)}`).trimStart();
          return `${indent}${bullet}${body}`;
        }).join("\n");
      case "quote":
        return docToMarkdown(block.blocks).split("\n").map((line) => `${indent}> ${line}`).join("\n");
      case "hr":
        return `${indent}---`;
      case "table": {
        const head = block.head?.length ? block.head : block.rows[0]?.map(() => "") ?? [];
        const row = (cells) => `${indent}| ${cells.map((cell) => String(cell).replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`;
        return [row(head), `${indent}| ${head.map(() => "---").join(" | ")} |`, ...block.rows.map(row)].join("\n");
      }
      case "code": {
        const longest = Math.max(0, ...[...block.text.matchAll(/`+/gu)].map((match) => match[0].length));
        const marker = "`".repeat(Math.max(3, longest + 1));
        return `${indent}${marker}${block.lang}\n${block.text}\n${indent}${marker}`;
      }
      case "image":
        return `${indent}![${escapeMarkdown(block.alt)}](${block.src})`;
      default:
        return "";
    }
  }).filter(Boolean).join("\n\n");
}

export function docToText(doc) {
  return doc.map((block) => {
    switch (block.k) {
      case "p":
        return plainInline(block.inl);
      case "list":
        return block.items.map((item) => docToText(item)).join(" ");
      case "quote":
        return docToText(block.blocks);
      case "table":
        return [...(block.head ?? []), ...block.rows.flat()].join(" ");
      case "code":
        return block.text;
      case "image":
        return block.alt;
      default:
        return "";
    }
  }).filter(Boolean).join(" ");
}

export function renderStatic(payload, format = "html") {
  const doc = toDoc(payload);
  if (format === "markdown") return docToMarkdown(doc);
  if (format === "text") return docToText(doc);
  return docToHtml(doc);
}
