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
 * The width used to decide whether an image widens past the column: its width
 * attribute when it has one, otherwise half its pixels (screenshots are
 * usually 2x). 0 while the image has not loaded. Never more than the image
 * itself, so nothing is enlarged.
 */
export function imageDisplayWidth({ naturalWidth = 0, attrWidth = 0, density = 2 }) {
  if (attrWidth > 0) return naturalWidth > 0 ? Math.min(attrWidth, naturalWidth) : attrWidth;
  if (!(naturalWidth > 0)) return 0;
  return Math.round(naturalWidth / density);
}

/**
 * The inline width an article image gets, or 0 to leave it to CSS
 * (width:auto; max-width:100%), which shows it at its natural size and caps
 * it at the column, never stretched and never halved. A widened image takes
 * its display width; an image in the column only follows its width attribute,
 * never past its own pixels.
 */
export function figureImageWidth({ naturalWidth = 0, attrWidth = 0, widened = false, density = 2 }) {
  if (widened) return imageDisplayWidth({ naturalWidth, attrWidth, density });
  if (attrWidth > 0) return naturalWidth > 0 ? Math.min(attrWidth, naturalWidth) : attrWidth;
  return 0;
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
 * The same decision made at build time, when the image's pixel size is known:
 * a figure in a full-width article column (`column` wide, the image card
 * `inset` narrower) with room to spare on both sides. Returns how far the
 * figure steps out on each side (`side`, 0 when it stays in the column) and
 * the inline width the image gets, so its box is the right size before the
 * file loads. The browser repeats the calculation after hydration and keeps
 * it as the fallback for images without a known size.
 */
export function figureLayout({ naturalWidth = 0, attrWidth = 0, column = 740, inset = 26, density = 2, maxWidth = 1040 }) {
  if (!(naturalWidth > 0)) return { side: 0, width: attrWidth > 0 ? attrWidth : 0 };
  // Before any widening the image shows at its own pixels (or its width attribute), capped at the card.
  const base = attrWidth > 0 ? Math.min(attrWidth, naturalWidth) : naturalWidth;
  const viewport = 100000;
  const articleLeft = (viewport - column) / 2;
  const { left } = figureBreakout({
    viewport,
    articleLeft,
    articleRight: articleLeft + column,
    figureClient: column,
    imageClient: Math.min(base, column - inset),
    naturalWidth,
    attrWidth,
    density,
    maxWidth,
  });
  const widened = figureImageWidth({ naturalWidth, attrWidth, widened: left > 0, density });
  return { side: left, width: widened || base };
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
