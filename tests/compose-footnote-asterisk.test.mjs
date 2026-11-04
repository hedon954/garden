import assert from "node:assert/strict";
import test from "node:test";
import { parseCompose } from "../ui/compose/parse.mjs";
import { renderCompose } from "../ui/compose/render.mjs";

test("caption/text keep a lone leading asterisk (footnote marker)", () => {
  const caption = parseCompose(`<caption size="sm" align="start">* 假设 11/01 的发送记录已超过完整的 7×24 小时。</caption>`);
  assert.equal(caption.ok, true);
  assert.equal(caption.doc.nodes[0].type, "caption");
  assert.equal(caption.doc.nodes[0].text, "* 假设 11/01 的发送记录已超过完整的 7×24 小时。");
  assert.match(renderCompose(caption.doc), /\*\s*假设 11\/01/u);

  const text = parseCompose(`<text>* 注：仍保留星号</text>`);
  assert.equal(text.ok, true);
  assert.equal(text.doc.nodes[0].text, "* 注：仍保留星号");
});

test("real markdown list lines outside phrasing leaves still strip markers", () => {
  const stack = parseCompose(`<stack gap={2}>\n* one\n* two\n</stack>`);
  assert.equal(stack.ok, true);
  const kids = stack.doc.nodes[0].children.filter((n) => n.type === "text");
  assert.deepEqual(
    kids.map((n) => n.text),
    ["one", "two"],
  );
});

test("7-day legend pins tip with justify=between and footnote keeps *", () => {
  const body = `<stack align="stretch" gap={3}>
  <row justify="between" align="start" wrap="nowrap" gap={1}>
    <caption size="sm" align="start">11/01、11/03 已发送</caption>
    <text size="sm" tone="tip" align="end">11/08 起可再次发送*</text>
  </row>
  <caption size="sm" align="start">* 假设 11/01 的发送记录已超过完整的 7×24 小时。</caption>
</stack>`;
  const parsed = parseCompose(body);
  assert.equal(parsed.ok, true);
  const html = renderCompose(parsed.doc);
  assert.match(html, /data-justify="between"/u);
  assert.match(html, /g-compose-text"[^>]*data-tone="tip"[^>]*>11\/08 起可再次发送\*/u);
  assert.match(html, /g-compose-caption-inline[^>]*>\* 假设 11\/01/u);
});
