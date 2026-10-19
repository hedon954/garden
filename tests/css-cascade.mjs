// A small cascade for the built CSS: which declaration wins for a class at a
// given viewport width and scripting state. Enough for the header's own rules
// (classes, attributes, pseudo-classes, media features below); it throws on
// media features it does not know, so a new kind of rule is noticed.
import postcss from "postcss";
import { clientAssetText } from "./client-assets.mjs";

export function builtCss() {
  const css = clientAssetText(/\.css$/u);
  if (!css) throw new Error("no built CSS under dist/client/_next/static/: run the build first");
  return css;
}

const px = (value) => Number.parseFloat(value);

function feature(text, env) {
  const body = text.trim().replace(/^\(|\)$/gu, "").trim();
  let m;
  if ((m = body.match(/^max-width:\s*([\d.]+)px$/u))) return env.width <= px(m[1]);
  if ((m = body.match(/^min-width:\s*([\d.]+)px$/u))) return env.width >= px(m[1]);
  if ((m = body.match(/^width\s*(<=|<|>=|>)\s*([\d.]+)px$/u))) {
    const n = px(m[2]);
    return { "<=": env.width <= n, "<": env.width < n, ">=": env.width >= n, ">": env.width > n }[m[1]];
  }
  if ((m = body.match(/^([\d.]+)px\s*(<=|<)\s*width\s*(<=|<)\s*([\d.]+)px$/u))) {
    const lo = px(m[1]), hi = px(m[4]);
    return (m[2] === "<=" ? env.width >= lo : env.width > lo) && (m[3] === "<=" ? env.width <= hi : env.width < hi);
  }
  if ((m = body.match(/^scripting:\s*(none|enabled|initial-only)$/u))) return env.scripting === m[1];
  if ((m = body.match(/^prefers-color-scheme:\s*(dark|light)$/u))) return (env.scheme ?? "light") === m[1];
  if (/^prefers-reduced-motion:\s*reduce$/u.test(body) || /^forced-colors:\s*active$/u.test(body) || /^prefers-contrast:\s*more$/u.test(body)) return false;
  if (/^hover:\s*hover$/u.test(body) || /^pointer:\s*fine$/u.test(body)) return env.width > 820;
  throw new Error(`css-cascade: unknown media feature (${body})`);
}

export function mediaMatches(params, env) {
  return params.split(",").some((query) => {
    let q = query.trim();
    const negate = /^not\s/u.test(q);
    q = q.replace(/^(not|only)\s+/u, "");
    const parts = q.split(/\s+and\s+/u).map((part) => part.trim()).filter(Boolean);
    const ok = parts.every((part) => {
      if (/^(all|screen)$/u.test(part)) return true;
      if (part === "print") return false;
      if (/^not\s*\(/u.test(part)) return !feature(part.replace(/^not\s*/u, ""), env);
      return feature(part, env);
    });
    return negate ? !ok : ok;
  });
}

/** Selector parts that only apply in a state the caller has to ask for. */
const STATES = [":target", ".is-open", ":hover", ":focus", ":active", ":has(", "[aria-checked", "[aria-expanded", "[data-theme", ".is-scrolled", ":checked"];

function specificity(selector) {
  const plain = selector.replace(/::[\w-]+/gu, "");
  const ids = (plain.match(/#[\w-]+/gu) ?? []).length;
  const classes = (plain.match(/\.[\w-]+|\[[^\]]+\]|:(?!not\(|is\(|where\()[\w-]+/gu) ?? []).length;
  const types = (plain.replace(/\[[^\]]+\]|\([^)]*\)/gu, "").match(/(^|[\s>+~])[a-z][\w-]*/giu) ?? []).length;
  return ids * 10000 + classes * 100 + types;
}

/**
 * The winning value of `property` on an element with class `cls` (a string,
 * or every class the element carries, e.g. ["sh-icon", "sh-theme"]).
 * env: { width, scripting: "enabled" | "none", state?: string[] }.
 * Only selectors whose last compound uses nothing but those classes are considered, and only
 * when every state token they use is listed in env.state.
 */
export function winning(css, cls, property, env) {
  const classes = new Set([cls].flat());
  const own = (compound) => {
    const used = (compound.replace(/\([^)]*\)/gu, "").match(/\.[\w-]+/gu) ?? []).map((name) => name.slice(1)).filter((name) => !STATES.includes(`.${name}`));
    return used.length > 0 && used.every((name) => classes.has(name)) && !/^[a-z]/iu.test(compound);
  };
  const state = env.state ?? [];
  let best = null;
  let order = 0;
  postcss.parse(css).walkRules((rule) => {
    order += 1;
    const decls = rule.nodes.filter((node) => node.type === "decl" && node.prop === property);
    if (!decls.length) return;
    const applies = () => {
      for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
        if (parent.type === "atrule" && parent.name === "media" && !mediaMatches(parent.params, env)) return false;
        if (parent.type === "atrule" && parent.name !== "media" && parent.name !== "layer") return false;
      }
      return true;
    };
    for (const selector of rule.selectors) {
      const compounds = selector.trim().split(/\s*[\s>+~]\s*(?![^(]*\))/u);
      const last = compounds.at(-1) ?? "";
      if (!own(last) || /::/u.test(last)) continue;
      if (STATES.some((token) => selector.includes(token) && !state.includes(token))) continue;
      if (!applies()) return;
      const decl = decls.at(-1);
      const rank = [decl.important ? 1 : 0, specificity(selector), order];
      if (!best || rank[0] > best.rank[0] || (rank[0] === best.rank[0] && (rank[1] > best.rank[1] || (rank[1] === best.rank[1] && rank[2] >= best.rank[2])))) {
        best = { rank, value: decl.value, selector: selector.trim(), media: mediaOf(rule) };
      }
    }
  });
  return best;
}

function mediaOf(rule) {
  const out = [];
  for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) if (parent.type === "atrule") out.unshift(`@${parent.name} ${parent.params}`);
  return out.join(" ");
}
