import { parse as parseYaml, stringify } from "yaml";

/**
 * The `garden` fences the authoring tools act on, next to the older
 * `intent` / `ui` ones:
 *   ```garden                      an idea, one sentence to compile before publishing
 *   ```garden interactive #id      a compiled interactive block
 * Other `garden <name>` fences (card, stat, ...) are checked by `garden check`.
 */
export function gardenKind(fence) {
  if (fence.lang !== "garden") return null;
  const [name = ""] = fence.info.split(/\s+/u);
  if (!name) return "idea";
  if (name.toLowerCase() === "interactive") return "interactive";
  return null;
}

/** `#id` on the info line wins over an `id:` key. */
export function gardenInfoId(info) {
  return /(?:^|\s)#([\w-]+)/u.exec(String(info ?? ""))?.[1] ?? null;
}

/** Splits a `garden interactive` body into the YAML keys and the component tree. */
export function splitInteractiveBody(body) {
  const lines = String(body ?? "").replace(/\r\n?/gu, "\n").split("\n");
  const sep = lines.findIndex((line, index) => index > 0 && /^---\s*$/u.test(line));
  if (sep < 0) return { yamlText: lines.join("\n"), children: "", childrenLine: lines.length + 1 };
  return { yamlText: lines.slice(0, sep).join("\n"), children: lines.slice(sep + 1).join("\n"), childrenLine: sep + 2 };
}

/**
 * The `ui` block source a `garden interactive` stands for. The reading page
 * and `garden ui check` both validate this same text, so they cannot disagree.
 */
export function interactiveUiSource({ id, props = {}, children = "" }) {
  const header = {
    id: id || props.id || "interactive",
    caption: props.caption ?? "",
    intent: props.intent ?? "",
    ...(props.expect ? { expect: props.expect } : {}),
  };
  const yaml = stringify(header);
  return { source: `---\n${yaml}---\n${children ?? ""}`, header, childrenLine: yaml.split("\n").length - 1 + 3 };
}

/** Reads one `garden interactive` fence: id, props, ui source and a line mapper. */
export function readInteractiveFence(fence) {
  const { yamlText, children, childrenLine } = splitInteractiveBody(fence.body);
  let props = {};
  let yamlError = null;
  try {
    const parsed = yamlText.trim() ? parseYaml(yamlText) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) props = parsed;
    else yamlError = "YAML 必须是一组键值";
  } catch (error) {
    yamlError = `YAML 解析失败：${error instanceof Error ? error.message.split("\n")[0] : "解析失败"}`;
  }
  const id = gardenInfoId(fence.info) ?? (typeof props.id === "string" ? props.id : null);
  const ui = interactiveUiSource({ id, props, children });
  // A line in the ui source → the line in the Markdown file.
  const toFileLine = (sourceLine) =>
    sourceLine >= ui.childrenLine ? fence.startLine + childrenLine + (sourceLine - ui.childrenLine) : fence.startLine;
  return { id, props, yamlError, source: ui.source, toFileLine };
}
