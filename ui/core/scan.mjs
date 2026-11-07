import { parseCompose } from "../compose/parse.mjs";
import { AUTHOR_PLAY_TAGS, looksLikePlayCompose, parsePlayCompose } from "../compose/dil.mjs";
import { fenceHash, findBlocks, idOf, intentHash, intentOf } from "./fence.mjs";
import { checkUiBlock } from "./validate.mjs";
import { gardenInfoId } from "./garden-fence.mjs";

/** A `garden compose` fence whose body is still prose, or a DIL tree that fails the catalog. */
export function checkComposeFence(block, options = {}) {
  if (looksLikePlayCompose(block.body)) {
    const parsed = parsePlayCompose({ id: gardenInfoId(block.info) }, block.body);
    if (parsed.error) return { ok: false, uncompiled: false, doc: null, diagnostics: [{ ...parsed.error, line: block.startLine, severity: "error" }] };
    const check = checkUiBlock(parsed.uiSource, { ...options, lineOffset: 0 });
    const authorNames = Object.fromEntries(Object.entries(AUTHOR_PLAY_TAGS).map(([author, internal]) => [internal, author]));
    const authorTags = value => value.replace(/<(\/?)([A-Z][A-Za-z0-9]*)/gu, (whole, slash, name) => authorNames[name] ? `<${slash}${authorNames[name]}` : whole);
    const bodyLines = block.body.split(/\r?\n/u);
    const loweredLines = parsed.uiSource.split("\n");
    const diagnostics = check.diagnostics.map(item => {
      // Report an exact author line only when the emitted line survives uniquely.
      // Declarations/control lowering can synthesize lines: those stay at the fence,
      // rather than falsely presenting internal IR coordinates as article positions.
      const emitted = authorTags(loweredLines[item.line - 1] ?? "").trim();
      const matches = emitted ? bodyLines.flatMap((line, index) => line.trim() === emitted ? [index] : []) : [];
      return {
        ...item,
        line: matches.length === 1 ? block.startLine + 1 + matches[0] : block.startLine,
        message: authorTags(item.message),
      };
    });
    return { ...check, uncompiled: false, doc: parsed.props, diagnostics };
  }
  const result = parseCompose(block.body);
  if (result.uncompiled) return { ok: false, uncompiled: true, diagnostics: [], doc: null };
  if (!result.ok) {
    return {
      ok: false,
      uncompiled: false,
      doc: null,
      diagnostics: [{ code: result.error.code, line: block.startLine, message: result.error.message, severity: "error" }],
    };
  }
  return { ok: true, uncompiled: false, diagnostics: [], doc: result.doc };
}

/** Status of one block: uncompiled / error / ok. */
export function blockStatus(block,check) {
  return check?.uncompiled?"uncompiled":check&&!check.ok?"error":"ok";
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
    const check=checkComposeFence(block,{markdownPath,readData,skipData});
    const header=check.doc;
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
