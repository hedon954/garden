import {scanFences} from "./parse.mjs";
import {parseCompose} from "../compose/index.mjs";
import {looksLikePlayCompose} from "../compose/dil.mjs";
import {mapNativeScenes} from "../compose/scenes.mjs";

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

/** Resource and citation URLs in actual Compose trees, including native Play scenes. */
export function gardenSourceUrls(markdown) {
  const urls = [];
  const walk = (value,key="") => {
    if(Array.isArray(value))value.forEach(item=>walk(item,key));
    else if(value&&typeof value==="object")Object.entries(value).forEach(([k,v])=>walk(v,k));
    else if((key==="url"||key==="source")&&typeof value==="string"&&/^https?:\/\//u.test(value))urls.push(value);
  };
  const visit = nodes => nodes?.forEach(node=>{if(node.type==="feature")walk(node.props);else visit(node.children);});
  for(const fence of scanFences(markdown)) {
    if(!/^garden compose(?:\s|$)/u.test(fence.info))continue;
    if(looksLikePlayCompose(fence.body))mapNativeScenes(fence.body.replace(/<(markdown|html)>[\s\S]*?<\/\1>/giu,""),source=>{const parsed=parseCompose(source);if(parsed.ok)visit(parsed.doc.nodes);return source;});
    else {const parsed=parseCompose(fence.body);if(parsed.ok)visit(parsed.doc.nodes);}
  }
  return [...new Set(urls)];
}
