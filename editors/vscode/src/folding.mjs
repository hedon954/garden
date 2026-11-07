import { findBlocks } from "../../../ui/core/fence.mjs";

/** Closed Garden fences only; reuse the engine scanner, including outer-fence shielding. */
export function gardenFoldRanges(markdown) {
  return findBlocks(markdown)
    .filter((fence) => fence.closed && fence.endLine > fence.startLine)
    .map((fence) => ({ start: fence.startLine - 1, end: fence.endLine - 1 }));
}

/** Use native Markdown folding, without replacing its heading/list/fence provider or editing text. */
export async function runGardenFold({ markdown, line, action, all, execute }) {
  const ranges = gardenFoldRanges(markdown).filter((range) => all || (range.start <= line && line <= range.end));
  if (!ranges.length) return false;
  await execute(action === "fold" ? "editor.fold" : "editor.unfold", {
    selectionLines: ranges.map((range) => range.start), levels: 1, direction: "up",
  });
  return true;
}
