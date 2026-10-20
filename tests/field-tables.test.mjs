import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { isFieldTableHeader, rehypeFieldTables } from "../app/lib/rehype-field-tables.mjs";

const html = (md) => String(unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeFieldTables).use(rehypeStringify).processSync(md));

test("field tables are recognised by their Field + Required headers, in zh and en", () => {
  assert.ok(isFieldTableHeader(["字段", "是否必填", "默认值", "说明"]));
  assert.ok(isFieldTableHeader(["Field", "Required", "Default", "Description"]));
  assert.ok(isFieldTableHeader(["字段或标签", "是否必填", "默认值"]));
  assert.ok(isFieldTableHeader(["Field or Tag", "Required", "Default"]));
  assert.equal(isFieldTableHeader(["Fields", "Required", "Default"]), false);
  assert.equal(isFieldTableHeader(["周", "株高", "备注"]), false);
  assert.equal(isFieldTableHeader(["Field", "Type", "Notes"]), false, "needs a Required column");
});

test("field table cells carry their column name and the Required column is marked", () => {
  const out = html("| Field | Required | Description |\n| --- | --- | --- |\n| `url` | Yes | The link |\n");
  assert.match(out, /<table class="field-table">/u);
  assert.match(out, /<th class="ft-req">Required<\/th>/u);
  assert.match(out, /<td data-label="Field"><code>url<\/code><\/td>/u);
  assert.match(out, /<td data-label="Required" class="ft-req">Yes<\/td>/u);
  assert.match(out, /<td data-label="Description">The link<\/td>/u);
});

test("ordinary article tables are left alone, and only the handbook turns the plugin on", () => {
  const out = html("| 周 | 株高 |\n| --- | --- |\n| 第1周 | 4 cm |\n");
  assert.doesNotMatch(out, /field-table|data-label/u);
  const article = readFileSync(new URL("../app/components/MarkdownArticle.tsx", import.meta.url), "utf8");
  assert.match(article, /\.\.\.\(fieldTables \? \[rehypeFieldTables\] : \[\]\)/u);
  const handbook = readFileSync(new URL("../app/components/HandbookView.tsx", import.meta.url), "utf8");
  assert.equal(handbook.match(/<MarkdownArticle [^>]*fieldTables/gu)?.length, 2);
  const css = readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  assert.match(css, /td\.ft-req \{ white-space: nowrap; min-width: 4em; \}/u);
  assert.match(css, /@media \(max-width: 640px\) \{\n  \.table-wrap\.field-wrap/u);
  assert.doesNotMatch(css.slice(css.indexOf("Handbook field tables")), /--blue/u);
});
