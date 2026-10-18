/**
 * Pure enhancements shared by the renderer and `garden check`.
 * Math identifiers, code/diff pairing, table breakout and TOC shift.
 */

const IDENTIFIER = /(^|[^\\A-Za-z])([A-Za-z]{2,})_([A-Za-z][A-Za-z0-9]*)/gu;

/** `group_num` becomes one identifier. `W_q` and `H_kv` stay real subscripts. */
export function protectMathIdentifiers(tex) {
  return String(tex ?? "").replace(IDENTIFIER, (_, prefix, base, rest) => `${prefix}\\mathrm{${base}\\_${rest}}`);
}

/** New-file text of a unified diff: additions and context, deletions dropped. */
export function diffToNewCode(diff) {
  return String(diff ?? "")
    .replace(/\n$/u, "")
    .split("\n")
    .flatMap((line) => {
      if (line.startsWith("+")) return [line.slice(1)];
      if (line.startsWith("-") || line.startsWith("\\")) return [];
      return [line.startsWith(" ") ? line.slice(1) : line];
    })
    .join("\n");
}

export function isTrivialFormula(formula) {
  const compact = String(formula ?? "").replace(/\s+/gu, "");
  if (!compact || (compact.match(/\*/gu) || []).length !== 1) return false;
  const outside = compact.replace(/\([^()]*\)/gu, "");
  return !/[+\-/]/u.test(outside);
}

export function interactiveFormulas(source) {
  const text = String(source ?? "");
  const found = [];
  for (const match of text.matchAll(/^formula:\s*(.+)$/gmu)) found.push(match[1]);
  for (const match of text.matchAll(/<Let\b[^>]*?\{([^{}]+)\}/gu)) found.push(match[1]);
  return found;
}

export function isTrivialInteractive(source) {
  const formulas = interactiveFormulas(source);
  return formulas.length > 0 && formulas.every((formula) => isTrivialFormula(formula));
}

/** Steps that only restyle prose: a stepper and no input the reader can change. */
export function isProseSteps(source) {
  const text = String(source ?? "");
  const body = text.includes("\n---\n") ? text.split("\n---\n").slice(1).join("\n---\n") : text;
  if (!/<(Steps|Stepper|Step)\b/u.test(body)) return false;
  return !/<(State|Slider|Choice|Toggle|Input|Range)\b/u.test(body);
}

/**
 * How far a table may break out of the text column.
 * Symmetric, at most `cap` per side, never closer than `edge` to the viewport,
 * and only when the viewport is at least `minViewport`.
 */
export function tableBreakout({
  viewport,
  articleLeft,
  articleRight,
  tableClient,
  tableScroll,
  minViewport = 900,
  cap = 300,
  edge = 24,
}) {
  if (viewport < minViewport) return { left: 0, right: 0 };
  const room = Math.max(0, Math.min(cap, articleLeft - edge, viewport - edge - articleRight));
  const need = tableScroll - tableClient;
  if (need <= 1 || room <= 0) return { left: 0, right: 0 };
  const margin = Math.min(room, Math.ceil(need / 2) + 4);
  return { left: margin, right: margin };
}

/**
 * The width an article image displays at: its width attribute when it has
 * one, otherwise half its pixels (screenshots are usually 2x). 0 while the
 * image has not loaded. Never more than the image itself, so nothing is
 * enlarged; the column still caps it through max-width.
 */
export function imageDisplayWidth({ naturalWidth = 0, attrWidth = 0, density = 2 }) {
  if (attrWidth > 0) return naturalWidth > 0 ? Math.min(attrWidth, naturalWidth) : attrWidth;
  if (!(naturalWidth > 0)) return 0;
  return Math.round(naturalWidth / density);
}

/**
 * How far a figure steps out on each side. Screenshots are usually 2x, so an
 * image displays at naturalWidth / density unless it states its own width.
 * A figure widens only when that display width is wider than the column, and
 * never past the display width, maxWidth in total, or the room on screen.
 */
export function figureBreakout({
  viewport,
  articleLeft,
  articleRight,
  figureClient,
  imageClient = figureClient,
  naturalWidth = 0,
  attrWidth = 0,
  density = 2,
  maxWidth = 1040,
  minViewport = 900,
  edge = 24,
}) {
  if (viewport < minViewport) return { left: 0, right: 0 };
  const display = imageDisplayWidth({ naturalWidth, attrWidth, density });
  // Wider than the text column, or it stays in the column.
  if (!(display > figureClient)) return { left: 0, right: 0 };
  const need = Math.floor(display - imageClient);
  if (!(need > 1)) return { left: 0, right: 0 };
  const target = Math.min(figureClient + need, Math.max(maxWidth, figureClient));
  const room = Math.max(0, Math.min(articleLeft - edge, viewport - edge - articleRight));
  const side = Math.min(room, Math.floor((target - figureClient) / 2));
  if (side <= 0) return { left: 0, right: 0 };
  return { left: side, right: side };
}

/**
 * Slide the TOC right of a wide element measured against the TOC's original
 * position. Hide it when the shifted TOC would not fit on screen.
 */
export function tocShift({ tocLeft, tocWidth, viewport, overlapRights, edge = 12 }) {
  if (!overlapRights?.length) return { shift: 0, hide: false };
  const maxRight = Math.max(...overlapRights);
  let shift = Math.ceil(maxRight + 16 - tocLeft);
  const hide = tocLeft + shift + tocWidth > viewport - edge;
  if (hide) shift = Math.ceil(viewport - tocLeft + 8);
  if (shift < 0) shift = 0;
  return { shift, hide };
}
