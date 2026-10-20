import { CATALOG, suggestName } from "./catalog.mjs";
import { isProseSteps, isTrivialInteractive } from "./enhance.mjs";
import { blanksBetween, classifyFence, isFullCodeFence, scanFences } from "./parse.mjs";
import { splitTitle } from "./title.mjs";
import { splitCompareLine } from "./compare-line.mjs";
import { readFileProps } from "./file-block.mjs";
import { checkInteractiveFence } from "../core/scan.mjs";

const COMPARE_LIMIT = 60;

function cellText(item) {
  // A one-line cell 「X：Y」: X is the title, only Y counts toward the length.
  if (typeof item === "string") return splitCompareLine(item)?.text ?? item;
  if (!item || typeof item !== "object") return "";
  const parts = [];
  if (typeof item.text === "string") parts.push(item.text);
  if (Array.isArray(item.text)) parts.push(...item.text.map(String));
  for (const [key, value] of Object.entries(item)) {
    if (key === "title" || key === "text") continue;
    if (typeof value === "string") parts.push(value);
  }
  return parts.join("");
}

function compareTooLong(props) {
  const items = Array.isArray(props?.items) ? props.items : [];
  // Good/bad verdicts stack one under another, so a longer quote still reads well.
  if (items.some((item) => item && typeof item === "object" && (item.verdict === "good" || item.verdict === "bad"))) return false;
  return items.some((item) => [...cellText(item).trim()].length > COMPARE_LIMIT);
}

/**
 * Diagnostics for one Markdown file.
 * `line` is a 1-based line in `markdown` (front matter included when `title` is passed with `titleLine`).
 */
export function checkGardenMarkdown(markdown, { draft = false, title = "", titleLine = 1 } = {}) {
  const diagnostics = [];
  const push = (line, code, message, suggestion, severity = "error") => {
    diagnostics.push({ line, code, message, suggestion, severity });
  };

  if (title) {
    const split = splitTitle(title);
    // More than one separator still splits at the first. Only an empty side stays one line.
    if (split.issue === "empty") {
      push(titleLine, "title-split", "分隔符两侧都要有文字。", "写成「主题丨副题」。", "warning");
    }
  }

  const fences = scanFences(markdown);
  fences.forEach((fence, index) => {
    const kind = classifyFence(fence);
    if (kind.kind === "legacy") {
      push(fence.line, "legacy-fence", kind.suggestion, kind.suggestion);
      return;
    }
    if (kind.kind === "diff") {
      const previous = fences[index - 1];
      const previousKind = previous ? classifyFence(previous) : null;
      const adjacent = previous && blanksBetween(markdown, previous.endLine, fence.line) && isFullCodeFence(previousKind);
      if (!adjacent) {
        push(fence.line, "diff-orphan", "这段 diff 前面没有紧挨着的完整代码块。", "先放完整代码，下一围栏再写它的 diff。");
      }
      return;
    }
    if (kind.kind !== "garden" || !kind.block) return;
    const block = kind.block;
    if (block.legacy) {
      const suggestion = `\`${block.legacyLang}\` 已改为 \`garden ${block.name}\``;
      push(fence.line, "legacy-fence", suggestion, suggestion);
    }
    if (!block.name) {
      if (!draft) {
        push(fence.line, "garden-idea", "非草稿里还有未编译的想法。", "编译成 `garden interactive`，或把这句话写回正文。");
      }
      return;
    }
    if (block.error?.code === "garden-name") {
      const guess = suggestName(block.name);
      const suggestion = guess ? `你是不是想用 ${guess}` : `可用的名字：${Object.keys(CATALOG).join("、")}`;
      push(fence.line, "garden-name", block.error.message, suggestion);
      return;
    }
    if (block.error?.code === "garden-yaml") {
      const allowed = block.error.allowed ?? CATALOG[block.name]?.keys ?? [];
      push(fence.line, "garden-yaml", block.error.message, allowed.length ? `可用的键：${allowed.join("、")}` : "检查缩进和冒号。");
      return;
    }
    if (block.error?.code === "garden-relations") {
      push(fence.line, "garden-relations", block.error.message, "要素更多或有分支：```mermaid flowchart；一次走完的步骤：garden list。");
      return;
    }
    if (block.name === "file") {
      if (block.props.resolved !== undefined) {
        push(fence.line, "garden-file", "resolved 由构建生成，不要手写。", "删掉 resolved，只写 src、title、note 或 files。");
        return;
      }
      const { errors } = readFileProps(block.props);
      if (errors.length) {
        push(fence.line, "garden-file", errors.join("；"), "单个文件写 src（可加 title、note）；一组文件写 files 列表，每项一个 src。");
      }
      return;
    }
    if (block.name === "compare" && compareTooLong(block.props)) {
      push(fence.line, "compare-long", "对比格超过约 60 字。", "这一格改回原文的列表或段落。");
    }
    if (block.name === "interactive") {
      const source = `${fence.body}\n${block.children}`;
      if (isTrivialInteractive(source)) {
        push(fence.line, "interactive-trivial", "只有一次乘法，却做成了交互。", "把这句算式留在正文里。");
      }
      if (isProseSteps(source)) {
        push(fence.line, "steps-prose", "步骤只是散文。", "连续的段落不要拆成步骤；有状态变化时才用 interactive。");
      }
      // The component tree: the same check the page and `garden ui check` run.
      const { diagnostics: uiDiagnostics = [] } = checkInteractiveFence({ lang: "garden", info: fence.meta ?? "", body: fence.body, startLine: fence.line }, { skipData: true });
      for (const item of uiDiagnostics.filter((entry) => entry.severity === "error")) {
        push(item.line, item.code, item.message, "运行 npx garden ui check 拿到修复提示词。");
      }
    }
  });
  return diagnostics;
}

export function formatDiagnostic(file, diagnostic) {
  const where = file ? `${file}:${diagnostic.line}` : String(diagnostic.line);
  return `${where} ${diagnostic.code} ${diagnostic.message} 建议：${diagnostic.suggestion}`;
}
