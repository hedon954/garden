import { classifyFence } from "../../ui/garden/parse.mjs";

/**
 * Component reference pages: every garden fence becomes a demo that shows its
 * source and the real rendered block side by side. Runs before remarkGarden,
 * which then turns the second child into the block.
 */
/**
 * The whole fence as the author writes it: info line (with any `#id`), the
 * body, and the closing marker, so copying it reproduces the block. A `garden
 * file` body was replaced by built `resolved:` data; show the original YAML.
 */
function fenceSource(child, block) {
  const resolvedSource = block?.props?.resolved?.source;
  const body = typeof resolvedSource === "string" ? resolvedSource : String(child.value ?? "");
  const info = `${child.lang || ""} ${child.meta || ""}`.trim();
  const longest = Math.max(2, ...(body.match(/`{3,}/gu) || []).map((run) => run.length));
  const marker = "`".repeat(longest + 1);
  return `${marker}${info}\n${body}\n${marker}`;
}

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
          children: [{ type: "code", lang: "markdown", meta: null, value: fenceSource(child, kind.block) }, child],
        };
      });
    };
    walk(tree);
  };
}
