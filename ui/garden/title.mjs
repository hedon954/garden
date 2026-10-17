const SEPARATOR = /丨|｜| \| /gu;

/**
 * A title splits into exactly two lines when it contains one 丨, ｜ or " | ".
 * Anything else stays one line. The separator stays in the accessible name.
 */
export function splitTitle(title) {
  const text = String(title ?? "");
  const matches = [...text.matchAll(SEPARATOR)];
  if (matches.length === 0) return { split: false, title: text, lines: [text], separator: null, issue: null };
  if (matches.length > 1) {
    return { split: false, title: text, lines: [text], separator: null, issue: "multiple" };
  }
  const match = matches[0];
  const before = text.slice(0, match.index).trim();
  const after = text.slice(match.index + match[0].length).trim();
  const separator = match[0] === " | " ? " | " : match[0];
  if (!before || !after) {
    return { split: false, title: text, lines: [text], separator, issue: "empty" };
  }
  return { split: true, title: text, lines: [before, after], separator, issue: null };
}

/** Estimated line width in hero-em units. CJK is 1, capitals 0.68, spaces 0.3. */
export function titleWidthUnits(line) {
  return [...String(line ?? "")].reduce((sum, char) => {
    if (/[\u2E80-\uFFFF]/u.test(char)) return sum + 1;
    if (/[A-Z]/u.test(char)) return sum + 0.68;
    if (char === " ") return sum + 0.3;
    return sum + 0.58;
  }, 0);
}

export function titleLineScale(lines) {
  const width = Math.max(...lines.map((line) => titleWidthUnits(line)), 0.01);
  return Number(width.toFixed(2));
}
