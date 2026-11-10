import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { probeBrowser, waitForBrowserCondition } from "./browser-fixture.mjs";
import { writePunctuationFixture } from "./punctuation-fixture.mjs";

const root = path.resolve(import.meta.dirname, "..");
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium"].find(file => file && fs.existsSync(file));

test("closing punctuation after inline math does not occupy its own line, and short lines do not overflow the page", { skip: !chrome, timeout: 240_000 }, async () => {
  const evidence = path.join(root, ".garden/inline-math-punctuation-evidence");
  fs.mkdirSync(evidence, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, ".garden/inline-math-punctuation-"));
  let server;
  try {
    writePunctuationFixture(dir);
    const log = fs.openSync(path.join(evidence, "build.log"), "w");
    const status = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(root, "bin/garden.mjs"), "build"], { cwd: root,
        env: { ...process.env, GARDEN_SITE: dir, STATIC_EXPORT: "1", GARDEN_OFFLINE: "1", GARDEN_SKIP_EDITORS: "1", CI: "1", GISCUS_DISABLED: "1" }, stdio: ["ignore", log, log] });
      child.once("exit", resolve); child.once("error", reject);
    });
    fs.closeSync(log);
    assert.equal(status, 0, "Neutral punctuation fixture build failed: " + path.join(evidence, "build.log"));
    const exported = path.join(dir, "dist/client");
    server = http.createServer((req, res) => {
      let file = path.resolve(exported, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
      if (!file.startsWith(exported + path.sep) && file !== exported) { res.writeHead(403).end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
      res.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".txt": "text/plain" })[path.extname(file)] ?? "application/octet-stream");
      res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}/blog/punctuation-fixture/`;
    const widths = [300, 344, 375, 430, 1200];
    const driver = `${waitForBrowserCondition}
    addEventListener('DOMContentLoaded',()=>{(async()=>{
      await waitFor(()=>document.querySelector('.markdown-body'),'article');
      await document.fonts.ready;
      const closing=/^[,.;:!?，。、；：！？）)\\]】》〉」』’”'…]/u;
      const article=document.querySelector('article')||document.querySelector('.markdown-body');
      const isolated=[];
      const walker=document.createTreeWalker(article,NodeFilter.SHOW_TEXT);
      for(let node;node=walker.nextNode();){
        if(!closing.test(node.nodeValue))continue;
        const range=document.createRange();range.setStart(node,0);range.setEnd(node,1);
        const box=range.getBoundingClientRect();
        const cluster=node.parentElement?.closest('.g-keep-punct');
        const previous=cluster||node.previousElementSibling;
        if(!previous)continue;
        const prev=previous.getBoundingClientRect();
        if(box.top>prev.bottom+2)isolated.push({text:node.nodeValue.slice(0,2),top:box.top,prevBottom:prev.bottom,width:innerWidth});
      }
      const longHeading=[...document.querySelectorAll('h2')].find(h=>/Long formula|长公式/.test(h.textContent));
      const long=longHeading?.nextElementSibling;
      if(long) long.hidden=true;
      const overflow=document.documentElement.scrollWidth-document.documentElement.clientWidth;
      if(long) long.hidden=false;
      const longCluster=long?.querySelector('.g-keep-punct');
      const longRange=longCluster&&document.createRange();
      if(longRange){const t=[...longCluster.childNodes].find(n=>n.nodeType===3);if(t){longRange.setStart(t,0);longRange.setEnd(t,t.nodeValue.length)}}
      const punctBox=longRange?.getBoundingClientRect();
      const mathBox=longCluster?.querySelector('.katex')?.getBoundingClientRect();
      window.__gardenProbeResult={
        width:innerWidth,
        isolated,
        overflow,
        glueCount:document.querySelectorAll('.g-keep-punct').length,
        longPunctFollowsFormula:Boolean(punctBox&&mathBox&&punctBox.top<=mathBox.bottom+2)
      };
    })().catch(error=>{window.__gardenProbeResult={probeError:error.stack}})},{once:true});`;
    const results = {};
    for (const width of widths) {
      const result = await probeBrowser({ chrome, url: base, profileDir: path.join(dir, `profile-${width}`), width, height: 900, initScript: driver, timeoutMs: 45_000 });
      fs.writeFileSync(path.join(evidence, `${width}.json`), JSON.stringify(result, null, 2));
      results[width] = result;
      assert.deepEqual(result.isolated, [], JSON.stringify({ width, isolated: result.isolated }));
      assert.equal(result.glueCount > 0, true);
      assert.ok(result.longPunctFollowsFormula, "long formula lost its trailing punctuation at "+width);
      if (width !== 1200) assert.ok(result.overflow <= 1, "whole-page overflow at " + width + ": " + result.overflow);
    }
    // Also sweep finer widths around a narrow note box by shrinking the article in-page.
    const sweep = await probeBrowser({
      chrome, url: base, profileDir: path.join(dir, "profile-sweep"), width: 430, height: 900, timeoutMs: 45_000,
      initScript: `${waitForBrowserCondition}
      addEventListener('DOMContentLoaded',()=>{(async()=>{
        await waitFor(()=>document.querySelector('.markdown-body'),'article');
        await document.fonts.ready;
        const host=document.querySelector('.markdown-body');
        const closing=/^[,.;:!?，。、；：！？）)\\]】》〉」』’”'…]/u;
        const isolated=[];
        for(let width=180;width<=430;width++){
          host.style.width=width+'px';
          const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);
          for(let node;node=walker.nextNode();){
            if(!closing.test(node.nodeValue))continue;
            const range=document.createRange();range.setStart(node,0);range.setEnd(node,1);
            const box=range.getBoundingClientRect();
            const cluster=node.parentElement?.closest('.g-keep-punct');
            const previous=cluster||node.previousElementSibling;
            if(!previous)continue;
            const prev=previous.getBoundingClientRect();
            if(box.top>prev.bottom+2)isolated.push({width,text:node.nodeValue.slice(0,2)});
          }
        }
        window.__gardenProbeResult={isolated,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
      })().catch(error=>{window.__gardenProbeResult={probeError:error.stack}})},{once:true});`,
    });
    fs.writeFileSync(path.join(evidence, "sweep.json"), JSON.stringify(sweep, null, 2));
    assert.deepEqual(sweep.isolated, [], JSON.stringify(sweep.isolated));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (process.env.GARDEN_KEEP_BROWSER_FIXTURE !== "1") fs.rmSync(dir, { recursive: true, force: true });
  }
});
