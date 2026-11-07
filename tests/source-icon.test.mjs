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

test("only a source tag with +N truncates its host", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../app/styles/a2.css", import.meta.url), "utf8");
  const tsx = readFileSync(new URL("../app/components/garden/blocks.tsx", import.meta.url), "utf8");
  assert.match(tsx, /list\.length > 1 \? "g-srcs is-multi" : "g-srcs"/u);
  assert.match(css, /\.g-srcs\.is-multi a\.ext\.g-src > span \{ max-width: 14ch; \}/u);
  assert.match(css, /\.g-srcs:not\(\.is-multi\) a\.ext\.g-src \{ max-width: none; \}/u);
  assert.doesNotMatch(css, /^\.markdown-body a\.ext\.g-src > span \{ max-width/mu);
});

test("showcase relations and ordered source metadata survive the Compose migration",async()=>{
 const {readFileSync}=await import("node:fs");const {scanFences}=await import("../ui/garden/parse.mjs");const {parseCompose}=await import("../ui/compose/index.mjs");
 for(const file of ["interface-patterns.md","interface-patterns-en.md"]){
  const md=readFileSync(new URL(`../content/posts/${file}`,import.meta.url),"utf8");
  const docs=scanFences(md).filter(f=>f.info==="garden compose").map(f=>parseCompose(f.body).doc);
  const nodes=[];const walk=items=>items?.forEach(n=>{nodes.push(n);walk(n.children)});docs.forEach(d=>walk(d?.nodes));
  const graph=nodes.find(n=>n.type==="feature"&&n.name==="relations");assert.ok(graph.props.links.some(e=>e.from===3&&e.to===1&&e.style==="dashed"));assert.ok(graph.props.links.some(e=>e.from===2&&e.to===4&&e.style==="dashed"));
  const resources=nodes.find(n=>n.type==="feature"&&n.props.cards);assert.deepEqual(resources.props.cards[1].source.map(s=>s.url),["https://www.gutenberg.org/","https://en.wikipedia.org/wiki/Project_Gutenberg"]);
 }
});

test("resource and citation URLs are collected from static and Play scenes",()=>{
 const scene='<resources><resource href="https://a.org/x"><reference href="https://en.wikipedia.org/wiki/A"/><reference href="https://b.org/"/></resource></resources>';
 const staticSource="```garden compose\n"+scene+"\n```";assert.deepEqual(gardenSourceUrls(staticSource),["https://a.org/x","https://en.wikipedia.org/wiki/A","https://b.org/"]);
 const play="```garden compose\ncaption: Probe\n---\n"+scene+'\n<slider label="n" bind="n" min={1} max={2}/>\n```';assert.deepEqual(gardenSourceUrls(play),gardenSourceUrls(staticSource));
});
