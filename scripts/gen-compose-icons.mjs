import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const iconsDir = process.argv[2] || process.env.LUCIDE_ICONS_DIR || "/tmp/lucide-gen/package/dist/esm/icons";
const outFile = process.argv[3] || path.resolve("ui/compose/icons.mjs");
if (!fs.existsSync(iconsDir)) {
  console.error("missing Lucide icons dir:", iconsDir);
  console.error("usage: node scripts/gen-compose-icons.mjs <lucide-esm-icons-dir> [outFile]");
  process.exit(1);
}

const available = new Set(
  fs.readdirSync(iconsDir).filter((f) => f.endsWith(".mjs") && !f.endsWith(".map")).map((f) => f.slice(0, -4)),
);

const ALIASES = {
  "check-circle": "circle-check",
  "x-circle": "circle-x",
  "minus-circle": "circle-minus",
  "plus-circle": "circle-plus",
  alert: "triangle-exclamation-point",
  "alert-triangle": "triangle-exclamation-point",
  "alert-circle": "circle-exclamation-point",
  "alert-octagon": "octagon-exclamation-point",
  warning: "triangle-exclamation-point",
  "help-circle": "circle-question-mark",
  "circle-info": "info",
  home: "house",
  filter: "list-filter",
  unlock: "lock-open",
  "layers-3": "layers",
  "building-2": "building-complex",
  "file-json": "file-code",
  "terminal-square": "square-terminal",
  music: "list-music",
  history: "clock-arrow-up",
  "trash-2": "trash",
  fingerprint: "fingerprint-pattern",
  "badge-alert": "badge-exclamation-point",
  "shield-alert": "shield-exclamation-point",
  more: "ellipsis",
  "more-horizontal": "ellipsis",
  "more-vertical": "ellipsis-vertical",
  edit: "pencil",
  close: "x",
  success: "circle-check",
  error: "circle-x",
  danger: "octagon-exclamation-point",
  "sort-asc": "arrow-up-narrow-wide",
  "sort-desc": "arrow-down-wide-narrow",
  funnel: "list-filter",
  fullscreen: "maximize",
  "bar-chart-2": "chart-no-axes-column",
  "bar-chart-3": "chart-column",
  "line-chart": "chart-line",
  "pie-chart": "chart-pie",
  loader: "loader-circle",
  robot: "bot",
  "globe-2": "globe",
  parenthesis: "parentheses",
  github: "git-branch",
  parenthes: "parentheses",
};

const CURATED = `
check check-circle check-check circle-check circle-x x x-circle
minus minus-circle plus plus-circle lock lock-open lock-keyhole
shield shield-check shield-off shield-x key key-round badge-check badge-info
arrow-down arrow-up arrow-left arrow-right
arrow-down-left arrow-down-right arrow-up-left arrow-up-right
chevron-down chevron-up chevron-left chevron-right
chevrons-down chevrons-up chevrons-left chevrons-right
corner-down-left corner-down-right corner-up-left corner-up-right
undo redo rotate-cw rotate-ccw refresh-cw refresh-ccw
layers layers-2 layout-grid layout-list layout-dashboard
panel-left panel-right panel-top panel-bottom columns-2 columns-3
rows-2 rows-3 grid-2x2 grid-3x3 separator-horizontal separator-vertical
user user-round users users-round user-check user-x user-plus user-minus user-cog
contact id-card building briefcase handshake crown
mail mail-open send send-horizontal inbox message-circle message-square
messages-square phone phone-call phone-off bell bell-off bell-ring megaphone at-sign reply forward
file file-text file-code file-plus file-minus file-check file-x files
folder folder-open folder-plus folder-minus folder-git
code code-xml terminal braces brackets parentheses
git-branch git-commit-horizontal git-merge git-pull-request
package package-open box boxes archive clipboard clipboard-check clipboard-list clipboard-copy
copy scissors paperclip
image images camera video film mic mic-off volume-2 volume-x
play pause square circle circle-play circle-pause skip-forward skip-back
download upload cloud cloud-download cloud-upload cloud-off
hard-drive server database cpu monitor smartphone tablet laptop printer
wifi wifi-off bluetooth cast radio
search settings settings-2 sliders-horizontal sliders-vertical
menu ellipsis ellipsis-vertical
list list-ordered list-checks pin pin-off map map-pin compass globe earth navigation
external-link link link-2 unlink share share-2 qr-code
calendar calendar-check calendar-clock calendar-days calendar-range
clock clock-3 timer hourglass alarm-clock
credit-card wallet banknote receipt shopping-cart shopping-bag tag tags percent dollar-sign coins
heart heart-off star sparkles zap zap-off flame leaf flower-2
sun moon cloud-sun cloud-moon umbrella droplet wind snowflake
bug bot brain lightbulb puzzle target flag bookmark bookmark-check
eye eye-off trash pencil pen pen-line eraser highlighter paintbrush palette
info ban power log-in log-out scan scan-line activity trending-up trending-down
gauge loader-circle circle-dashed dot grip-vertical grip-horizontal
maximize minimize maximize-2 minimize-2 expand shrink
crosshair aperture focus hash equal slash asterisk
house house-plus list-filter
triangle-exclamation-point circle-exclamation-point octagon-exclamation-point
circle-question-mark shield-exclamation-point fingerprint-pattern
square-terminal file-type chart-column chart-line chart-pie chart-no-axes-column
arrow-up-narrow-wide arrow-down-wide-narrow wand-sparkles
alert alert-triangle alert-circle alert-octagon help-circle home filter unlock
layers-3 building-2 file-json terminal-square music history trash-2 fingerprint
badge-alert shield-alert more more-horizontal more-vertical edit close success error danger
sort-asc sort-desc funnel fullscreen bar-chart-2 bar-chart-3 line-chart pie-chart loader
robot globe-2 github
`.trim().split(/\s+/);

const PREFIXES = [
  "arrow-","chevron","file-","folder-","user","mail","message","phone","calendar","clock",
  "cloud","book","bell","shield","lock","key","heart","star","sun","moon","wifi","server",
  "database","monitor","laptop","tablet","smartphone","download","upload","share","link",
  "map","pin","flag","tag","badge","chart","git-","package","clipboard","image","camera",
  "video","mic","volume","play","pause","skip","settings","search","house","list","grid",
  "layout","panel","columns","rows","layers","box","archive","copy","scissors","eye","trash",
  "pencil","pen","palette","zap","flame","leaf","bug","bot","brain","lightbulb","puzzle",
  "target","bookmark","log-","power","scan","activity","trending","gauge","loader","maximize",
  "minimize","expand","shrink","grip","hash","equal","slash","asterisk","info","ban","circle",
  "square","triangle","octagon","dot","sparkle","wand","droplet","wind","snow","umbrella",
  "coin","wallet","credit","receipt","shopping","percent","dollar","banknote","send","inbox",
  "reply","forward","megaphone","handshake","briefcase","building","crown","contact","id-",
  "fingerprint","qr-","compass","globe","earth","navigation","external","unlink","radio",
  "bluetooth","cast","cpu","hard-","printer","film","aperture","focus","crosshair","alarm",
  "timer","hourglass","rotate","refresh","undo","redo","move","corner","separator","menu",
  "ellipsis","sliders","filter","funnel","sort","home","music","history","github","robot",
];

function attrsToString(attrs) {
  return Object.entries(attrs || {})
    .filter(([k]) => k !== "key")
    .map(([k, v]) => `${k}="${String(v).replaceAll('"', "&quot;")}"`)
    .join(" ");
}

function nodesToInner(nodes) {
  return nodes.map(([tag, attrs]) => {
    const a = attrsToString(attrs);
    return a ? `<${tag} ${a}/>` : `<${tag}/>`;
  }).join("");
}

async function load(fileBase) {
  const file = path.join(iconsDir, `${fileBase}.mjs`);
  if (!fs.existsSync(file)) return null;
  const mod = await import(pathToFileURL(file).href);
  if (!Array.isArray(mod.default)) return null;
  return nodesToInner(mod.default);
}

function resolveFile(name) {
  if (available.has(name)) return name;
  if (ALIASES[name] && available.has(ALIASES[name])) return ALIASES[name];
  return null;
}

const paths = {};

for (const name of CURATED) {
  const f = resolveFile(name);
  if (!f) continue;
  const inner = await load(f);
  if (inner) paths[name] = inner;
}

for (const [alias, target] of Object.entries(ALIASES)) {
  if (paths[alias]) continue;
  if (!available.has(target)) continue;
  const inner = await load(target);
  if (inner) paths[alias] = inner;
}

const bulk = [...available].filter((n) => PREFIXES.some((p) => n === p || n.startsWith(p))).sort();
for (const name of bulk.slice(0, 450)) {
  if (paths[name]) continue;
  const inner = await load(name);
  if (inner) paths[name] = inner;
}

const names = Object.keys(paths);
console.log("total", names.length);
const critical = ["check","check-circle","x","x-circle","lock","lock-open","layers","shield","user","key","link","alert","info","sparkles","arrow-down","minus","home","filter","layers-3"];
console.log("critical missing", critical.filter((n) => !paths[n] && !ALIASES[n]));
console.log("critical ok", critical.every((n) => paths[n] || (ALIASES[n] && paths[ALIASES[n]]) || paths[ALIASES[n]]));

const body = `/**
 * Named SVG icons for garden compose.
 * Generated from Lucide (ISC) — viewBox 24×24, stroke currentColor.
 * Re-run: node /tmp/gen-icons.mjs (or scripts/gen-compose-icons.mjs).
 */

const PATHS = ${JSON.stringify(paths, null, 2)};

const ALIASES = ${JSON.stringify(ALIASES, null, 2)};

function resolve(name) {
  const key = String(name || "");
  if (Object.prototype.hasOwnProperty.call(PATHS, key)) return key;
  const alias = ALIASES[key];
  if (alias && Object.prototype.hasOwnProperty.call(PATHS, alias)) return alias;
  return "";
}

export const ICON_NAMES = Object.keys(PATHS).sort();
export const ICON_COUNT = ICON_NAMES.length;

export function hasIcon(name) {
  return Boolean(resolve(name));
}

/** Return SVG markup for a named icon, or empty string if unknown. */
export function iconSvg(name, { size = "md", inline = false } = {}) {
  const key = resolve(name);
  const path = PATHS[key];
  if (!path) return "";
  const sizeAttr = size && size !== "md" ? \` data-size="\${size}"\` : "";
  const inlineAttr = inline ? \` data-inline="true"\` : "";
  return \`<svg class="g-compose-icon" data-name="\${key}"\${sizeAttr}\${inlineAttr} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">\${path}</svg>\`;
}

export { PATHS as ICONS };
`;

fs.writeFileSync(outFile, body);
console.log("wrote", outFile, Math.round(body.length / 1024), "KB");
