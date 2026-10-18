/**
 * Tag nesting that the HTML parser silently repairs. The browser then builds a
 * different tree from the server HTML than the one React renders, and
 * hydration fails (React #418): <a> inside <a>, a block element inside <p>,
 * <button> inside <button>, <form> inside <form>.
 *
 * A small tag scanner, enough for HTML the site renders itself: it skips
 * comments, raw text (script, style, textarea, title) and <template>/<svg>/<math>
 * content, and returns each problem with a little context.
 */
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title", "noscript"]);
const FOREIGN = new Set(["svg", "math", "template"]);
// Start tags that close an open <p> (HTML "in body" rules).
const CLOSES_P = new Set([
  "address", "article", "aside", "blockquote", "details", "dialog", "div", "dl", "fieldset", "figcaption", "figure",
  "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "menu", "nav", "ol", "p",
  "pre", "section", "summary", "table", "ul",
]);
const SELF_NESTING = new Set(["a", "button", "form"]);

export function findInvalidNesting(html) {
  const problems = [];
  const stack = [];
  const tag = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gu;
  let match;
  while ((match = tag.exec(html))) {
    if (match[0].startsWith("<!--")) continue;
    const closing = match[1] === "/";
    const name = match[2].toLowerCase();
    const selfClosing = /\/\s*$/u.test(match[3]);
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at !== -1) stack.length = at;
      continue;
    }
    const context = () => html.slice(Math.max(0, match.index - 160), match.index + 160).replace(/\s+/gu, " ");
    if (SELF_NESTING.has(name) && stack.includes(name)) problems.push({ problem: `<${name}> inside <${name}>`, context: context() });
    if (CLOSES_P.has(name) && stack.includes("p") && !stack.slice(stack.lastIndexOf("p")).some((open) => open === "button")) {
      problems.push({ problem: `<${name}> inside <p>`, context: context() });
    }
    if (VOID.has(name) || selfClosing) continue;
    if (RAW.has(name) || FOREIGN.has(name)) {
      // Skip to the matching end tag: nothing inside is ordinary page markup.
      const end = new RegExp(`</${name}\\s*>`, "giu");
      end.lastIndex = tag.lastIndex;
      const found = end.exec(html);
      tag.lastIndex = found ? end.lastIndex : html.length;
      continue;
    }
    stack.push(name);
  }
  return problems;
}
