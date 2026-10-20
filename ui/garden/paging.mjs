/**
 * Static paging for feeds (随想). Page 1 is the list page itself; page n > 1
 * is pre-rendered at <base>/page/<n>/. The reader's browser loads the next
 * page's HTML as they scroll; without JavaScript the 下一页 link goes there.
 */
export const DEFAULT_PAGE_SIZE = 10;

export function pageSizeOf(value) {
  const size = Number(value);
  return Number.isInteger(size) && size > 0 ? size : DEFAULT_PAGE_SIZE;
}

export function pageCount(total, size) {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSizeOf(size)));
}

export function pageItems(items, page, size) {
  const step = pageSizeOf(size);
  return items.slice((page - 1) * step, page * step);
}

export function pagePath(base, page) {
  const root = base.replace(/\/+$/u, "");
  return page <= 1 ? `${root}/` : `${root}/page/${page}/`;
}

/** Page numbers that get their own static file: 2..count. */
export function extraPages(total, size) {
  return Array.from({ length: pageCount(total, size) - 1 }, (_, index) => index + 2);
}
