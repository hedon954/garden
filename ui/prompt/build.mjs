import { catalogReference } from "../core/catalog.mjs";

export const RECIPE_FILES = [
  "param-bench.md",
  "stepper.md",
  "inspect-grid.md",
  "compare.md",
  "trace.md",
  "converter.md",
  "plan.md",
  "data-chart.md",
  "code-walkthrough.md",
];

/**
 * `garden ui prompt`: rules + component reference generated from the catalog
 * + recipes. The admin workbench appends `studio` for its output contract.
 * @param {{ rules: string, recipes: string[], studio?: string | null }} parts
 */
export function buildPrompt({ rules, recipes, studio = null }) {
  const parts = [rules.trim(), catalogReference().trim(), "## 配方", ...recipes.map((recipe) => recipe.trim())];
  if (studio) parts.push(studio.trim());
  return `${parts.join("\n\n---\n\n")}\n`;
}
