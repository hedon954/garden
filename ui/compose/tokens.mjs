/**
 * Design tokens for garden compose (Claude paper surfaces + 4px spacing).
 * Authors/AI pick semantic names; CSS maps them onto theme variables.
 */

export const SPACING = new Set(["0", "1", "2", "3", "4"]);
/** 4px × n — ChatGPT-aligned scale. */
export const SPACING_PX = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16 };

export const RADII = new Set(["none", "sm", "md", "lg", "xl", "full"]);
export const SIZES = new Set(["sm", "md", "lg", "xl"]);
export const BACKGROUNDS = new Set([
  "surface",
  "surface-secondary",
  "surface-accent",
  "surface-tip",
  "surface-muted",
  "paper",
  "well",
  "transparent",
]);
export const ALIGNS = new Set(["start", "center", "end", "stretch"]);
export const JUSTIFIES = new Set(["start", "center", "end", "between", "around"]);
export const BORDERS = new Set(["true", "false", "subtle", "none", "strong"]);
export const TONES = new Set(["plain", "accent", "tip", "muted"]);
export const WRAPS = new Set(["true", "false", "wrap", "nowrap"]);

export function spacingAttr(value, fallback = null) {
  if (value == null || value === true || value === "") return fallback;
  const key = String(value);
  if (!SPACING.has(key)) return null; // signal invalid to caller
  return Number(key);
}

export function enumOr(value, allowed, fallback) {
  if (value == null || value === true || value === "") return fallback;
  const key = String(value);
  return allowed.has(key) ? key : null;
}

export function boolish(value, fallback = false) {
  if (value == null || value === "") return fallback;
  if (value === true || value === "true" || value === "") return true;
  if (value === false || value === "false" || value === "none") return false;
  return String(value);
}
