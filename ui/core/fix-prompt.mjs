import { cliText } from "./cli-locale.mjs";

const MAX_BLOCKS = 10;

/**
 * The prompt the pre-commit hook and the admin hand to an AI. `problems` is a
 * list of `{ file, block, diagnostics }` where block comes from scanMarkdown.
 * `lang` is "zh" | "en" (site locale); defaults to Chinese.
 */
export function buildFixPrompt(problems, { standaloneReference = null, lang = "zh" } = {}) {
  const t = cliText(lang);
  const lines = [
    t.promptIntro,
    "",
    t.promptRulesHeader,
    t.promptRulePrompt,
    t.promptRuleApply,
    t.promptRuleCheck,
    t.promptRuleOffline,
    "",
  ];
  problems.forEach((problem, index) => {
    const { file, block, diagnostics } = problem;
    const target = block.id ? `id: ${block.id}` : `intent-hash: ${block.intentHash}`;
    lines.push(t.promptItem(index + 1, file, block.startLine, block.endLine, target));
    if (block.lang === "garden-idea") lines.push(t.promptGardenIdea);
    if (block.lang === "intent") lines.push(t.promptIntent);
    for (const item of diagnostics) lines.push(t.promptDiag(item.line, item.code, item.message));
    if (index < MAX_BLOCKS) {
      lines.push("", t.promptFence, "", block.raw, "");
    } else {
      lines.push("");
    }
  });
  if (problems.length > MAX_BLOCKS) lines.push(t.promptTruncated(MAX_BLOCKS), "");
  if (standaloneReference) lines.push("---", "", t.promptStandalone, "", standaloneReference);
  return `${lines.join("\n").trimEnd()}\n`;
}
