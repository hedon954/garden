/**
 * The same handbook page in the other language, worked out from the address
 * in the browser so a basePath (/repo/garden/...) stays in front.
 * /garden/x/ ⇄ /garden/en/x/. Returns null outside the handbook.
 */
export function swapHandbookLang(pathname: string, target: "zh" | "en"): string | null {
  const match = /^(.*?\/garden)(\/en)?(\/.*)?$/u.exec(pathname);
  if (!match) return null;
  const rest = match[3] ?? "/";
  return target === "en" ? `${match[1]}/en${rest}` : `${match[1]}${rest}`;
}
