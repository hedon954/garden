import { compiledOf, fenceHash, findBlocks, idOf, intentHash, intentOf, splitUiBody } from "./fence.mjs";
import { checkUiBlock } from "./validate.mjs";
import { readInteractiveFence } from "./garden-fence.mjs";

/** Diagnostics of a `garden interactive`, on file lines. */
export function checkInteractiveFence(block, options = {}) {
  const read = readInteractiveFence(block);
  if (read.yamlError) {
    return { ok: false, diagnostics: [{ code: "garden-yaml", line: block.startLine, message: read.yamlError, severity: "error" }] };
  }
  const check = checkUiBlock(read.source, { ...options, lineOffset: 0 });
  return { ...check, diagnostics: check.diagnostics.map((item) => ({ ...item, line: read.toFileLine(item.line) })) };
}

/** Status of one block: uncompiled / stale / error / ok. */
export function blockStatus(block, check) {
  if (block.lang === "intent" || block.lang === "garden-idea") return "uncompiled";
  if (block.lang === "garden-interactive") return check && !check.ok ? "error" : "ok";
  if (block.lang === "ui") {
    if (check && !check.ok) return "error";
    const { header, headerText } = splitUiBody(block.body);
    const compiled = compiledOf(headerText);
    if (typeof header?.intent === "string" && compiled !== undefined && compiled !== intentHash(header.intent)) return "stale";
    return "ok";
  }
  return "ok";
}

function sectionTitle(lines, startLine) {
  for (let index = startLine - 2; index >= 0; index -= 1) {
    const heading = /^(#{2,6})\s+(.+?)\s*#*$/u.exec(lines[index]);
    if (heading) return heading[2].trim();
  }
  return null;
}

/**
 * Everything `garden ui scan`, the hook, the admin and the editors need to
 * know about the blocks of one Markdown file.
 */
export function scanMarkdown(markdown, options = {}) {
  const { markdownPath = null, readData = null, skipData = false } = options;
  const lines = markdown.split(/\r?\n/u);
  return findBlocks(markdown).map((block) => {
    const intent = intentOf(block);
    const check = block.lang === "ui"
      ? checkUiBlock(block.body, { lineOffset: block.startLine, markdownPath, readData, skipData })
      : block.lang === "garden-interactive"
        ? checkInteractiveFence(block, { markdownPath, readData, skipData })
        : null;
    const header = block.lang === "ui"
      ? splitUiBody(block.body).header
      : block.lang === "garden-interactive" ? readInteractiveFence(block).props : null;
    return {
      lang: block.lang,
      id: idOf(block),
      status: blockStatus(block, check),
      startLine: block.startLine,
      endLine: block.endLine,
      hash: fenceHash(block.raw),
      intentHash: intent !== null ? intentHash(intent) : null,
      intent,
      caption: typeof header?.caption === "string" ? header.caption : null,
      section: sectionTitle(lines, block.startLine),
      diagnostics: check ? check.diagnostics : [],
      raw: block.raw,
    };
  });
}
