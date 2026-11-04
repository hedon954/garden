/**
 * Named SVG icons for garden compose.
 * Stroke icons, currentColor, 16×16 viewBox.
 * Keep names stable — recipes and docs cite them.
 */

function make(path) {
  return path;
}

const PATHS = {
  check: `<path d="M3.5 8.2 6.6 11.2 12.5 4.8"/>`,
  "check-circle": `<circle cx="8" cy="8" r="6.2"/><path d="M5.2 8.1 7.2 10 10.8 5.9"/>`,
  x: `<path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8"/>`,
  "x-circle": `<circle cx="8" cy="8" r="6.2"/><path d="M5.5 5.5 10.5 10.5M10.5 5.5 5.5 10.5"/>`,
  lock: `<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7"/>`,
  "lock-open": `<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 4.7-1.2"/>`,
  "arrow-down": `<path d="M8 3v9.2M4.6 9.2 8 12.5 11.4 9.2"/>`,
  "arrow-right": `<path d="M3 8h9.2M9.2 4.6 12.5 8 9.2 11.4"/>`,
  "arrow-left": `<path d="M13 8H3.8M6.8 4.6 3.5 8 6.8 11.4"/>`,
  "arrow-up": `<path d="M8 13V3.8M4.6 6.8 8 3.5 11.4 6.8"/>`,
  layers: `<path d="M8 2.4 13.5 5.2 8 8 2.5 5.2 8 2.4z"/><path d="M2.5 8.2 8 11 13.5 8.2"/><path d="M2.5 10.8 8 13.6 13.5 10.8"/>`,
  shield: `<path d="M8 1.6 13.2 3.7v4.2c0 3-2.2 5.1-5.2 6.5-3-1.4-5.2-3.5-5.2-6.5V3.7L8 1.6z"/><path d="M5.5 8.1 7.2 9.8 10.6 6.2"/>`,
  user: `<circle cx="8" cy="5.2" r="2.4"/><path d="M3.2 13.2c.6-2.4 2.4-3.6 4.8-3.6s4.2 1.2 4.8 3.6"/>`,
  key: `<circle cx="5.6" cy="8" r="2.6"/><path d="M7.8 8h5.4M10.6 8v2.2M12.4 8v1.5"/>`,
  link: `<path d="M6.4 9.6 9.6 6.4"/><path d="M7.2 11.6c-1.4 1.4-3.5 1.3-4.7.1s-1.3-3.3.1-4.7l1.6-1.6"/><path d="M8.8 4.4c1.4-1.4 3.5-1.3 4.7-.1s1.3 3.3-.1 4.7l-1.6 1.6"/>`,
  alert: `<path d="M8 2.4 14.2 13.2H1.8L8 2.4z"/><path d="M8 6.4v3.2M8 11.4h.01"/>`,
  info: `<circle cx="8" cy="8" r="6.2"/><path d="M8 7.2V11.2M8 5.2h.01"/>`,
  sparkles: `<path d="M8 2.2v2.6M8 11.2v2.6M2.2 8h2.6M11.2 8h2.6"/><path d="M4.4 4.4l1.6 1.6M10 10l1.6 1.6M11.6 4.4 10 6M6 10l-1.6 1.6"/>`,
};

export const ICON_NAMES = Object.keys(PATHS);

export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(PATHS, String(name || ""));
}

/** Return SVG markup for a named icon, or empty string if unknown. */
export function iconSvg(name, { size = "md", inline = false } = {}) {
  const key = String(name || "");
  const path = PATHS[key];
  if (!path) return "";
  const sizeAttr = size && size !== "md" ? ` data-size="${size}"` : "";
  const inlineAttr = inline ? ` data-inline="true"` : "";
  return `<svg class="g-compose-icon" data-name="${key}"${sizeAttr}${inlineAttr} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

export { PATHS as ICONS, make };
