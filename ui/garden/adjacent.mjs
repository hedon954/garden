/**
 * Previous / next entries for the article pager.
 *
 * `byDate`: entries of one content type ordered by publish date; 上一篇 is the
 * earlier one. Ties keep the order of the input list.
 * `inOrder`: entries in a fixed reading order (a column); 上一篇 is the one
 * before it in that order.
 */
export function adjacentByDate(entries, isCurrent) {
  const ordered = entries
    .map((entry, index) => ({ entry, index, time: Date.parse(entry.date) }))
    .sort((a, b) => (a.time - b.time) || (b.index - a.index))
    .map((item) => item.entry);
  return adjacentInOrder(ordered, isCurrent);
}

export function adjacentInOrder(entries, isCurrent) {
  const index = entries.findIndex(isCurrent);
  if (index < 0) return { prev: null, next: null };
  return { prev: entries[index - 1] ?? null, next: entries[index + 1] ?? null };
}
