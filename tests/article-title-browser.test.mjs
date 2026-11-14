import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { probeBrowser, removeFixtureDir } from "./browser-fixture.mjs";
import { assertLayoutViewport } from "./browser-viewport.mjs";

const root = path.resolve(import.meta.dirname, "..");
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium"].find((file) => file && fs.existsSync(file));

export const articleTitleCases = {
  short: "随笔丨春日",
  medium: "读书笔记丨《启示录：打造用户喜爱的产品》",
  long: "读书笔记丨这是一段故意写得很长而且没有分隔的完整副标题用来确认到达可读下限之后才允许再换行",
  english: "Notes | A compact English subtitle",
  unsplit: "一篇没有分隔符的短标题",
};

const driver = `function measure(){
  const h=document.querySelector('[data-article-title]');
  if(!h)return;
  const lines=[...h.querySelectorAll('.h1-line')];
  const boxes=line=>{const range=document.createRange();range.selectNodeContents(line);return new Set([...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>Math.round(r.top*2))).size};
  const style=getComputedStyle(h),rule=h.parentElement.querySelector('style[data-article-title-rules]')?.sheet?.cssRules[0]?.style;
  const previous=rule?.fontSize,previousWrap=rule?.whiteSpace;if(rule){rule.removeProperty('font-size');rule.removeProperty('white-space')}
  const maximum=parseFloat(getComputedStyle(h).fontSize);if(previous)rule.fontSize=previous;if(previousWrap)rule.whiteSpace=previousWrap;
  const article=h.closest('article');const bodyNode=article?.querySelector('.markdown-body')||article;
  return {text:lines.map(l=>l.textContent).join('|'),complete:h.textContent,size:parseFloat(style.fontSize),
    body:parseFloat(getComputedStyle(bodyNode||h.parentElement).fontSize),maximum,width:h.getBoundingClientRect().width,
    first:boxes(lines[0]),second:boxes(lines[1]),inner:innerWidth,client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,mounted:!!h.parentElement[Symbol.for('garden.article-title-fit')],
    nowrap:style.whiteSpace};
}
const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const cases=${JSON.stringify(articleTitleCases)};
addEventListener('load',async()=>{try{
  await document.fonts.ready;await settle();
  const samples={};
  const host=document.querySelector('[data-article-host]');
  for(const [name,text] of Object.entries(cases)){
    host[Symbol.for('garden.article-title-fit')]?.dispose();
    if(name==='unsplit'){
      host.innerHTML='<h1 class="p-name">'+text+'</h1>';
      await settle();
      const h=host.querySelector('h1');
      samples[name]={text:h.textContent,size:parseFloat(getComputedStyle(h).fontSize),lines:1,mounted:!!host[Symbol.for('garden.article-title-fit')]};
      continue;
    }
    const parts=text.split(/丨|｜| \\| /u);
    host.innerHTML='<h1 id="at" data-article-title="" class="p-name h1-br"><span class="h1-line">'+parts[0]+'</span><span class="vh">丨</span><span class="h1-line">'+parts[1]+'</span></h1><style data-article-title-rules=""></style>';
    window.mountArticleTitle(host);
    await settle();
    samples[name]=Object.assign(measure(),{expected:parts.join('|')});
  }
  window.__gardenProbeResult=samples;
}catch(error){window.__gardenProbeResult={probeError:String(error),stack:error.stack}}},{once:true});
`;

test("split article titles shrink to keep the remaining title on the second line, and wrap only at the readable floor", { skip: !chrome, timeout: 120_000 }, async () => {
  const evidence = path.join(root, ".garden/article-title-evidence");
  fs.mkdirSync(evidence, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, ".garden/article-title-"));
  let server;
  try {
    const css = await postcss([tailwind()]).process(
      ["globals.css", "styles/tokens.css", "styles/a2.css", "styles/shell.css"].map((file) => `@import ${JSON.stringify(path.join(root, "app", file))};`).join("\n"),
      { from: path.join(root, "app/globals.css") },
    );
    const runtime = `${fs.readFileSync(path.join(root, "ui/garden/feature-title-fit.mjs"), "utf8").replace(/^export /gm, "")}\n${fs.readFileSync(path.join(root, "ui/garden/article-title-fit.mjs"), "utf8").replace(/^import\s+[^;]+;\s*/u, "").replace(/^export /gm, "")}`;
    const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style><article class="post-article h-entry" style="max-width:1200px;margin:0 auto"><header class="article-header article-summary-row hero" data-article-host></header><div class="markdown-body" style="padding:24px 0"><p>Neutral article body for the title floor.</p></div></article><script>${runtime};window.fitTitleSize=fitTitleSize;window.mountArticleTitle=mountArticleTitle;</script>`;
    const file = path.join(dir, "index.html");
    fs.writeFileSync(file, html);
    server = http.createServer((req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(fs.readFileSync(file));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}/`;
    for (const width of [300, 375, 430, 1200]) {
      const samples = await probeBrowser({
        chrome, url, profileDir: path.join(dir, `profile-${width}`), width, height: 900,
        mobile: width < 1200, initScript: driver, includeDiagnostics: true, timeoutMs: 45_000,
        screenshot: path.join(evidence, `title-${width}.png`),
      });
      fs.writeFileSync(path.join(evidence, `title-${width}.json`), JSON.stringify(samples, null, 2));
      assertLayoutViewport([samples.short.inner, samples.short.client, samples.short.scroll], width);
      assert.equal(samples.unsplit.mounted, false);
      assert.equal(samples.unsplit.text, articleTitleCases.unsplit);
      for (const name of ["short", "medium", "long", "english"]) {
        const sample = samples[name];
        assert.ok(sample.mounted, name);
        assert.equal(sample.first, 1, `${name} first line stays one line: ${JSON.stringify(sample)}`);
        assert.ok(sample.size >= sample.body * 1.125 - .02, `${name} stays at or above the body-relative floor: ${JSON.stringify(sample)}`);
        assert.equal(sample.text, sample.expected, `${name} keeps both complete lines: ${JSON.stringify(sample)}`);
      }
      assert.equal(samples.short.second, 1, "short remainder stays on the second line: " + JSON.stringify(samples.short));
      assert.ok(Math.abs(samples.short.size - samples.short.maximum) < .02, "short titles keep the design maximum");
      if (width >= 375) {
        assert.equal(samples.medium.second, 1, `medium remainder stays on the second line at ${width}: ${JSON.stringify(samples.medium)}`);
        assert.equal(samples.english.second, 1, `english remainder stays on the second line at ${width}: ${JSON.stringify(samples.english)}`);
      }
      if (samples.long.second > 1) {
        assert.ok(Math.abs(samples.long.size - samples.long.body * 1.125) < .03, "overlong remainder wraps only at the readable floor: " + JSON.stringify(samples.long));
      }
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await removeFixtureDir(dir);
  }
});
