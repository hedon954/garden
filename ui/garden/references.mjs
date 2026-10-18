/**
 * The site a reference points to, shown after its title: the link's host
 * without a leading "www.". Empty for missing or unparsable links.
 */
export function referenceDomain(url) {
  if (typeof url !== "string" || !url.trim()) return "";
  try {
    const { hostname, protocol } = new URL(url.trim());
    if (protocol !== "http:" && protocol !== "https:") return "";
    return hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Short lists stay in one column; two columns start at this many entries. */
export const REFERENCE_SPLIT_AT = 6;

export function referenceColumns(count) {
  return count >= REFERENCE_SPLIT_AT ? 2 : 1;
}
