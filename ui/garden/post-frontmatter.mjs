import { isMap, isScalar, parseDocument } from "yaml";

/** Change only the pinned scalar; the rest of the author's source stays byte exact. */
export function withPostPinned(source, pinned) {
  const opening = /^\uFEFF?---[ \t]*\r?\n/u.exec(source);
  if (!opening) throw new Error("博文缺少 YAML Front Matter。");
  const rest = source.slice(opening[0].length);
  const closing = /^---[ \t]*(?:\r?\n|$)/mu.exec(rest);
  if (!closing) throw new Error("博文 Front Matter 没有结束分隔线。");
  const yaml = rest.slice(0, closing.index);
  const doc = parseDocument(yaml, { uniqueKeys: true });
  if (doc.errors.length || !isMap(doc.contents)) throw new Error("博文 Front Matter 必须是有效的 YAML 对象。");
  const pair = doc.contents.items.find((item) => isScalar(item.key) && item.key.value === "pinned");
  let next = yaml;
  if (pair) {
    if (!isScalar(pair.value) || typeof pair.value.value !== "boolean" || !pair.value.range) throw new Error("pinned 必须是布尔值。");
    if (pair.value.value === pinned) return source;
    const [start, end] = pair.value.range;
    next = yaml.slice(0, start) + String(pinned) + yaml.slice(end);
  } else {
    if (!pinned) return source;
    if (doc.contents.flow) {
      const start = doc.contents.range[0] + 1;
      next = yaml.slice(0, start) + ` pinned: true${doc.contents.items.length ? "," : ""}` + yaml.slice(start);
    } else {
      const eol = opening[0].endsWith("\r\n") ? "\r\n" : "\n";
      next = yaml + (yaml && !yaml.endsWith("\n") ? eol : "") + `pinned: true${eol}`;
    }
  }
  return opening[0] + next + rest.slice(closing.index);
}
