/**
 * Turns ```doc-playground JSON fences in handbook pages into `<garden-playground>`
 * custom elements, keeping the interactive playground bundle out of blog builds.
 */
export function remarkDocPlayground() {
  return (tree) => {
    const walk = (node) => {
      if (!Array.isArray(node?.children)) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child?.type !== "code") return child;
        if (String(child.lang || "").toLowerCase() !== "doc-playground") return child;
        return {
          type: "docPlayground",
          data: {
            hName: "garden-playground",
            hProperties: {
              dataSpec: encodeURIComponent(String(child.value ?? "")),
            },
          },
          children: [],
        };
      });
    };
    walk(tree);
  };
}
