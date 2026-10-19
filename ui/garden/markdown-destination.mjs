/**
 * Inline links and images, `[label](destination "title")` and
 * `![alt](destination "title")`, read the way CommonMark reads them. A
 * destination is either
 * - `<…>`: anything but a line break or an unescaped `<` / `>`, so it may hold
 *   spaces and unbalanced parentheses: `![a](<./my shot (1).png>)`; or
 * - a bare run without spaces, where parentheses must balance:
 *   `[w](https://en.wikipedia.org/wiki/Trie_(data_structure))`.
 * The build, the checker, the draft preview, link cards and the search index
 * all use this one reading, so a destination that works in the article also
 * works everywhere else, and a rewritten destination keeps its brackets.
 */

const ESCAPED = String.raw`\\.`;
const ANGLE = String.raw`<((?:[^<>\n\\]|${ESCAPED})*)>`;
const PLAIN = String.raw`(?:[^\s()<\\]|${ESCAPED})`;
const INNER = String.raw`(?:[^\s()\\]|${ESCAPED})`;
// Balanced parentheses, nested up to three deep.
const PARENS = [1, 2, 3].reduce((inner) => String.raw`\((?:${INNER}|${inner})*\)`, String.raw`\((?:${INNER})*\)`);
const BARE = String.raw`((?:${PLAIN}|${PARENS})(?:${INNER}|${PARENS})*)`;
const LABEL = String.raw`(?:[^\[\]\\]|${ESCAPED}|\[(?:[^\[\]\\]|${ESCAPED})*\])*`;

/**
 * Source of the inline link pattern. Groups: 1 `!` for an image, 2 label,
 * 3 destination written in `<…>`, 4 bare destination, 5 title (with the space
 * before it).
 */
export const INLINE_LINK_SOURCE = String.raw`(!?)\[(${LABEL})\]\(\s*(?:${ANGLE}|${BARE})((?:\s+(?:"(?:[^"\\]|${ESCAPED})*"|'(?:[^'\\]|${ESCAPED})*'|\((?:[^()\\]|${ESCAPED})*\)))?)\s*\)`;

/**
 * A fresh global pattern for inline links and images (`flags` adds e.g. `i`).
 * @param {string} [flags]
 */
export const inlineLinkPattern = (flags = "") => new RegExp(INLINE_LINK_SOURCE, `gu${flags.replace(/[gu]/gu, "")}`);

/**
 * @typedef {{ whole: string, image: boolean, label: string, url: string, angle: boolean, title: string }} InlineLink
 */

/**
 * The parts of one match of inlineLinkPattern().
 * @param {ArrayLike<string | undefined>} match
 * @returns {InlineLink}
 */
export function inlineLinkParts(match) {
  const angle = match[3] !== undefined;
  return { whole: String(match[0]), image: match[1] === "!", label: String(match[2] ?? ""), url: String((angle ? match[3] : match[4]) ?? ""), angle, title: match[5] ?? "" };
}

/**
 * A destination written back the way it was written: in `<…>` if it was.
 * @param {string} url
 * @param {boolean} angle
 */
export const formatDestination = (url, angle) => (angle ? `<${url}>` : url);

/**
 * `[label](destination title)` or `![…](…)` from parts, with a new url.
 * @param {Pick<InlineLink, "image" | "label" | "angle" | "title">} link
 * @param {string} url
 */
export const formatInlineLink = ({ image, label, angle, title }, url) =>
  `${image ? "!" : ""}[${label}](${formatDestination(url, angle)}${title})`;

/**
 * Replace every inline link and image. `replace(parts)` returns the new text,
 * or undefined to leave that link as written.
 * @param {string} text
 * @param {(link: InlineLink) => string | undefined} replace
 * @returns {string}
 */
export function replaceInlineLinks(text, replace) {
  return String(text ?? "").replace(inlineLinkPattern(), (...match) => {
    const next = replace(inlineLinkParts(/** @type {string[]} */ (match)));
    return next === undefined ? match[0] : next;
  });
}
