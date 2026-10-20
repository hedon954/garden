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

/** Node centres on the circle, in percent of the ring: the first node on top, then clockwise. */
export function relationSpots(n) {
  const w = n <= 4 ? 30 : 26;
  const rx = 50 - w / 2 - 1;
  const ry = 38;
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: 50 + rx * Math.cos(angle), y: 50 + ry * Math.sin(angle), w };
  });
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
