import assert from "node:assert/strict";
import test from "node:test";
import { formatInlineLink, inlineLinkParts, inlineLinkPattern, replaceInlineLinks } from "../ui/garden/markdown-destination.mjs";

const parts = (text) => [...text.matchAll(inlineLinkPattern())].map(inlineLinkParts).map(({ image, label, url, angle, title }) => ({ image, label, url, angle, title }));

test("angle-bracket destinations: spaces, parentheses and %-escapes stay one address", () => {
  assert.deepEqual(parts("![SentenceWindowNodeParser](<https://hedonspace.oss-cn-beijing.aliyuncs.com/img/output%20(1).png>)"), [
    { image: true, label: "SentenceWindowNodeParser", url: "https://hedonspace.oss-cn-beijing.aliyuncs.com/img/output%20(1).png", angle: true, title: "" },
  ]);
  assert.deepEqual(parts('![a](<./my shot (1).png> "t")'), [{ image: true, label: "a", url: "./my shot (1).png", angle: true, title: ' "t"' }]);
  assert.deepEqual(parts("[x](<https://e.com/a b>)"), [{ image: false, label: "x", url: "https://e.com/a b", angle: true, title: "" }]);
  // Unbalanced parentheses are fine inside <…>.
  assert.deepEqual(parts("[x](<https://e.com/a(b>)")[0].url, "https://e.com/a(b");
  assert.deepEqual(parts("![](<>)")[0], { image: true, label: "", url: "", angle: true, title: "" });
});

test("bare destinations: parentheses must balance, and nest", () => {
  assert.equal(parts("[w](https://en.wikipedia.org/wiki/Trie_(data_structure))")[0].url, "https://en.wikipedia.org/wiki/Trie_(data_structure)");
  assert.equal(parts("[y](https://e.com/(a(b))c(d))")[0].url, "https://e.com/(a(b))c(d)");
  // Text right after the closing parenthesis is not part of the address.
  assert.equal(replaceInlineLinks("![x](https://a/b.png)(not)", () => "IMG"), "IMG(not)");
  assert.deepEqual(parts('[a](u "title")')[0], { image: false, label: "a", url: "u", angle: false, title: ' "title"' });
  assert.equal(parts("[a [b] c](u)")[0].label, "a [b] c");
});

test("what CommonMark does not read as a link is left as written", () => {
  for (const text of ["[a](<b)", "[a](b c)", "[a](<b\nc>)", "[a] (b)"]) {
    assert.equal(replaceInlineLinks(text, () => "X"), text, text);
  }
});

test("a rewritten destination keeps its brackets and title", () => {
  const out = replaceInlineLinks('![a](<./x (1).png> "t") [b](./y)', (link) => (link.image ? formatInlineLink(link, "/media/x-1-.png") : undefined));
  assert.equal(out, '![a](</media/x-1-.png> "t") [b](./y)');
  assert.equal(formatInlineLink({ image: false, label: "b", angle: false, title: "" }, "/z"), "[b](/z)");
});

test("the build, the checker and the draft preview read image addresses with this parser, not their own regex", async () => {
  const fs = await import("node:fs");
  const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const file of ["scripts/build-content.mjs", "scripts/check-post.mjs", "app/admin/preview/[...path]/page.tsx", "ui/garden/markdown-links.mjs"]) {
    const source = read(file);
    assert.match(source, /markdown-destination\.mjs/u, file);
    // The old patterns dropped "<" and stopped at the first ")".
    assert.doesNotMatch(source, /<\?\(\[\^\)\\s>\]\+\)>\?|<\?\(https\?|\\\(\(\[\^\)\\s\]\+\)/u, file);
  }
});
