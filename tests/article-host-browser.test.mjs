import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { buildSrcdoc } from "../ui/host.mjs";
import { probeBrowser, waitForBrowserCondition } from "./browser-fixture.mjs";

const root = path.resolve(import.meta.dirname, "..");
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium"].find(file => file && fs.existsSync(file));

test("article host preserves the reading column, long brand, frame width and unobstructed mobile contents", { skip: !chrome, timeout: 180_000 }, async () => {
  const evidence = path.join(root, ".garden/article-host-evidence");
  fs.mkdirSync(evidence, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, ".garden/article-host-"));
  try {
    const css = await postcss([tailwind()]).process(["globals.css", "styles/tokens.css", "styles/a2.css", "styles/shell.css"].map(file => `@import ${JSON.stringify(path.join(root, "app", file))};`).join("\n"), { from: path.join(root, "app/globals.css") });
    const srcdoc = buildSrcdoc({ html: "<p>Sandbox width fixture</p>", js: "requestAnimationFrame(()=>parent.postMessage({source:'host-fixture',padding:getComputedStyle(document.querySelector('p')).paddingRight},'*'))" });
    const driver = `${waitForBrowserCondition}
(async () => {
  await waitFor(() => window.childPadding !== undefined, 'sandbox content measurement');
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const column = document.querySelector('.article-reading-column');
  const body = document.querySelector('.garden-ui-body');
  const trigger = document.querySelector('.toc-mobile-trigger');
  const brand = document.querySelector('.sh-word');
  const header = document.querySelector('.sh-header');
  window.__gardenProbeResult = {
    viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1,
    columnWidth: column.getBoundingClientRect().width,
    bodyWidth: body.getBoundingClientRect().width,
    frameWidth: document.querySelector('iframe').getBoundingClientRect().width,
    brandRight: brand.getBoundingClientRect().right,
    headerHeight: header.getBoundingClientRect().height,
    barHeight: document.querySelector('.sh-bar').getBoundingClientRect().height,
    contentsPosition: getComputedStyle(trigger).position,
    contentsBeforeArticle: trigger.getBoundingClientRect().bottom <= column.getBoundingClientRect().top + 1,
    childPadding: window.childPadding
  };
})().catch(error => { window.__gardenProbeResult = {probeError:error.message}; });`;
    const attr = srcdoc.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css.css}</style><script>addEventListener('message',e=>{if(e.data?.source==='host-fixture')window.childPadding=e.data.padding;});</script>
<header class="sh-header"><div class="sh-bar"><a class="sh-word" href="/">Garden Complete Theme Navigation And Responsive Rendering Fixture</a><nav class="sh-nav"><a href="/blog/">文章</a><a href="/about/">关于</a></nav><div class="sh-tools"><button class="sh-icon sh-search-m">S</button><button class="sh-icon sh-menu-btn">M</button></div></div></header>
<main class="reading-page post-reading-page"><article class="post-article"><div class="article-reading-layout"><button class="toc-mobile-trigger">目录</button><aside class="toc toc-rail"><a href="#fixture">Fixture contents</a></aside><div class="article-reading-column"><div class="markdown-body"><h2 id="fixture">Test article body</h2><p>Normal article text must keep its readable width as side rails yield.</p><div class="ux-fs"><div class="ux-fsbar"><button class="ux-btn">Full screen</button></div><div class="g-play"><figure class="garden-ui" data-frame="none"><div class="garden-ui-body"><iframe class="garden-ui-sandbox" sandbox="allow-scripts" style="height:120px" srcdoc="${attr}"></iframe></div><figcaption>Test caption</figcaption></figure></div></div><p>Article content remains in normal flow.</p></div></div></div></article></main><script>${driver}</script>`;
    const file = path.join(dir, "fixture.html");
    fs.writeFileSync(file, html);
    const measurements = [];
    for (const width of [300,344,375,430,820,1199,1200,1360]) {
      const m = await probeBrowser({ chrome, url: "file://" + file, profileDir: path.join(dir, "profile-" + width), width, height: 1600 });
      measurements.push(m);
      fs.writeFileSync(path.join(evidence, width + ".json"), JSON.stringify(m, null, 2));
    }
    for (const m of measurements) {
      assert.equal(m.overflow, false, JSON.stringify(m));
      assert.ok(m.columnWidth >= Math.min(740, m.viewport - 40) - 1, JSON.stringify(m));
      assert.ok(m.frameWidth >= m.columnWidth - 2, JSON.stringify(m));
      assert.equal(m.childPadding, "0px", JSON.stringify(m));
      assert.ok(m.barHeight >= m.headerHeight - 1, JSON.stringify(m));
      if (m.viewport <= 900) {
        assert.equal(m.contentsPosition, "static", JSON.stringify(m));
        assert.equal(m.contentsBeforeArticle, true, JSON.stringify(m));
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
