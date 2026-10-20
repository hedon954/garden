import { parse as parseYaml } from "yaml";
import { fenceHash, findBlocks, idOf, intentHash, intentOf, normalizeNewlines, scanFences, setCompiled, splitUiBody } from "./fence.mjs";
import { checkUiBlock } from "./validate.mjs";
import { gardenKind } from "./garden-fence.mjs";
import { checkInteractiveFence } from "./scan.mjs";
import { parseGardenBlock } from "../garden/parse.mjs";

export class ApplyError extends Error {
  constructor(code, message, diagnostics = []) {
    super(message);
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

function locate(markdown, target) {
  const blocks = findBlocks(markdown);
  let matches = [];
  if (target.id) matches = blocks.filter((block) => idOf(block) === target.id);
  else if (target.at) matches = blocks.filter((block) => block.startLine === Number(target.at));
  else if (target.intentHash) {
    matches = blocks.filter((block) => {
      const intent = intentOf(block);
      return intent !== null && intentHash(intent) === target.intentHash;
    });
  } else {
    throw new ApplyError("apply-target", "要用 --id、--at 或 --intent-hash 指定一块");
  }
  if (!matches.length) throw new ApplyError("apply-not-found", "找不到要替换的块");
  if (matches.length > 1) throw new ApplyError("apply-ambiguous", "匹配到多块，请改用更精确的定位");
  return matches[0];
}

/**
 * Classifies replacement text as one `garden <component>` fence, one `ui` or
 * `widget` fence, or plain Markdown.
 */
export function classifyReplacement(text) {
  const trimmed = normalizeNewlines(text).trim();
  const fences = scanFences(trimmed);
  const whole = fences.length === 1 && fences[0].start === 0 && fences[0].end === trimmed.length && fences[0].closed;
  if (whole && fences[0].lang === "garden" && gardenKind(fences[0]) !== "idea") return { kind: "garden", text: trimmed, fence: fences[0] };
  if (whole && fences[0].lang === "ui") return { kind: "ui", text: trimmed, fence: fences[0] };
  if (whole && fences[0].lang === "widget") return { kind: "widget", text: trimmed, fence: fences[0] };
  if (fences.some((fence) => fence.lang === "ui" || fence.lang === "intent" || gardenKind(fence) === "idea")) {
    throw new ApplyError("apply-content", "写回的内容里不能再有没编译的想法（garden、intent）或 ui 围栏");
  }
  return { kind: "markdown", text: trimmed };
}

/**
 * Replaces exactly one block. Everything outside the target fence stays
 * byte-identical; the result is verified before it is returned.
 */
export function applyBlock(markdown, target, replacementText, options = {}) {
  const { base = null, markdownPath = null, readData = null } = options;
  const block = locate(markdown, target);
  if (base && fenceHash(block.raw) !== base) {
    throw new ApplyError("apply-base", "本地这一块已经改过，和打开时的版本不一致，没有覆盖");
  }
  const replacement = classifyReplacement(replacementText);
  let text = replacement.text;
  if (replacement.kind === "garden") {
    const fence = replacement.fence;
    if (gardenKind(fence) === "interactive") {
      const check = checkInteractiveFence({ ...fence, startLine: block.startLine }, { markdownPath, readData });
      if (!check.ok) throw new ApplyError("apply-invalid", "新的 garden interactive 没有通过检查", check.diagnostics.filter((item) => item.severity === "error"));
    } else {
      const parsed = parseGardenBlock(`garden ${fence.info}`.trim(), fence.body);
      if (!parsed || parsed.error) {
        throw new ApplyError("apply-invalid", "新的 garden 块没有通过检查", [{ code: parsed?.error?.code ?? "garden-name", line: block.startLine, message: parsed?.error?.message ?? "无法识别的 garden 块", severity: "error" }]);
      }
    }
  } else if (replacement.kind === "ui") {
    const check = checkUiBlock(replacement.fence.body, { lineOffset: block.startLine, markdownPath, readData });
    if (!check.ok) throw new ApplyError("apply-invalid", "新的 ui 块没有通过检查", check.diagnostics.filter((item) => item.severity === "error"));
    const { header } = splitUiBody(replacement.fence.body);
    if (typeof header?.intent === "string") text = setCompiled(text, intentHash(header.intent));
  } else if (replacement.kind === "widget") {
    let data = null;
    try {
      data = parseYaml(replacement.fence.body);
    } catch {
      data = null;
    }
    if (!data || typeof data.src !== "string" || !data.src.trim() || typeof data.caption !== "string" || !data.caption.trim()) {
      throw new ApplyError("apply-invalid", "widget 围栏需要 src 和 caption");
    }
  }
  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  if (newline === "\r\n") text = text.replace(/\n/gu, "\r\n");
  const before = markdown.slice(0, block.start);
  const after = markdown.slice(block.end);
  const next = `${before}${text}${after}`;
  if (!next.startsWith(before) || !next.endsWith(after) || next.length !== before.length + text.length + after.length) {
    throw new ApplyError("apply-verify", "替换后围栏之外的内容发生了变化，已放弃");
  }
  return { markdown: next, kind: replacement.kind, block };
}
