/**
 * Tag filtering for the article list. Pure functions only, so the list page
 * and the tests share one implementation.
 */

export type Tagged = { tags?: string[] };

export type TagOption = {
  tag: string;
  /** Posts carrying this tag. */
  total: number;
  /** Posts left if this tag were added to the selection (the current result when already selected). */
  next: number;
  selected: boolean;
  /** Adding it would leave nothing. Selected tags are never disabled. */
  disabled: boolean;
};

export const TAG_PARAM = "t";
export const DEFAULT_VISIBLE_TAGS = 14;

const byCount = (left: [string, number], right: [string, number]) =>
  right[1] - left[1] || left[0].localeCompare(right[0], "zh");

/** Tags match regardless of case: `Rust`, `rust` and `RUST` are one tag. */
export const tagKey = (tag: string) => tag.trim().toLocaleLowerCase();

const postKeys = (post: Tagged) => new Set((post.tags ?? []).map(tagKey).filter(Boolean));

/**
 * Every tag with its post count, most used first. Spellings that differ only
 * in case count as one tag, shown in its most common spelling.
 */
export function tagCounts(posts: readonly Tagged[]): [string, number][] {
  const counts = new Map<string, number>();
  const spellings = new Map<string, Map<string, number>>();
  for (const post of posts) {
    const seen = new Set<string>();
    for (const raw of post.tags ?? []) {
      const tag = raw.trim();
      const key = tagKey(tag);
      if (!key) continue;
      const forms = spellings.get(key) ?? new Map<string, number>();
      forms.set(tag, (forms.get(tag) ?? 0) + 1);
      spellings.set(key, forms);
      if (seen.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]): [string, number] => {
      // Map keeps insertion order, so ties go to the first spelling seen.
      const [label] = [...(spellings.get(key) ?? new Map([[key, 0]])).entries()].reduce((best, form) => (form[1] > best[1] ? form : best));
      return [label, count];
    })
    .sort(byCount);
}

/** Selected tags from the repeated URL param, trimmed and de-duplicated (ignoring case), in URL order. */
export function selectedTags(values: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const tag = value.trim();
    const key = tagKey(tag);
    if (key && !seen.has(key)) seen.set(key, tag);
  }
  return [...seen.values()];
}

/** Selected tags written the way the posts write them (`?t=Rust` becomes `rust`); unknown tags stay as given. */
export function canonicalTags(posts: readonly Tagged[], selected: readonly string[]): string[] {
  const labels = new Map(tagCounts(posts).map(([tag]) => [tagKey(tag), tag]));
  return selected.map((tag) => labels.get(tagKey(tag)) ?? tag);
}

const hasAll = (post: Tagged, tags: readonly string[]) => {
  const own = postKeys(post);
  return tags.every((tag) => own.has(tagKey(tag)));
};

/** Posts carrying every selected tag (intersection). No selection keeps everything. */
export function filterByTags<T extends Tagged>(posts: readonly T[], selected: readonly string[]): T[] {
  return selected.length ? posts.filter((post) => hasAll(post, selected)) : posts.slice();
}

/** One option per known tag plus any selected tag the posts do not use. */
export function tagOptions(posts: readonly Tagged[], selected: readonly string[]): TagOption[] {
  const current = filterByTags(posts, selected);
  const chosen = new Set(selected.map(tagKey));
  const options = tagCounts(posts).map(([tag, total]) => {
    const key = tagKey(tag);
    const isSelected = chosen.has(key);
    const next = isSelected ? current.length : current.filter((post) => postKeys(post).has(key)).length;
    return { tag, total, next, selected: isSelected, disabled: !isSelected && next === 0 };
  });
  for (const tag of selected) {
    if (!options.some((option) => tagKey(option.tag) === tagKey(tag))) {
      options.push({ tag, total: 0, next: 0, selected: true, disabled: false });
    }
  }
  return options;
}

/**
 * Tags shown before 「全部标签」 is expanded.
 *
 * - No selection: the top tags by count.
 * - With a selection: the selected tags, then the tags that still have results,
 *   most remaining posts first, up to the same limit. Tags that would leave
 *   nothing come last and only when expanded.
 */
export function visibleTagOptions(options: readonly TagOption[], expanded: boolean, limit = DEFAULT_VISIBLE_TAGS) {
  const anySelected = options.some((option) => option.selected);
  if (!anySelected) {
    if (expanded) return { shown: options.slice(), hidden: 0 };
    const shown = options.slice(0, limit);
    return { shown, hidden: options.length - shown.length };
  }
  const selected = options.filter((option) => option.selected);
  // Array.prototype.sort is stable, so equal counts keep the by-total order.
  const open = options
    .filter((option) => !option.selected && !option.disabled)
    .sort((left, right) => right.next - left.next);
  const closed = options.filter((option) => !option.selected && option.disabled);
  const ordered = [...selected, ...open, ...closed];
  if (expanded) return { shown: ordered, hidden: 0 };
  const shown = [...selected, ...open.slice(0, Math.max(0, limit - selected.length))];
  return { shown, hidden: options.length - shown.length };
}

/** Add the tag if absent, remove it if present (in any spelling). */
export function toggleTag(selected: readonly string[], tag: string): string[] {
  const key = tagKey(tag);
  return selected.some((item) => tagKey(item) === key)
    ? selected.filter((item) => tagKey(item) !== key)
    : [...selected, tag];
}

/** `/blog?t=A&t=B`, or `/blog` with no selection. */
export function tagFilterHref(selected: readonly string[], pathname = "/blog") {
  const params = new URLSearchParams();
  for (const tag of selected) params.append(TAG_PARAM, tag);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Where a tag link points (tags on an article, the /tags page): the list page at its exported address
 * (`/blog/`, with the slash, so the static host does not answer /blog?t=… with
 * a 301 first), filtered to that one tag. The tag is URL-encoded.
 */
export const ARTICLE_TAG_LIST = "/blog/";
export const articleTagHref = (tag: string) => tagFilterHref([tag], ARTICLE_TAG_LIST);

/** 「共 N 篇」, or 「2 个标签，共 5 篇」 with a selection. */
export function tagSummary(selectedCount: number, resultCount: number) {
  return selectedCount ? `${selectedCount} 个标签，共 ${resultCount} 篇` : `共 ${resultCount} 篇`;
}
