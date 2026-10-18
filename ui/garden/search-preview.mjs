// Search result excerpts: crop around the first match and split into
// highlighted parts. Match ranges are inclusive [start, end] offsets.

/** Sort and join ranges that touch or overlap. */
export function mergeRanges(ranges) {
  return [...ranges]
    .sort((left, right) => left[0] - right[0])
    .reduce((result, range) => {
      const previous = result.at(-1);
      if (previous && range[0] <= previous[1] + 1) result[result.length - 1] = [previous[0], Math.max(previous[1], range[1])];
      else result.push([range[0], range[1]]);
      return result;
    }, []);
}

// A term cut by the edge is kept whole when it adds at most this many characters.
const KEEP_WHOLE = 16;

/**
 * Crop `text` to a window around the first match. The 「…」 marks come back
 * apart from the text, so they are never inside a highlight, and a match the
 * window would cut is either kept whole or left out whole.
 * @returns {{ prefix: string, text: string, suffix: string, ranges: Array<[number, number]> }}
 */
export function cropMatchedText(text, ranges) {
  const merged = mergeRanges(ranges).filter(([start, end]) => end >= start && start < text.length);
  if (!merged.length) return { prefix: "", text, suffix: "", ranges: [] };

  const [focusStart, focusEnd] = merged[0];
  let start = Math.max(0, focusStart - 42);
  let end = Math.min(text.length, Math.max(focusEnd + 52, start + 112));

  if (start > 0) {
    const nextSpace = text.indexOf(" ", start);
    if (nextSpace !== -1 && nextSpace < focusStart) start = nextSpace + 1;
  }
  if (end < text.length) {
    const previousSpace = text.lastIndexOf(" ", end);
    if (previousSpace > focusEnd) end = previousSpace;
  }

  // No match may straddle a cut: widen to take it whole, or stop before it.
  for (const [rangeStart, rangeEnd] of merged) {
    if (rangeStart < start && rangeEnd >= start) start = start - rangeStart <= KEEP_WHOLE ? rangeStart : rangeEnd + 1;
    if (rangeStart < end && rangeEnd >= end) end = rangeEnd + 1 - end <= KEEP_WHOLE ? Math.min(text.length, rangeEnd + 1) : rangeStart;
  }

  return {
    prefix: start > 0 ? "…" : "",
    text: text.slice(start, end),
    suffix: end < text.length ? "…" : "",
    ranges: merged
      .filter(([rangeStart, rangeEnd]) => rangeStart >= start && rangeEnd < end)
      .map(([rangeStart, rangeEnd]) => [rangeStart - start, rangeEnd - start]),
  };
}

/** Split text into plain and matched parts. */
export function highlightParts(text, ranges) {
  const parts = [];
  let cursor = 0;
  for (const [start, end] of mergeRanges(ranges)) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), matched: false });
    parts.push({ text: text.slice(start, end + 1), matched: true });
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), matched: false });
  return parts;
}
