import test from "node:test";
import assert from "node:assert/strict";
import { gardenSourceUrls, registrableLabel, sourceIcon, sourceLetter } from "../ui/garden/source-icon.mjs";

test("fallback letter comes from the registrable domain, not the subdomain", () => {
  assert.equal(sourceLetter("en.wikipedia.org"), "W");
  assert.equal(sourceLetter("www.gutenberg.org"), "G");
  assert.equal(sourceLetter("research.google"), "R");
  assert.equal(sourceLetter("news.bbc.co.uk"), "B");
  assert.equal(sourceLetter("a.b.example.com.cn"), "E");
  assert.equal(registrableLabel("openlibrary.org"), "openlibrary");
  assert.equal(sourceLetter(""), "·");
});

test("the same host gets the same mark wherever it appears", () => {
  const favicons = { "en.wikipedia.org": { file: "/fav/w.png" } };
  const urls = ["https://en.wikipedia.org/wiki/A", "https://en.wikipedia.org/wiki/B?x=1", "https://EN.wikipedia.org/"];
  for (const url of urls) assert.deepEqual(sourceIcon(url, favicons), { src: "/fav/w.png" });
  // The fetched favicon wins over an author-supplied icon, so cards match inline links.
  assert.deepEqual(sourceIcon(urls[0], favicons, "/other.png"), { src: "/fav/w.png" });
  assert.deepEqual(sourceIcon("https://de.wikipedia.org/", favicons), { letter: "W" });
  assert.deepEqual(sourceIcon("https://x.org/", {}, "/mine.png"), { src: "/mine.png" });
});

test("card source URLs are collected for favicon fetching", () => {
  const md = "```garden card\ncards:\n  - url: https://a.org/x\n    source:\n      - https://en.wikipedia.org/wiki/A\n      - https://b.org/\n```\n\n```garden stat\nsource: https://no.org/\n```";
  assert.deepEqual(gardenSourceUrls(md), ["https://a.org/x", "https://en.wikipedia.org/wiki/A", "https://b.org/"]);
});
