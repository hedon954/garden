// Dark fallback for pages without JavaScript.
//
// The theme script sets <html data-theme> before first paint. With scripting
// off nothing sets it, so the page would stay light on a dark system. Every
// rule written for `:root[data-theme="dark"]` or `html[data-theme="dark"]`
// gets a twin right after it, inside `@media (prefers-color-scheme: dark)`,
// that matches the root when it has no data-theme at all. The dark styles are
// written once; a theme the user picked (data-theme set) always wins, and
// the twin keeps the original specificity and source order.
//
// Any other use of data-theme that would leave a no-JS dark page wrong stops
// the build with an error naming the selector, instead of being skipped.

export const MEDIA = "(prefers-color-scheme: dark)";
const DARK_ROOT = /^(:root|html)\[data-theme=(["']?)dark\2\]/;
const ANY_THEME = /\[data-theme(?:([~|^$*]?=)\s*(["']?)([^"'\]]*)\2)?\s*\]/g;

/**
 * Sort one selector (no commas):
 * - "dark": starts with the dark root, gets a twin;
 * - "other": no data-theme on the page root's dark side (light root, scoped
 *   components such as `.garden-ui-preview[data-theme="dark"]`), left alone;
 * - throws for forms the twin cannot cover.
 * `siblings` are the other selectors of the same rule.
 */
export function classify(selector, siblings = []) {
  const value = selector.trim();
  if (!value.includes("data-theme")) return "other";
  const uses = [...value.matchAll(ANY_THEME)];
  let dark = false;
  for (const use of uses) {
    const [whole, op, , theme] = use;
    const before = value.slice(0, use.index);
    const compound = before.match(/[^\s>+~(]*$/)[0];
    if (op && op !== "=") throw new Error(`unsupported data-theme operator "${whole}" in "${value}"`);
    if (!op) throw new Error(`data-theme without a value ("${whole}") in "${value}"`);
    if (/:not\($/.test(before)) throw new Error(`negated theme "${whole}" in "${value}": write the dark case as a [data-theme="dark"] rule instead`);
    if (theme !== "dark" && theme !== "light") throw new Error(`unknown theme "${theme}" in "${value}"`);
    const isRoot = compound === ":root" || compound === "html";
    if (isRoot) {
      if (before !== compound) throw new Error(`root theme selector must start the selector: "${value}"`);
      if (theme === "dark") dark = true;
      continue;
    }
    if (compound === "") {
      // Bare `[data-theme="dark"] .x` also matches the page root. Allowed only
      // when the same rule lists the root form, whose twin covers the page.
      const rest = value.slice(use.index + whole.length);
      const covered = siblings.some((other) => other !== value && DARK_ROOT.test(other.trim()) && other.trim().replace(DARK_ROOT, "") === rest);
      if (theme === "dark" && !covered) throw new Error(`bare "${whole}" in "${value}" also matches the page root; list ":root${whole}${rest}" in the same rule`);
      continue;
    }
    if (/^[.#]/.test(compound)) continue; // scoped component with its own data-theme
    throw new Error(`unsupported data-theme selector "${compound}${whole}" in "${value}"`);
  }
  return dark ? "dark" : "other";
}

/** `html[data-theme="dark"] .x` → `html:not([data-theme]) .x`. */
export function fallbackSelector(selector) {
  const value = selector.trim();
  return DARK_ROOT.test(value) ? value.replace(DARK_ROOT, (_, root) => `${root}:not([data-theme])`) : null;
}

export default function darkFallback() {
  return {
    postcssPlugin: "garden-dark-fallback",
    OnceExit(root, { AtRule }) {
      root.walkRules((rule) => {
        if (rule.parent?.type === "atrule" && rule.parent.name === "media" && rule.parent.params === MEDIA) return;
        if (!rule.selector.includes("data-theme")) return;
        const parts = rule.selectors;
        const twins = [];
        for (const part of parts) {
          let kind;
          try {
            kind = classify(part, parts);
          } catch (error) {
            throw rule.error(`garden dark fallback: ${error.message}`, { word: part.trim() });
          }
          if (kind === "dark") twins.push(fallbackSelector(part));
        }
        if (!twins.length) return;
        const next = rule.next();
        if (next?.type === "atrule" && next.name === "media" && next.params === MEDIA) return; // already has its twin
        const media = new AtRule({ name: "media", params: MEDIA });
        media.append(rule.clone({ selectors: twins }));
        rule.after(media);
      });
    },
  };
}
darkFallback.postcss = true;
