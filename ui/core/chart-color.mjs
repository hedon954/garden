/**
 * Bar/point fill class for a chart series.
 * palette=categorical always uses per-category swatches (garden-ui-cat-N).
 * A series-level tone="accent" (legend swatch / series palette) must NOT flatten
 * every category to one color — that was the fusion regression vs tip 08512249.
 */
export function barColorClass(palette, seriesTone, index, rowTone) {
  if (palette === "categorical") return `garden-ui-cat-${index % 8}`;
  if (typeof rowTone === "string" && rowTone) return `garden-ui-series-${rowTone}`;
  return `garden-ui-series-${seriesTone}`;
}
