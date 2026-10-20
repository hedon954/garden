/**
 * garden relations: 3 to 6 key elements on a circle and the directed links between them.
 * Shared by the parser (validation), the renderer and the tests.
 */

/** @typedef {{ from: number, to: number, dashed: boolean, both: boolean, label: string }} RelationEdge */

/** 1-based index or exact title -> 0-based index, -1 when it names nothing. */
export function relationIndex(value, titles) {
  if (typeof value === "number") return Number.isInteger(value) && value >= 1 && value <= titles.length ? value - 1 : -1;
  const text = String(value ?? "").trim();
  if (/^\d+$/u.test(text)) return relationIndex(Number(text), titles);
  return titles.indexOf(text);
}

/** @returns {RelationEdge[]} */
export function relationEdges(props, titles) {
  return (Array.isArray(props?.links) ? props.links : [])
    .map((link) => link ?? {})
    .map((link) => ({
      from: relationIndex(link.from, titles),
      to: relationIndex(link.to, titles),
      dashed: link.style === "dashed",
      both: link.direction === "both",
      label: typeof link.label === "string" ? link.label : "",
    }))
    .filter((link) => link.from >= 0 && link.to >= 0 && link.from !== link.to);
}

/** Each node's outgoing edges as text, for narrow screens and screen readers. A both-way edge counts for both ends. */
/** @param {RelationEdge[]} edges @param {string[]} titles @returns {{ mark: string, to: string, label: string, dashed: boolean }[][]} */
export function relationLines(edges, titles) {
  /** @type {{ mark: string, to: string, label: string, dashed: boolean }[][]} */
  const lines = titles.map(() => []);
  for (const link of edges) {
    const mark = link.both ? (link.dashed ? "⇠⇢" : "↔") : link.dashed ? "⇢" : "→";
    lines[link.from].push({ mark, to: titles[link.to], label: link.label, dashed: link.dashed });
    if (link.both) lines[link.to].push({ mark, to: titles[link.from], label: link.label, dashed: link.dashed });
  }
  return lines;
}

/**
 * Where each node goes: `center` (0-based, or -1) sits in the middle, the rest
 * evenly on the outer ring, first on top, clockwise. Percent of the ring width;
 * `s` is the sine of the angle (vertical position, -1 top .. 1 bottom), 0 for the centre.
 */
export function relationLayout(n, centre = -1, compact = false) {
  const hasCentre = centre >= 0 && centre < n;
  const outer = hasCentre ? n - 1 : n;
  // With a node in the middle, narrower nodes leave the spokes room for arrows and labels.
  // Compact (narrow container): the same ring, with nodes a larger share of the width.
  const w = compact ? (hasCentre ? 26 : n <= 4 ? 34 : 30) : hasCentre ? 22 : n <= 4 ? 30 : 26;
  const rx = 50 - w / 2 - 1;
  const ring = [];
  let k = 0;
  const spots = Array.from({ length: n }, (_, i) => {
    if (i === centre && hasCentre) return { x: 50, s: 0, w, ring: -1 };
    const angle = -Math.PI / 2 + (k * 2 * Math.PI) / outer;
    ring.push(i);
    const spot = { x: 50 + rx * Math.cos(angle), s: Math.sin(angle), w, ring: k };
    k += 1;
    return spot;
  });
  return { spots, ring, outer, centre: hasCentre ? centre : -1 };
}

/**
 * Vertical placement from the measured node heights: the smallest radius that keeps
 * nodes apart, then the canvas is exactly as tall as the nodes need.
 * Only nodes whose columns overlap need vertical room between them.
 * `minRy` keeps the ring round enough for arrows and labels to have room.
 * @param {{ s: number, x: number, w: number }[]} spots @param {number[]} heights @param {number} gap @param {number} minRy
 */
export function relationHeights(spots, heights, gap = 36, minRy = 60) {
  let ry = minRy;
  for (let i = 0; i < spots.length; i += 1) {
    for (let j = i + 1; j < spots.length; j += 1) {
      const ds = Math.abs(spots[i].s - spots[j].s);
      if (ds < 1e-6) continue;
      if (Math.abs(spots[i].x - spots[j].x) >= (spots[i].w + spots[j].w) / 2 + 2) continue;
      ry = Math.max(ry, ((heights[i] + heights[j]) / 2 + gap) / ds);
    }
  }
  ry = Math.min(ry, 280);
  const top = Math.min(...spots.map((spot, i) => spot.s * ry - heights[i] / 2));
  const ys = spots.map((spot) => spot.s * ry - top);
  const height = Math.max(...spots.map((spot, i) => ys[i] + heights[i] / 2));
  return { ys, height, ry };
}

/** Intersection point of segments p1-p2 and q1-q2, or null. */
export function crossing(p1, p2, q1, q2) {
  const d = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / d;
  const u = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / d;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

/**
 * Label positions: the midpoint, unless a crossing with another line (or an earlier
 * label) is within `clear` px; then slide along the line to the nearest clear spot.
 * @param {{ at: (t: number) => { x: number, y: number }, a: object, b: object, label: string }[]} lines
 */
export function placeLabels(lines, clear = 34) {
  const points = [];
  lines.forEach((line, i) => lines.forEach((other, j) => {
    if (j <= i) return;
    const hit = crossing(line.a, line.b, other.a, other.b);
    if (hit) points.push(hit);
  }));
  const placed = [];
  const steps = [0.5, 0.42, 0.58, 0.34, 0.66, 0.27, 0.73, 0.2, 0.8];
  return lines.map((line) => {
    if (!line.label) return null;
    let best = line.at(0.5);
    let bestRoom = -1;
    for (const t of steps) {
      const p = line.at(t);
      const room = Math.min(Infinity, ...points.map((q) => Math.hypot(p.x - q.x, p.y - q.y)), ...placed.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
      if (room >= clear) { best = p; bestRoom = room; break; }
      if (room > bestRoom) { best = p; bestRoom = room; }
    }
    placed.push(best);
    return best;
  });
}

/** Hard floors after scaling (px). */
export const RELATION_NODE_FONT_MIN = 13;
export const RELATION_LABEL_FONT_MIN = 12;
/** Below this container width the graph uses the compact node size (same layout, scaled). */
export const RELATION_COMPACT_WIDTH = 560;

/** ①, ②, … ⑳ for edge labels that are moved under the graph. */
export function circled(i) {
  return i < 20 ? String.fromCharCode(0x2460 + i) : `(${i + 1})`;
}

/**
 * Does a one-line label of `width` x `height` px fit on the segment a-b at point p?
 * It must leave room for both arrowheads and must not touch any node box.
 */
export function labelFits({ width, height }, a, b, p, boxes, margin = 4) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  // Measure along the line: the label's extent in the line's direction.
  const ux = length ? Math.abs(b.x - a.x) / length : 1;
  const uy = length ? Math.abs(b.y - a.y) / length : 0;
  const along = width * ux + height * uy;
  if (along + 2 * 14 > length) return false;
  const box = { x: p.x - width / 2 - margin, y: p.y - height / 2 - margin, w: width + 2 * margin, h: height + 2 * margin };
  return !boxes.some((n) => box.x < n.x + n.w && box.x + box.w > n.x && box.y < n.y + n.h && box.y + box.h > n.y);
}

/** "① 依赖：A → B" / "① depends: A → B" */
export function legendLine(index, edge, titles, lang = "zh") {
  const arrow = edge.both ? "↔" : "→";
  const sep = lang === "en" ? ": " : "：";
  return `${circled(index)} ${edge.label}${sep}${titles[edge.from]} ${arrow} ${titles[edge.to]}`;
}
