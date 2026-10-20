/**
 * One icon per site, wherever the site appears (inline link, {source} chip,
 * card sources): the favicon fetched at build time, else the first letter of
 * the registrable domain's main label (en.wikipedia.org -> W, bbc.co.uk -> B).
 */

// Common two-part public suffixes; enough for a fallback letter.
const SECOND_LEVEL = new Set(["co", "com", "net", "org", "gov", "edu", "ac", "or", "ne", "go", "gob", "nic"]);

export function sourceHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./u, "");
  } catch {
    return "";
  }
}

/** The main label of the registrable domain: en.wikipedia.org -> wikipedia. */
export function registrableLabel(host) {
  const parts = String(host ?? "").toLowerCase().replace(/^www\./u, "").split(".").filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  if (/^\d+$/u.test(parts.at(-1))) return parts[0]; // IP address
  const last = parts.at(-1);
  const second = parts.at(-2);
  if (parts.length >= 3 && last.length === 2 && SECOND_LEVEL.has(second)) return parts.at(-3);
  return second;
}

export function sourceLetter(host) {
  const label = registrableLabel(host);
  return label ? [...label][0].toUpperCase() : "·";
}

/** { src } when there is an image, else { letter }. The fetched favicon wins over an author icon. */
export function sourceIcon(url, favicons, explicit) {
  const host = sourceHost(url);
  const fetched = favicons?.[host];
  const src = (typeof fetched === "string" ? fetched : fetched?.file) || (typeof explicit === "string" && explicit ? explicit : "");
  return src ? { src } : { letter: sourceLetter(host) };
}

/** URLs named as card sources inside ```garden card fences, so their favicons get fetched too. */
export function gardenSourceUrls(markdown) {
  const urls = [];
  const fence = /^```garden\s+card\b[^\n]*\n([\s\S]*?)^```/gmu;
  for (const [, body] of String(markdown ?? "").matchAll(fence)) {
    for (const line of body.split("\n")) {
      // `url: …`, `source: …`, or a bare `- …` entry of a source list.
      const m = line.match(/^\s*(?:-\s*)?(?:(?:url|source)\s*:\s*)?["']?(https?:\/\/[^\s"']+)/u);
      if (m) urls.push(m[1]);
    }
  }
  return urls;
}
