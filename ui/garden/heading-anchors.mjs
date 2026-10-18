/**
 * Self-links on article headings (h2–h4 with an id): the heading text links to
 * its own #id, styled by .h-anchor.
 *
 * rehype-autolink-headings with behavior "wrap" put the whole heading inside one
 * <a>. A heading that itself contains a link then becomes <a><a>…</a></a>, which
 * HTML does not allow: the browser's parser closes the outer anchor when it meets
 * the inner one, so the page it builds from the server HTML no longer matches
 * what React renders, and hydration fails (React #418).
 *
 * Here a heading without links is wrapped whole, as before. In a heading with
 * links, each stretch of text between the links gets its own self-link and the
 * links stay as they are, so no anchor ever sits inside another.
 */
const HEADINGS = new Set(["h2", "h3", "h4"]);

const isElement = (node, tagName) => node?.type === "element" && (!tagName || node.tagName === tagName);

/** Does this node have an <a> in it (or is one)? */
export function containsLink(node) {
  if (isElement(node, "a")) return true;
  return Array.isArray(node?.children) && node.children.some(containsLink);
}

const selfLink = (id, children, className) => ({
  type: "element",
  tagName: "a",
  properties: { href: `#${id}`, className: [...className] },
  children,
});

/** Children of a heading (or of an element inside one) with every link-free stretch wrapped in a self-link. */
function wrapRuns(children, id, className) {
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length && run.some((node) => node.type !== "text" || node.value !== "")) out.push(selfLink(id, run, className));
    run = [];
  };
  for (const child of children) {
    if (!containsLink(child)) {
      run.push(child);
      continue;
    }
    flush();
    // A link stays a link; an element holding a link (**[x](url)**) is split inside.
    out.push(isElement(child, "a") ? child : { ...child, children: wrapRuns(child.children ?? [], id, className) });
  }
  flush();
  return out;
}

export function rehypeHeadingAnchors({ className = ["h-anchor"] } = {}) {
  const visit = (node) => {
    if (!Array.isArray(node.children)) return;
    for (const child of node.children) {
      if (isElement(child) && HEADINGS.has(child.tagName) && child.properties?.id) {
        const id = String(child.properties.id);
        child.children = containsLink(child)
          ? wrapRuns(child.children, id, className)
          : [selfLink(id, child.children, className)];
      } else {
        visit(child);
      }
    }
  };
  return (tree) => visit(tree);
}
