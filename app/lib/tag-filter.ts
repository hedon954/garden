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

/** Every tag with its post count, most used first. */
export function tagCounts(posts: readonly Tagged[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of new Set(post.tags ?? [])) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort(byCount);
}

/** Selected tags from the repeated URL param, trimmed and de-duplicated, in URL order. */
export function selectedTags(values: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const tag = value.trim();
    if (tag) seen.add(tag);
  }
  return [...seen];
}

const hasAll = (post: Tagged, tags: readonly string[]) => {
  const own = new Set(post.tags ?? []);
  return tags.every((tag) => own.has(tag));
};

/** Posts carrying every selected tag (intersection). No selection keeps everything. */
export function filterByTags<T extends Tagged>(posts: readonly T[], selected: readonly string[]): T[] {
  return selected.length ? posts.filter((post) => hasAll(post, selected)) : posts.slice();
}

/** One option per known tag plus any selected tag the posts do not use. */
export function tagOptions(posts: readonly Tagged[], selected: readonly string[]): TagOption[] {
  const current = filterByTags(posts, selected);
  const chosen = new Set(selected);
  const options = tagCounts(posts).map(([tag, total]) => {
    const isSelected = chosen.has(tag);
    const next = isSelected ? current.length : current.filter((post) => (post.tags ?? []).includes(tag)).length;
    return { tag, total, next, selected: isSelected, disabled: !isSelected && next === 0 };
  });
  for (const tag of selected) {
    if (!options.some((option) => option.tag === tag)) {
      options.push({ tag, total: 0, next: 0, selected: true, disabled: false });
    }
  }
  return options;
}

/** The top tags by count, plus every selected tag even when it falls outside the top group. */
export function visibleTagOptions(options: readonly TagOption[], expanded: boolean, limit = DEFAULT_VISIBLE_TAGS) {
  if (expanded) return { shown: options.slice(), hidden: 0 };
  const shown = options.filter((option, index) => index < limit || option.selected);
  return { shown, hidden: options.length - shown.length };
}

/** Add the tag if absent, remove it if present. */
export function toggleTag(selected: readonly string[], tag: string): string[] {
  return selected.includes(tag) ? selected.filter((item) => item !== tag) : [...selected, tag];
}

/** `/blog?t=A&t=B`, or `/blog` with no selection. */
export function tagFilterHref(selected: readonly string[], pathname = "/blog") {
  const params = new URLSearchParams();
  for (const tag of selected) params.append(TAG_PARAM, tag);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** 「共 N 篇」, or 「2 个标签，共 5 篇」 with a selection. */
export function tagSummary(selectedCount: number, resultCount: number) {
  return selectedCount ? `${selectedCount} 个标签，共 ${resultCount} 篇` : `共 ${resultCount} 篇`;
}
