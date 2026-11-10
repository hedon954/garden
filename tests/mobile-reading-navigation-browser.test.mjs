import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { probeBrowser, waitForBrowserCondition } from "./browser-fixture.mjs";
import { writeReadingNavigationFixture } from "./reading-navigation-fixture.mjs";

const root = path.resolve(import.meta.dirname, "..");
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium"].find(file => file && fs.existsSync(file));

test("long-article contents stays reachable through the sticky header at every reading position, with and without JS", { skip: !chrome, timeout: 240_000 }, async () => {
  const evidence = path.join(root, ".garden/mobile-reading-navigation-evidence");
  fs.mkdirSync(evidence, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, ".garden/mobile-reading-navigation-"));
  const site = process.env.GARDEN_TOC_SITE ? path.resolve(process.env.GARDEN_TOC_SITE) : dir;
  let server;
  try {
    if (!process.env.GARDEN_TOC_SITE) {
      writeReadingNavigationFixture(dir);
      const log = fs.openSync(path.join(evidence, "build.log"), "w");
      const status = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(root, "bin/garden.mjs"), "build"], { cwd: root,
          env: { ...process.env, GARDEN_SITE: dir, STATIC_EXPORT: "1", GARDEN_OFFLINE: "1", GARDEN_SKIP_EDITORS: "1", CI: "1", GISCUS_DISABLED: "1" }, stdio: ["ignore", log, log] });
        child.once("exit", resolve); child.once("error", reject);
      });
      fs.closeSync(log);
      assert.equal(status, 0, "Neutral long-article build failed: " + path.join(evidence, "build.log"));
    }
    const exported = path.join(site, "dist/client");
    server = http.createServer((req, res) => {
      let file = path.resolve(exported, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
      if (!file.startsWith(exported + path.sep) && file !== exported) { res.writeHead(403).end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
      res.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".txt": "text/plain" })[path.extname(file)] ?? "application/octet-stream");
      res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const width of [300, 344, 375, 430, 900, 1200]) {
      const driver = `${waitForBrowserCondition}
      addEventListener('DOMContentLoaded',()=>{(async()=>{
        await waitFor(()=>window.__VINEXT_RSC_PREFETCH_CACHE__?.size>0,'homepage hydration');
        document.querySelector('a[href*="/blog/rendering-fixture"]').click();
        await waitFor(()=>document.querySelector('.toc-mobile-trigger'),'header control portal after normal Link');
        await document.fonts.ready;
        const pause=()=>new Promise(r=>setTimeout(r,300));
        const header=document.querySelector('.sh-header'),button=document.querySelector('.toc-mobile-trigger'),panel=document.querySelector('.toc');
        const mobile=innerWidth<=900,positions=[];
        function check(condition,message){if(!condition)throw Error(message)}
        function record(label){const b=button.getBoundingClientRect(),h=header.getBoundingClientRect();positions.push({label,scrollY,headerTop:h.top,headerBottom:h.bottom,buttonTop:b.top,buttonBottom:b.bottom,width:b.width,height:b.height});check(document.documentElement.scrollWidth<=document.documentElement.clientWidth,'whole-page horizontal overflow');if(mobile){check(h.top>=-1&&h.top<1,'header stopped following reading');check(b.top>=h.top&&b.bottom<=h.bottom,'control lies over prose, not in header');check(b.width>=44&&b.height>=44,'control touch target below 44px');check(button.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),'control not hit-testable at '+label)}}
        check(document.querySelectorAll('.toc-mobile-trigger').length===1,'duplicate contents controls');
        check(!document.querySelector('.post-reading-page .toc-mobile-trigger'),'article-start duplicate');
        for(const [label,fraction]of[['start',0],['middle',.5],['near-end',.95],['end',1]]){scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*fraction);await pause();record(label)}
        if(mobile){
          // Interact from the article's last paragraph, not an asynchronously populated comments/footer edge.
          document.querySelector('.markdown-body > p:last-child').scrollIntoView({block:'center'});await pause();const before=scrollY,initialHeight=document.documentElement.scrollHeight;button.click();await waitFor(()=>panel.dataset.mobileOpen==='true','contents opens');await pause();
          check(parseFloat(getComputedStyle(panel).paddingBottom)>=52,'drawer lost home-indicator safe area');await waitFor(()=>{const active=panel.querySelector('[aria-current=\"location\"]'),list=panel.querySelector('.toc-list');if(!active)return false;const a=active.getBoundingClientRect(),b=list.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1},'current chapter visible inside drawer');const openedY=scrollY,openedHeight=document.documentElement.scrollHeight;const links=[...panel.querySelectorAll('a[href]')].filter(link=>link.getClientRects().length&&getComputedStyle(link).visibility!=='hidden'),first=panel.querySelector('button'),last=links.at(-1);last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));check(document.activeElement===first,'dialog Tab does not remain inside');
          window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await waitFor(()=>panel.dataset.mobileOpen==='false','Escape closes contents');await pause();check(document.activeElement===button,'Escape did not return focus');check(Math.abs(scrollY-before)<2,'Escape lost reading position '+JSON.stringify({before,openedY,after:scrollY,initialHeight,openedHeight,finalHeight:document.documentElement.scrollHeight}));
          button.click();await waitFor(()=>panel.dataset.mobileOpen==='true','reopen at end');
          const link=panel.querySelector('a[href="#reading-section-16"]');link.scrollIntoView({block:'center'});await pause();
          const r=link.getBoundingClientRect();check(r.height>=40,'chapter touch target below 40px');check(link.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),'chapter not hit-testable');link.click();
          await waitFor(()=>location.hash==='#reading-section-16'&&panel.dataset.mobileOpen==='false','chapter selection closes and jumps');await pause();
          const target=document.querySelector('#reading-section-16');check(document.activeElement===target,'selection did not focus reading destination');check(target.getBoundingClientRect().top>=header.getBoundingClientRect().bottom-1,'selected heading hidden by header');record('selected-middle');
          scrollBy(0,450);await pause();record('continued-reading');
          button.click();await waitFor(()=>panel.dataset.mobileOpen==='true','reopen during continued reading');panel.querySelector('.toc-mobile-close').click();await waitFor(()=>panel.dataset.mobileOpen==='false','close button');
          Object.defineProperty(document,'fullscreenEnabled',{value:false,configurable:true});Object.defineProperty(document,'webkitFullscreenEnabled',{value:false,configurable:true});const fullscreen=document.querySelector('.ux-fsb');fullscreen.scrollIntoView({block:'center'});await pause();fullscreen.click();await waitFor(()=>document.querySelector('.ux-fs-on'),'article fullscreen');check(panel.dataset.mobileOpen==='false','fullscreen opened contents');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await waitFor(()=>!document.querySelector('.ux-fs-on'),'Escape exits fullscreen');check(panel.dataset.mobileOpen==='false','Escape opened contents');
        }else{check(getComputedStyle(button).display==='none','mobile control leaked onto desktop');check(getComputedStyle(panel).position==='sticky','desktop contents no longer sticky')}
        window.__gardenProbeResult={positions,mobile,viewport:innerWidth,headerPaddingLeft:getComputedStyle(document.querySelector('.sh-bar')).paddingLeft,headerPaddingRight:getComputedStyle(document.querySelector('.sh-bar')).paddingRight};
      })().catch(error=>{window.__gardenProbeResult={probeError:error.stack}})},{once:true});`;
      const result = await probeBrowser({ chrome, url: base, profileDir: path.join(dir, `profile-${width}`), width, height: 812,
        safeAreaInsets: { top: 0, bottom: 34, left: 24, right: 24 }, initScript: driver, timeoutMs: 45_000 });
      fs.writeFileSync(path.join(evidence, `${width}-js.json`), JSON.stringify(result, null, 2));
      assert.equal(result.positions.length, width <= 900 ? 6 : 4);
      if (width <= 900) { assert.ok(parseFloat(result.headerPaddingLeft) >= 24); assert.ok(parseFloat(result.headerPaddingRight) >= 24); }
    }
    for (const width of [300,344,375,430]) {
      const result = await probeBrowser({ chrome, url: base + "blog/rendering-fixture/", profileDir: path.join(dir, `profile-nojs-${width}`), width, height: 812, scriptingEnabled: false,
        probeExpression: `(()=>{if(document.readyState!=='complete')return;const s=window.__tocTest??={phase:0,time:0};if(Date.now()-s.time<350)return;const button=document.querySelector('.toc-header-nojs'),panel=document.querySelector('.toc'),header=document.querySelector('.sh-header');if(!button||!panel)return;function fail(message){return{probeError:message}}if(!s.phase){scrollTo(0,document.documentElement.scrollHeight*.6);s.phase=1;s.time=Date.now();return}if(s.phase===1){const b=button.getBoundingClientRect(),h=header.getBoundingClientRect();if(b.width<44||b.height<44||b.top<h.top||b.bottom>h.bottom)return fail('no-JS persistent touch entry');if(!button.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)))return fail('no-JS header entry not hit-testable');button.click();s.phase=2;s.time=Date.now();return}if(s.phase===2){if(getComputedStyle(panel).visibility!=='visible')return fail('no-JS contents did not open');panel.querySelector('a[href="#reading-section-32"]').click();s.phase=3;s.time=Date.now();return}if(s.phase===3){if(location.hash!=='#reading-section-32'||getComputedStyle(panel).visibility!=='hidden')return fail('no-JS chapter jump/close');s.selectedY=scrollY;button.click();s.phase=4;s.time=Date.now();return}if(s.phase===4){panel.querySelector('.toc-nojs-close').click();s.phase=5;s.time=Date.now();return}return{noScripting:matchMedia('(scripting:none)').matches,selectedY:s.selectedY,closedY:scrollY,closed:getComputedStyle(panel).visibility==='hidden',duplicateButtons:document.querySelectorAll('.toc-mobile-trigger').length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,headerTop:header.getBoundingClientRect().top}})()` });
      fs.writeFileSync(path.join(evidence, `${width}-nojs.json`), JSON.stringify(result, null, 2));
      assert.equal(result.noScripting, true); assert.equal(result.closed, true); assert.equal(result.duplicateButtons, 0); assert.equal(result.overflow, false);
      assert.ok(result.selectedY > 1000); assert.ok(Math.abs(result.selectedY - result.closedY) < 2, JSON.stringify(result));
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (process.env.GARDEN_KEEP_BROWSER_FIXTURE !== "1") fs.rmSync(dir, { recursive: true, force: true });
  }
});
