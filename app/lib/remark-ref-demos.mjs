import { classifyFence } from "../../ui/garden/parse.mjs";

/**
 * Component reference pages: every garden fence becomes a demo that shows its
 * source and the real rendered block side by side. Runs before remarkGarden,
 * which then turns the second child into the block.
 */
export function remarkRefDemos() {
  return (tree) => {
    const walk = (node) => {
      if (!Array.isArray(node?.children)) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child?.type !== "code") return child;
        const lang = String(child.lang || "").toLowerCase();
        const meta = String(child.meta || "");
        const kind = classifyFence({ lang, meta, info: `${child.lang || ""} ${meta}`.trim(), body: child.value });
        if (kind.kind !== "garden" || !kind.block?.name) return child;
        return {
          type: "refDemo",
          data: { hName: "garden-refdemo", hProperties: { dataName: kind.block.name } },
          children: [{ type: "code", lang: "yaml", meta: null, value: child.value }, child],
        };
      });
    };
    walk(tree);
  };
}
