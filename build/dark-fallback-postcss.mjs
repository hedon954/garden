// Dark fallback for pages without JavaScript.
//
// The theme script sets <html data-theme> before first paint. With scripting
// off nothing sets it, so the page would stay light on a dark system. Every
// rule written for `:root[data-theme="dark"]` or `html[data-theme="dark"]`
// gets a twin right after it, inside `@media (prefers-color-scheme: dark)`,
// that matches the root when it has no data-theme at all. The dark styles are
// written once; a theme the user picked (data-theme set) always wins, and
// the twin keeps the original specificity and source order.

const DARK_ROOT = /(:root|html)\[data-theme=(["']?)dark\2\]/g;
const MEDIA = "(prefers-color-scheme: dark)";

/** `html[data-theme="dark"] .x` → `html:not([data-theme]) .x`; null if not a dark-root selector. */
export function fallbackSelector(selector) {
  if (!new RegExp(DARK_ROOT.source).test(selector)) return null;
  return selector.replace(DARK_ROOT, (_, root) => `${root}:not([data-theme])`);
}

export default function darkFallback() {
  return {
    postcssPlugin: "garden-dark-fallback",
    OnceExit(root, { AtRule }) {
      root.walkRules((rule) => {
        if (rule.parent?.type === "atrule" && rule.parent.name === "media" && rule.parent.params === MEDIA) return;
        if (!rule.selector.includes("data-theme")) return;
        const parts = rule.selectors;
        // A list that already includes the plain root covers pages without a theme.
        if (parts.some((part) => part === ":root" || part === "html")) return;
        const twins = [...new Set(parts.map(fallbackSelector).filter(Boolean))];
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
