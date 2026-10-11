import { scanFences } from "../core/fence.mjs";

export type RecipeSource = { file: string; markdown: string };
export type Recipe = { file: string; title: string; intro: string; fence: string | null };

/** Title, introduction and the first complete `ui` example of a recipe file. */
export function parseRecipe(source: RecipeSource): Recipe {
  const title = /^#\s+(?:配方：)?(.+)$/mu.exec(source.markdown)?.[1]?.trim() ?? source.file;
  const outer = scanFences(source.markdown);
  let fence: string | null = null;
  for (const item of outer) {
    if (item.lang === "ui") {
      fence = item.raw;
      break;
    }
    const inner = scanFences(item.body).find((candidate) => candidate.lang === "ui");
    if (inner) {
      fence = inner.raw;
      break;
    }
  }
  const firstFence = outer[0]?.start ?? source.markdown.length;
  const intro = source.markdown.slice(0, firstFence).replace(/^#.+$/mu, "").trim();
  return { file: source.file, title, intro, fence };
}
