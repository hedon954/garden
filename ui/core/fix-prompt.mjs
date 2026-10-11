const MAX_BLOCKS = 10;

/**
 * The prompt the pre-commit hook and the admin hand to an AI. `problems` is a
 * list of `{ file, block, diagnostics }` where block comes from scanMarkdown.
 */
export function buildFixPrompt(problems, { standaloneReference = null } = {}) {
  const lines = [
    "请修复下面 Garden 博文里有错误的 ui 块。",
    "",
    "要求：",
    "- 先运行 npx garden ui prompt，读组件目录和规则；仓库里有 garden-ui skill 时按它的流程做。",
    "- 只改列出的块，用 npx garden ui apply <稿件> --id <id> 写回（没有 id 的 intent 用 --intent-hash），不要直接编辑稿件。",
    "- 不改 intent 的原意。修好后运行 npx garden ui check <稿件>，直到通过。",
    "- 如果你不能访问这个仓库，就只回复每块修好后的完整围栏。",
    "",
  ];
  problems.forEach((problem, index) => {
    const { file, block, diagnostics } = problem;
    const target = block.id ? `id: ${block.id}` : `intent-hash: ${block.intentHash}`;
    lines.push(`${index + 1}. ${file}，第 ${block.startLine}–${block.endLine} 行，${target}`);
    if (block.lang === "intent") {
      lines.push("   - intent-uncompiled：这段想法还没编译，请按原话编译成 ui 块（或判断后写回正文）。");
    }
    for (const item of diagnostics) lines.push(`   - 第 ${item.line} 行 ${item.code}：${item.message}`);
    if (index < MAX_BLOCKS) {
      lines.push("", "当前围栏：", "", block.raw, "");
    } else {
      lines.push("");
    }
  });
  if (problems.length > MAX_BLOCKS) lines.push(`（只附了前 ${MAX_BLOCKS} 块的原文，其余按上面的位置去稿件里找。）`, "");
  if (standaloneReference) lines.push("---", "", "以下是 Garden ui 块的完整写作规则、组件参考和配方：", "", standaloneReference);
  return `${lines.join("\n").trimEnd()}\n`;
}
