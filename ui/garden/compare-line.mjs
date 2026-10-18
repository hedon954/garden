// A compare cell written as one line, 「X：Y」 or "X: Y". X is the title and Y
// the text. The split is at the first full-width colon, or a colon followed by
// a space, that is not inside inline code, link text or a link URL. The
// separator, with the spaces on either side of it, is returned as written, so
// title + separator + text always equals the original line.

// End of a backtick code span starting at `start`, or -1 when it never closes.
function codeSpanEnd(line, start) {
  let run = 0;
  while (line[start + run] === "`") run += 1;
  const fence = "`".repeat(run);
  let at = start + run;
  while (at < line.length) {
    const next = line.indexOf(fence, at);
    if (next < 0) return -1;
    let close = 0;
    while (line[next + close] === "`") close += 1;
    if (close === run) return next + run;
    at = next + close;
  }
  return -1;
}

// End of a bracketed run `[...]` or `(...)` starting at `start`, honouring
// nesting, escapes and code spans; -1 when it never closes.
function groupEnd(line, start, open, close) {
  let depth = 0;
  for (let at = start; at < line.length; at += 1) {
    const char = line[at];
    if (char === "\\") { at += 1; continue; }
    if (char === "`") {
      const end = codeSpanEnd(line, at);
      if (end > 0) { at = end - 1; continue; }
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return at + 1;
    }
  }
  return -1;
}

// End of a Markdown link or image `[text](url)` / `[text][ref]` at `start`,
// or -1 when the brackets are not a link.
function linkEnd(line, start) {
  const textEnd = groupEnd(line, start, "[", "]");
  if (textEnd < 0) return -1;
  if (line[textEnd] === "(") return groupEnd(line, textEnd, "(", ")");
  if (line[textEnd] === "[") return groupEnd(line, textEnd, "[", "]");
  return -1;
}

/** @param {string} line */
export function splitCompareLine(line) {
  for (let at = 0; at < line.length; at += 1) {
    const char = line[at];
    if (char === "\\") { at += 1; continue; }
    if (char === "`") {
      const end = codeSpanEnd(line, at);
      if (end > 0) { at = end - 1; continue; }
      continue;
    }
    if (char === "[") {
      const end = linkEnd(line, at);
      if (end > 0) { at = end - 1; continue; }
      continue;
    }
    if (char === "<") {
      // Autolink <https://…>.
      const end = line.indexOf(">", at);
      if (end > 0 && /^<[a-z][a-z0-9+.-]*:[^\s<>]*>$/iu.test(line.slice(at, end + 1))) { at = end; continue; }
    }
    const isSeparator = char === "：" || (char === ":" && line[at + 1] === " ");
    if (!isSeparator) continue;
    // Spaces on either side of the colon belong to the separator.
    let start = at;
    while (start > 0 && /\s/u.test(line[start - 1])) start -= 1;
    if (start === 0) continue;
    let end = at + 1;
    while (end < line.length && /\s/u.test(line[end])) end += 1;
    if (end >= line.length) return null;
    return { title: line.slice(0, start), separator: line.slice(start, end), text: line.slice(end) };
  }
  return null;
}
