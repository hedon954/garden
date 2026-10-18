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
 * links, the links stay as they are and only the first stretch of text between
 * them becomes the self-link; the rest stays plain heading text. The heading gets
 * .h-split, and CSS stretches that one self-link over the whole heading, so a
 * click anywhere on it still jumps, while there is one tab stop and one link to
 * the heading for assistive tech, and hover and focus read as one heading.
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

const hasContent = (nodes) => nodes.some((node) => node.type !== "text" || node.value.trim() !== "");

/**
 * Children of a heading (or of an element inside one) with the first link-free
 * stretch that has visible content wrapped in the self-link. `state.done` is
 * shared across the recursion so only one self-link is made per heading.
 */
function wrapFirstRun(children, id, className, state) {
  const out = [];
  let run = [];
  const flush = () => {
    if (!state.done && hasContent(run)) {
      out.push(selfLink(id, run, className));
      state.done = true;
    } else {
      out.push(...run);
    }
    run = [];
  };
  for (const child of children) {
    if (!containsLink(child)) {
      run.push(child);
      continue;
    }
    flush();
    // A link stays a link; an element holding a link (**[x](url)**) is split inside.
    out.push(isElement(child, "a") ? child : { ...child, children: wrapFirstRun(child.children ?? [], id, className, state) });
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
        if (containsLink(child)) {
          child.children = wrapFirstRun(child.children, id, className, { done: false });
          child.properties.className = [...[].concat(child.properties.className ?? []), "h-split"];
        } else {
          child.children = [selfLink(id, child.children, className)];
        }
      } else {
        visit(child);
      }
    }
  };
  return (tree) => visit(tree);
}
