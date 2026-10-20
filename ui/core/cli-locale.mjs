/**
 * Chinese / English strings for garden ui check and the fix prompt. The site
 * language comes from `locale` in site.config.yaml (zh_CN, en_US, …). Tests and
 * doc captures can pass an explicit lang.
 */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export const langOf = (locale) => (/^en/i.test(String(locale ?? "")) ? "en" : "zh");

/** Reads locale from site.config.yaml under siteRoot; missing file → zh. */
export function siteCliLang(siteRoot) {
  try {
    const raw = fs.readFileSync(path.join(siteRoot, "site.config.yaml"), "utf8");
    return langOf(parseYaml(raw)?.locale);
  } catch {
    return "zh";
  }
}

const zh = {
  checkPass: (n) => `检查通过（${n} 个文件）\n`,
  ideaUncompiled: (file, line) => `${file}:${line}  -  garden-idea  还有没编译的想法\n`,
  intentUncompiled: (file, line, id) => `${file}:${line}  ${id ?? "-"}  intent-uncompiled  还有没编译的 intent 块\n`,
  promptBanner: (sep) => `\n${sep} 发给 AI 的修复提示词 ${sep}\n`,
  promptWritten: (rel, copied) => `已写入 ${rel}${copied ? "，并已复制到剪贴板" : ""}。确实要先提交，可以用 git commit --no-verify。\n`,
  reminder: (line) => `提醒  ${line}\n`,
  promptIntro: "请处理下面 Garden 博文里列出的块：没编译的想法要编译，有错误的交互块要修好。",
  promptRulesHeader: "要求：",
  promptRulePrompt: "- 先运行 npx garden ui prompt，读组件目录和规则；仓库里有 garden-ui skill 时按它的流程做。",
  promptRuleApply: "- 只改列出的块，用 npx garden ui apply <稿件> --id <id> 写回（没有 id 的想法用 --intent-hash），不要直接编辑稿件。",
  promptRuleCheck: "- 不改作者原话的意思。改完运行 npx garden ui check <稿件>，直到通过。",
  promptRuleOffline: "- 如果你不能访问这个仓库，就只回复每块修好后的完整围栏。",
  promptItem: (i, file, start, end, target) => `${i}. ${file}，第 ${start}–${end} 行，${target}`,
  promptGardenIdea: "   - garden-idea：这段想法还没编译，请按原话编译成 garden interactive 或其他 garden 组件（或判断后写回正文）。",
  promptIntent: "   - intent-uncompiled：这段想法还没编译，请按原话编译成 ui 块（或判断后写回正文）。",
  promptDiag: (line, code, message) => `   - 第 ${line} 行 ${code}：${message}`,
  promptFence: "当前围栏：",
  promptTruncated: (max) => `（只附了前 ${max} 块的原文，其余按上面的位置去稿件里找。）`,
  promptStandalone: "以下是 Garden ui 块的完整写作规则、组件参考和配方：",
};

const en = {
  checkPass: (n) => `Check passed (${n} ${n === 1 ? "file" : "files"})\n`,
  ideaUncompiled: (file, line) => `${file}:${line}  -  garden-idea  uncompiled idea remaining\n`,
  intentUncompiled: (file, line, id) => `${file}:${line}  ${id ?? "-"}  intent-uncompiled  uncompiled intent block remaining\n`,
  promptBanner: (sep) => `\n${sep} Fix prompt for AI ${sep}\n`,
  promptWritten: (rel, copied) => `Wrote ${rel}${copied ? " and copied it to the clipboard" : ""}. To commit anyway, run git commit --no-verify.\n`,
  reminder: (line) => `note  ${line}\n`,
  promptIntro: "Handle the Garden post blocks listed below: compile uncompiled ideas, and fix interactive blocks that have errors.",
  promptRulesHeader: "Rules:",
  promptRulePrompt: "- First run npx garden ui prompt and read the component catalog and rules; if the repo has the garden-ui skill, follow its flow.",
  promptRuleApply: "- Change only the listed blocks. Write them back with npx garden ui apply <post> --id <id> (use --intent-hash for ideas without an id). Do not edit the post by hand.",
  promptRuleCheck: "- Keep the author's meaning. When done, run npx garden ui check <post> until it passes.",
  promptRuleOffline: "- If you cannot access this repository, reply with only the finished fence for each block.",
  promptItem: (i, file, start, end, target) => `${i}. ${file}, lines ${start}–${end}, ${target}`,
  promptGardenIdea: "   - garden-idea: this idea is not compiled yet; compile it into garden interactive or another garden component (or put the sentence back into the prose).",
  promptIntent: "   - intent-uncompiled: this idea is not compiled yet; compile it into a ui block (or put the sentence back into the prose).",
  promptDiag: (line, code, message) => `   - line ${line} ${code}: ${message}`,
  promptFence: "Current fence:",
  promptTruncated: (max) => `(Only the first ${max} fences are attached; open the post for the rest.)`,
  promptStandalone: "Full Garden ui writing rules, component reference, and recipes:",
};

export const CLI_STRINGS = { zh, en };
export const cliText = (lang = "zh") => CLI_STRINGS[lang === "en" ? "en" : "zh"];
