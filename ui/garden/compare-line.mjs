// A compare cell written as one line, 「X：Y」 or "X: Y". X is the title and Y
// the text. The separator and any space after it are returned as written, so
// title + separator + text always equals the original line.
const COMPARE_LINE = /^(.+?)(：\s*|: +)(\S[\s\S]*)$/u;

/** @param {string} line */
export function splitCompareLine(line) {
  const match = COMPARE_LINE.exec(line);
  return match ? { title: match[1], separator: match[2], text: match[3] } : null;
}
