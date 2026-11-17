import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { markdownPlugins } from "../app/lib/markdown-plugins.ts";
import { rehypeKeepPunctuation } from "../ui/garden/rehype-keep-punctuation.mjs";
import { probeBrowser, removeFixtureDir } from "./browser-fixture.mjs";

const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium"].find((file) => file && fs.existsSync(file));
const root = path.resolve(import.meta.dirname, "..");
const longLead = "前面还有很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长的中文，好让窄栏排到行尾。";

const source = `希望也能给你带来收获~

${longLead}那真的是恭喜你了 💐~

每天拥有 2~5 个小时，见[文档](https://example.com/path)。这是**重点**。公式 $S$。

大量的文章和教程都在说，解决这些问题的关键就是要<u>建立一个全面且准确的离线评测系统，以及搭建一个嗅觉灵敏的线上实时监控系统，这样你能第一时间发现 Agent 能力的回退并及时纠正</u>。`;

const plainSource = `${longLead}那真的是恭喜你了 💐~`;

function render(markdown, keep) {
  return renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: markdownPlugins,
    rehypePlugins: keep ? [rehypeRaw, rehypeKatex, rehypeKeepPunctuation] : [rehypeRaw, rehypeKatex],
  }, markdown));
}

test("sentence-end punctuation stays on the same line as the last grapheme at narrow and wide widths", { skip: !chrome, timeout: 120_000 }, async () => {
  const dir = fs.mkdtempSync(path.join(root, ".garden/sentence-end-punctuation-"));
  const evidence = path.join(root, ".garden/sentence-end-punctuation-evidence");
  fs.mkdirSync(evidence, { recursive: true });
  const mathCss = fs.readFileSync(path.join(root, "ui/garden/inline-math.css"), "utf8");
  const glued = render(source, true);
  const plain = render(plainSource, false);
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
:root { --ink-soft: #222; --muted: #666; }
body { margin: 0; }
.probe-col { color: var(--ink-soft); font-size: 17px; line-height: 1.8; overflow-wrap: anywhere; word-break: normal; }
${mathCss}
</style></head><body>
<article id="glued" class="probe-col markdown-body">${glued}</article>
<article id="plain" class="probe-col">${plain}</article>
<p id="repro-plain" class="probe-col">那真的是恭喜你了 💐~</p>
<p id="repro-glued" class="probe-col">${render("那真的是恭喜你了 💐~", true).replace(/^<p>|<\/p>\s*$/g, "")}</p>
</body></html>`;
  const page = path.join(dir, "index.html");
  fs.writeFileSync(page, html);
  fs.writeFileSync(path.join(evidence, "fixture.html"), html);
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(fs.readFileSync(page));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const measure = `function lastRect(node){
    const range=document.createRange();
    if(node.nodeType===3){ const i=Math.max(0,node.textContent.length-1); range.setStart(node,i); range.setEnd(node,node.textContent.length); }
    else range.selectNode(node);
    return range.getBoundingClientRect();
  }
  function firstRect(node){
    const range=document.createRange();
    if(node.nodeType===3){ range.setStart(node,0); range.setEnd(node, Math.min(1,node.textContent.length)); }
    else range.selectNode(node.firstChild||node);
    return range.getBoundingClientRect();
  }
  function isolatedIn(root){
    const isolated=[];
    for(const cluster of root.querySelectorAll('.g-keep-punct')){
      const texts=[...cluster.childNodes].filter(n=>n.nodeType===3 && /\\S/.test(n.textContent));
      const punctNode=texts.at(-1)||cluster.lastChild;
      const headNode=cluster.firstChild;
      if(!punctNode||!headNode) continue;
      const punct=lastRect(punctNode);
      const head=firstRect(headNode.nodeType===3?headNode:headNode);
      if(punct.height && head.height && (punct.top>head.bottom+2 || punct.bottom<head.top-2)) isolated.push({text:cluster.textContent,punctTop:punct.top,headBottom:head.bottom});
    }
    return isolated;
  }
  function findTilde(root){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node, last=null;
    while((node=walker.nextNode())){
      const i=node.textContent.lastIndexOf('~');
      if(i>=0) last={node,i};
    }
    return last;
  }
  function tildeIsolation(root){
    const last=findTilde(root);
    if(!last) return {found:false};
    const text=last.node.textContent;
    const segs=[...new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(text.slice(0,last.i))];
    const prev=segs.at(-1);
    const tilde=document.createRange(); tilde.setStart(last.node,last.i); tilde.setEnd(last.node,last.i+1);
    const before=document.createRange();
    if(prev){ before.setStart(last.node,prev.index); before.setEnd(last.node,prev.index+prev.segment.length); }
    else if(last.node.previousSibling){ before.selectNode(last.node.previousSibling); }
    else return {found:true,isolated:false};
    const t=tilde.getBoundingClientRect(), b=before.getBoundingClientRect();
    return {found:true,isolated: !!(t.height&&b.height&&(t.top>b.bottom+2||t.bottom<b.top-2)), tildeTop:t.top, beforeBottom:b.bottom, beforeTop:b.top};
  }
  function tightenBetweenEmojiAndTilde(root){
    root.style.width='2000px';
    const last=findTilde(root);
    if(!last) return {target:null};
    const text=last.node.textContent;
    const segs=[...new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(text.slice(0,last.i))];
    const prev=segs.at(-1);
    if(!prev) return {target:null};
    const emoji=document.createRange(); emoji.setStart(last.node,prev.index); emoji.setEnd(last.node,prev.index+prev.segment.length);
    const tilde=document.createRange(); tilde.setStart(last.node,last.i); tilde.setEnd(last.node,last.i+1);
    const start=document.createRange(); start.setStart(last.node,0); start.setEnd(last.node,1);
    const left=start.getBoundingClientRect().left;
    const emojiRight=emoji.getBoundingClientRect().right;
    const pairRight=tilde.getBoundingClientRect().right;
    const target=((emojiRight+pairRight)/2)-left;
    root.style.width=Math.max(1,target)+'px';
    return {target,emojiWidth:emojiRight-emoji.getBoundingClientRect().left,pairAdvance:pairRight-left};
  }
  function measure(colWidth){
    const glued=document.getElementById('glued');
    const plain=document.getElementById('plain');
    glued.style.width=colWidth+'px';
    plain.style.width=colWidth+'px';
    return {
      colWidth,
      glueCount: glued.querySelectorAll('.g-keep-punct').length,
      isolated: isolatedIn(glued),
      gluedTilde: tildeIsolation(glued),
      plainTilde: tildeIsolation(plain),
      repro: (()=>{ const plainEl=document.getElementById('repro-plain'); const gluedEl=document.getElementById('repro-glued'); const tight=tightenBetweenEmojiAndTilde(plainEl); if(tight.target) gluedEl.style.width=Math.max(1,tight.target)+'px'; return {tight,plain:tildeIsolation(plainEl),glued:tildeIsolation(gluedEl),gluedOverflow:gluedEl.scrollWidth>gluedEl.clientWidth+1}; })(),
      overflow: glued.scrollWidth>glued.clientWidth+1,
      scrollWidth: glued.scrollWidth,
      clientWidth: glued.clientWidth,
      hasRange: /2~5/.test(glued.textContent),
      rangeKeptProse: ![...glued.querySelectorAll('.g-keep-punct')].some(n=>n.textContent.includes('2~5')||n.textContent==='2~'),
      hasUrl: !!glued.querySelector('a[href="https://example.com/path"]'),
      highlightWrap: (()=>{
        const headU=glued.querySelector('u[data-hl-part="head"]');
        const tailU=glued.querySelector('u[data-hl-part="tail"]');
        if(!headU||!tailU) return {ok:false,reason:'missing split u'};
        const prevText=headU.previousSibling;
        const leadRange=document.createRange();
        leadRange.setStart(prevText,prevText.textContent.length-1);
        leadRange.setEnd(prevText,prevText.textContent.length);
        const firstRange=document.createRange();
        firstRange.setStart(headU.firstChild,0);
        firstRange.setEnd(headU.firstChild,1);
        const leadRect=leadRange.getBoundingClientRect();
        const firstRect=firstRange.getBoundingClientRect();
        const rects=headU.getClientRects();
        const keepParent=tailU.closest('.g-keep-punct');
        const keepStyle=getComputedStyle(keepParent);
        return {
          ok:true,
          sameStartLine: Math.abs(leadRect.top - firstRect.top) <= 4,
          lineCount: rects.length,
          keepDisplay: keepStyle.display,
          keepOverflowX: keepStyle.overflowX,
          keepScrolling: keepParent.scrollWidth > keepParent.clientWidth + 1
        };
      })()
    };
  }`;
  const driver = `${measure};addEventListener('load',async()=>{await document.fonts.ready;window.__gardenProbeResult=measure(new URLSearchParams(location.search).get('w')||'300')},{once:true});`;
  try {
    for (const width of [280, 375, 740, 1200]) {
      const result = await probeBrowser({
        chrome,
        url: `${url}?w=${width}`,
        profileDir: path.join(dir, `profile-${width}`),
        width: Math.max(width + 40, 400),
        height: 900,
        mobile: width < 800,
        initScript: driver,
        timeoutMs: 45_000,
      });
      fs.writeFileSync(path.join(evidence, `${width}.json`), JSON.stringify(result, null, 2));
      assert.ok(result.glueCount >= 4, `glueCount ${result.glueCount} at ${width}`);
      assert.equal(result.hasRange, true);
      assert.equal(result.hasUrl, true);
      assert.equal(result.rangeKeptProse, true, `mid-range 2~5 was clustered at ${width}`);
      assert.deepEqual(result.isolated, [], `isolated punctuation inside a keep cluster at ${width}`);
      assert.equal(result.gluedTilde.isolated, false, `glued ASCII tilde wrapped alone at ${width}: ${JSON.stringify(result.gluedTilde)}`);
      assert.equal(result.overflow, false, `column overflow at ${width}: ${result.scrollWidth}/${result.clientWidth}`);
      assert.equal(result.highlightWrap.ok, true, `highlight split missing at ${width}: ${JSON.stringify(result.highlightWrap)}`);
      assert.equal(result.highlightWrap.keepDisplay, "inline", `keep-punct should stay inline for prose at ${width}`);
      assert.equal(result.highlightWrap.keepOverflowX, "visible", `keep-punct should not create scroll box for prose at ${width}`);
      assert.equal(result.highlightWrap.keepScrolling, false, `highlight should wrap instead of scrolling at ${width}`);
      if (width === 740) {
        assert.equal(result.highlightWrap.sameStartLine, true, `highlight broke onto a new line at 740px: ${JSON.stringify(result.highlightWrap)}`);
        assert.ok(result.highlightWrap.lineCount >= 2, `long highlight should wrap across multiple lines at 740px: ${JSON.stringify(result.highlightWrap)}`);
      }
      if (width === 280) {
        assert.ok(result.repro.tight?.target > 0, `could not size the tilde repro: ${JSON.stringify(result.repro)}`);
        assert.equal(result.repro.plain.isolated, true, `control did not wrap a lone tilde: ${JSON.stringify(result.repro)}`);
        assert.equal(result.repro.glued.isolated, false, `glued tight tilde still wrapped alone: ${JSON.stringify(result.repro)}`);
        assert.equal(result.repro.gluedOverflow, false, `glued tight cluster overflowed: ${JSON.stringify(result.repro)}`);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await removeFixtureDir(dir);
  }
});
