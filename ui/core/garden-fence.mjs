/** Author fence identification; all component choices live inside Compose. */
export function gardenKind(fence) {
  return fence.lang === "garden" && /^compose(?:\s|$)/iu.test(fence.info??"") ? "compose" : null;
}
export function gardenInfoId(info) {
  return /(?:^|\s)#([\w-]+)/u.exec(String(info??""))?.[1]??null;
}
