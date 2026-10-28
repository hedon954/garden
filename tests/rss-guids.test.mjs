import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const baseline = JSON.parse(fs.readFileSync(new URL("./fixtures/rss-guids-0.5.14.json", import.meta.url), "utf8"));
// Posts added to the example site after 0.5.14: new guids, in the same shape.
const ADDED_SINCE = [
  "/blog/windowsill-herbs-kit/",
  "/blog/note/note-ddd-awareness/",
  "/blog/note/note-unit-testing-excerpt/",
  "/blog/note/note-unit-testing/",
  "/blog/note/note-rust-atomics-and-locks/",
  "/blog/note/note-fosa/",
  "/blog/note/note-llm-from-scratch/",
  "/blog/note/note-obsidian/",
];

function feed(xml) {
  const origin = xml.match(/<channel>\s*<title>[^<]*<\/title>\s*<link>([^<]+)<\/link>/u)?.[1];
  assert.ok(origin, "the channel link names the site address");
  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/gu)].map(([item]) => ({
    link: item.match(/<link>([^<]+)<\/link>/u)[1],
    guid: item.match(/<guid isPermaLink="true">([^<]+)<\/guid>/u)[1],
  }));
  return { origin, items };
}

function assertGuidsUnchanged(xml, { trailing }) {
  const { origin, items } = feed(xml);
  const guids = items.map((item) => item.guid);
  for (const path of baseline.guids) assert.ok(guids.includes(`${origin}${path}`), `0.5.14 guid ${path} is still there, byte for byte`);
  const added = guids.filter((guid) => !baseline.guids.includes(guid.slice(origin.length)));
  assert.deepEqual(added.map((guid) => guid.slice(origin.length)), ADDED_SINCE);
  for (const { link, guid } of items) {
    // The link follows trailingSlash; the guid does not.
    assert.equal(link, trailing ? guid : guid.replace(/\/$/u, ""), link);
  }
}

test("the feed's guids are the ones 0.5.14 published (server build, links without the slash)", () => {
  const xml = fs.readFileSync(new URL("../public/rss.xml", import.meta.url), "utf8");
  const trailing = /"trailingSlash":true/u.test(fs.readFileSync(new URL("../.garden/site-config.ts", import.meta.url), "utf8"));
  assertGuidsUnchanged(xml, { trailing });
});

const exported = new URL("../dist/client/rss.xml", import.meta.url);
const isStaticExport = fs.existsSync(exported) && fs.existsSync(new URL("../dist/client/index.html", import.meta.url));

test("the static export's feed keeps the 0.5.14 guids, links with the slash", { skip: !isStaticExport && "no static export in dist/client" }, () => {
  assertGuidsUnchanged(fs.readFileSync(exported, "utf8"), { trailing: true });
});

test("the 0.5.14 baseline is the example site's feed, nothing else", () => {
  assert.equal(baseline.origin, "https://example.github.io");
  assert.equal(baseline.guids.length, 13);
  for (const path of baseline.guids) assert.match(path, /^\/(blog|thoughts)\/[a-z0-9-]+(\/[a-z0-9-]+)?\/$/u);
});
