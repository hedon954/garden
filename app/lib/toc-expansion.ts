export type TocHeading = { depth: number; text: string; id: string; no?: string };
export type TocNode = TocHeading & { children: TocNode[] };
export type TocExpansion =
  | { mode: "follow" }
  | { mode: "all" }
  | { mode: "manual"; expanded: ReadonlySet<string> };

export function nestHeadings(headings: readonly TocHeading[]): TocNode[] {
  const roots: TocNode[] = [], stack: TocNode[] = [];
  for (const heading of headings) {
    const node: TocNode = { ...heading, children: [] };
    let parent = stack.at(-1);
    while (parent && parent.depth >= node.depth) {
      stack.pop();
      parent = stack.at(-1);
    }
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

// The nearest shallower heading is the parent even when heading ranks skip.
// Opening only this path exposes the current heading and its immediate children.
export function expandedTocSections(tree: readonly TocNode[], state: TocExpansion, activeId?: string): ReadonlySet<string> {
  if (state.mode === "manual") return state.expanded;
  const expanded = new Set<string>();
  function visit(nodes: readonly TocNode[]): boolean {
    let containsActive = false;
    for (const node of nodes) {
      const onPath = visit(node.children) || node.id === activeId;
      if (node.children.length && (state.mode === "all" || onPath)) expanded.add(node.id);
      containsActive ||= onPath;
    }
    return containsActive;
  }
  visit(tree);
  return expanded;
}

// An individual disclosure is an explicit manual browsing choice. Freeze the
// current visible branches instead of fighting the next scroll-spy update.
export function toggleTocSection(expanded: ReadonlySet<string>, id: string): TocExpansion {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return { mode: "manual", expanded: next };
}
