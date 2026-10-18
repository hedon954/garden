/**
 * Substring search over titles, descriptions, tags and body text. Works the
 * same for Chinese and English: every word of the query has to appear
 * somewhere in the entry. Plain indexOf over ~1-2 MB of text stays well under
 * a frame, so it runs on the main thread.
 */

const MAX_RANGES_PER_TERM = 12;

/** Query words: split on spaces, lowercased, duplicates dropped. */
export function queryTerms(query) {
  return [...new Set(String(query ?? "").toLowerCase().split(/\s+/u).filter(Boolean))];
}

function occurrences(haystack, term, limit = MAX_RANGES_PER_TERM) {
  const ranges = [];
  let from = 0;
  while (ranges.length < limit) {
    const at = haystack.indexOf(term, from);
    if (at === -1) break;
    ranges.push([at, at + term.length - 1]);
    from = at + term.length;
  }
  return ranges;
}

const lower = (text) => {
  const value = String(text ?? "");
  const folded = value.toLowerCase();
  // Highlights need positions that line up with the original text.
  return folded.length === value.length ? folded : null;
};

/**
 * `records` come from search-index.json; `bodies` is a Map of path → full
 * text, or null while only the excerpts are loaded. Results have the shape the
 * header renders: `{ item, matches: [{ key, indices }] }`, where item.content
 * is the body the snippet is cut from.
 *
 * @param {Array<{ title: string; description?: string; path: string; content?: string; tags?: string[] }>} records
 * @param {Map<string, string> | null} [bodies]
 */
export function createSearch(records, bodies = null) {
  const docs = records.map((record, order) => {
    const content = bodies?.get(record.path) ?? record.content ?? "";
    const tags = (record.tags ?? []).map((tag) => String(tag).toLowerCase());
    return {
      order,
      item: { ...record, content },
      title: lower(record.title),
      description: lower(record.description),
      body: lower(content),
      tags,
      tagText: tags.join(" "),
    };
  });

  function search(query, limit = 6) {
    const terms = queryTerms(query);
    if (!terms.length) return [];
    const hits = [];
    for (const doc of docs) {
      let score = 0;
      const ranges = { title: [], description: [], content: [] };
      let all = true;
      for (const term of terms) {
        const inTitle = doc.title ? occurrences(doc.title, term) : [];
        const inDescription = doc.description ? occurrences(doc.description, term) : [];
        const inBody = doc.body ? occurrences(doc.body, term) : [];
        const tagExact = doc.tags.includes(term);
        const inTags = tagExact || doc.tagText.includes(term);
        if (!inTitle.length && !inDescription.length && !inBody.length && !inTags) {
          all = false;
          break;
        }
        if (inTitle.length) score += 8;
        if (tagExact) score += 6;
        else if (inTags) score += 3;
        if (inDescription.length) score += 3;
        if (inBody.length) score += 1 + inBody.length * 0.1;
        ranges.title.push(...inTitle);
        ranges.description.push(...inDescription);
        ranges.content.push(...inBody);
      }
      if (!all) continue;
      const matches = Object.entries(ranges)
        .filter(([, indices]) => indices.length)
        .map(([key, indices]) => ({ key, indices: indices.sort((a, b) => a[0] - b[0]) }));
      hits.push({ score, order: doc.order, item: doc.item, matches });
    }
    hits.sort((a, b) => b.score - a.score || a.order - b.order);
    return hits.slice(0, limit).map(({ item, matches }) => ({ item, matches }));
  }

  return { full: Boolean(bodies), search };
}
