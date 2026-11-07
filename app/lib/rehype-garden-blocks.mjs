const FLOW_TAGS = new Set(['garden-block', 'garden-refdemo', 'garden-codediff']);

/** Custom elements are phrasing content to the HTML parser, but render as flow.
 * Lift them before React renders them into figures/divs inside a paragraph. */
export function rehypeGardenBlocks() {
  return tree => {
    function visit(parent) {
      if (!Array.isArray(parent.children)) return;
      parent.children = parent.children.flatMap(node => {
        visit(node);
        if (node.type !== 'element' || node.tagName !== 'p' || !node.children.some(child => child.type === 'element' && FLOW_TAGS.has(child.tagName))) return [node];
        const result = [];
        let prose = [];
        const flush = () => {
          if (prose.some(child => child.type !== 'text' || child.value.trim())) result.push({...node, children:prose});
          prose = [];
        };
        for (const child of node.children) {
          if (child.type === 'element' && FLOW_TAGS.has(child.tagName)) {
            flush();
            result.push(child);
          } else prose.push(child);
        }
        flush();
        return result;
      });
    }
    visit(tree);
  };
}
