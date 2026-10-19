/**
 * vinext, like Next.js, stops a static export (`output: "export"`) when a
 * dynamic route's generateStaticParams() returns an empty array. A garden site
 * can legitimately have no thoughts, no columns or no admin pages to export, so
 * an empty list becomes one placeholder entry instead. The prerender counts a
 * notFound() page as a failed route, so the page renders nothing for the
 * placeholder (isStaticPlaceholder) and the build step
 * scripts/static-placeholders.mjs deletes what the export wrote for it.
 */
export const STATIC_PLACEHOLDER = "__garden_static_placeholder__";

/**
 * @template T
 * @param {T[]} params what the route really has
 * @param {T} placeholder the same shape with every value set to STATIC_PLACEHOLDER
 * @returns {T[]}
 */
export function staticParams(params, placeholder) {
  return params.length === 0 && process.env.STATIC_EXPORT === "1" ? [placeholder] : params;
}

/** True for the placeholder value, or a catch-all path that starts with it. */
export function isStaticPlaceholder(value) {
  return value === STATIC_PLACEHOLDER || (Array.isArray(value) && value[0] === STATIC_PLACEHOLDER);
}
