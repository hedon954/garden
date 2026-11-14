import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { assertLayoutViewport } from "./browser-viewport.mjs";
import { probeBrowser } from "./browser-fixture.mjs";
import { writePunctuationFixture } from "./punctuation-fixture.mjs";

const root = path.resolve(import.meta.dirname, "..");
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium"].find(file => file && fs.existsSync(file));

test("inline math keeps punctuation, bounds long formulas locally and never expands the mobile page", { skip: !chrome, timeout: 240_000 }, async () => {
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
    const measure = `function measure() {
      const host=document.querySelector('.markdown-body');
      if(!host||document.readyState!=='complete'||document.fonts.status!=='loaded')return;
      const isolated=[],clusters=[...host.querySelectorAll('.g-keep-punct')];
      const glued=[];
      for(const cluster of clusters){
        const math=cluster.querySelector('.katex-html > .base:last-child');
        if(!math) continue;
        glued.push(cluster);
        const text=cluster.lastChild;
        const range=document.createRange();range.selectNodeContents(text);
        const a=range.getBoundingClientRect();
        const b=math.getBoundingClientRect();
        if(a.top>b.bottom+2||a.bottom<b.top-2)isolated.push({text:text.textContent,top:a.top,mathBottom:b.bottom});
      }
      const scrolling=[];
      for(const box of host.querySelectorAll('.g-keep-punct,.g-inline-math')){
        if(box.scrollWidth<=box.clientWidth+1)continue;
        const left=box.scrollLeft;
        box.focus({preventScroll:true});
        const focusable=document.activeElement===box;
        box.scrollLeft=box.scrollWidth;
        const viewport=box.getBoundingClientRect();
        const range=document.createRange();range.selectNodeContents(box.lastChild);
        const end=range.getClientRects();const last=end[end.length-1];
        scrolling.push({width:viewport.width,scrollWidth:box.scrollWidth,clientWidth:box.clientWidth,focusable,
          moved:box.scrollLeft>0,endVisible:last&&last.right<=viewport.right+1&&last.right>=viewport.left-1});
        box.scrollLeft=left;
      }
      return {width:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
        isolated,scrolling,glueCount:glued.length,mathmlCount:host.querySelectorAll('.katex-mathml math').length};
    }`;
    const driver = `${measure};addEventListener('load',async()=>{await document.fonts.ready;window.__gardenProbeResult=measure()},{once:true});`;
    for (const width of [300,344,375,430,1200]) {
      const result = await probeBrowser({ chrome, url: base, profileDir: path.join(dir, `profile-${width}`), width, height: 900,
        mobile: width < 1200, initScript: driver, timeoutMs: 45_000 });
      fs.writeFileSync(path.join(evidence, `${width}.json`), JSON.stringify(result, null, 2));
      assertLayoutViewport([result.width,result.clientWidth,result.scrollWidth],width);
      assert.deepEqual(result.isolated,[]);
      assert.ok(result.glueCount>=13);
      assert.ok(result.mathmlCount>result.glueCount,'bare formulas must retain MathML too');
      assert.ok(result.scrolling.length>=2,'long formulas, both with and without punctuation, must scroll locally');
      for(const box of result.scrolling){assert.ok(box.focusable&&box.moved&&box.endVisible,JSON.stringify(box));}
    }
    const sweep = await probeBrowser({ chrome, url: base, profileDir: path.join(dir,'profile-sweep'),width:1200,height:900,
      initScript:`${measure};addEventListener('load',async()=>{await document.fonts.ready;const host=document.querySelector('.markdown-body'),failures=[];for(let width=180;width<=430;width++){host.style.width=width+'px';const result=measure();if(result.isolated.length||result.scrollWidth>result.clientWidth)failures.push({width,...result})}window.__gardenProbeResult={failures}},{once:true});` });
    fs.writeFileSync(path.join(evidence,'sweep.json'),JSON.stringify(sweep,null,2));
    assert.deepEqual(sweep.failures,[],'fine-width punctuation/overflow regression');
    // Negative control: removing only the viewport reproduces the old failure
    // on this exact fixture and mobile layout; do not hide the long paragraph.
    const unbounded = await probeBrowser({ chrome,url:base,profileDir:path.join(dir,'profile-unbounded'),width:300,height:900,mobile:true,
      initScript:`${measure};addEventListener('load',async()=>{await document.fonts.ready;const style=document.createElement('style');style.textContent='.markdown-body :is(.g-keep-punct,.g-inline-math){display:inline;max-width:none;overflow:visible;padding:0}';document.head.append(style);window.__gardenProbeResult=measure()},{once:true});` });
    fs.writeFileSync(path.join(evidence,'unbounded-control.json'),JSON.stringify(unbounded,null,2));
    assert.ok(unbounded.scrollWidth>unbounded.clientWidth,'control must expose the long formula, not silently hide it');
    const nojs=await probeBrowser({chrome,url:base,profileDir:path.join(dir,'profile-nojs'),width:300,height:900,mobile:true,scriptingEnabled:false,
      probeExpression:`(()=>{${measure};return measure()})()`});
    fs.writeFileSync(path.join(evidence,'300-nojs.json'),JSON.stringify(nojs,null,2));
    assert.ok(nojs.scrollWidth<=nojs.clientWidth);assert.deepEqual(nojs.isolated,[]);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (process.env.GARDEN_KEEP_BROWSER_FIXTURE !== "1") fs.rmSync(dir, { recursive: true, force: true });
  }
});
