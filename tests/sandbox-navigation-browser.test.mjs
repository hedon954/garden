import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { probeBrowser, waitForBrowserCondition } from './browser-fixture.mjs';
import { writeRenderingFixture } from './rendering-fixture.mjs';
const root = path.resolve(import.meta.dirname, '..');
const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium'].find(p => p && fs.existsSync(p));

test('real exported theme executes sandbox through normal Links, re-entry, history and direct URLs', { skip: !chrome, timeout: 240000 }, async () => {
  const dir = fs.mkdtempSync(path.join(root, '.garden/navigation-site-'));
  const evidence = path.join(root, '.garden/navigation-browser-evidence');
  fs.mkdirSync(evidence, { recursive: true });
  let server;
  try {
    writeRenderingFixture(dir);
    const log = fs.openSync(path.join(evidence, 'build.log'), 'w');
    const build = spawn(process.execPath, [path.join(root, 'bin/garden.mjs'), 'build'], { cwd: root, env: { ...process.env, GARDEN_SITE: dir, STATIC_EXPORT: '1', GARDEN_OFFLINE: '1', GARDEN_SKIP_EDITORS: '1', CI: '1', GITHUB_ACTIONS: 'true', GISCUS_DISABLED: '1' }, stdio: ['ignore', log, log] });
    const status = await new Promise((resolve, reject) => { build.once('exit', resolve); build.once('error', reject); });
    fs.closeSync(log);
    assert.equal(status, 0, 'Neutral full-theme build failed: ' + path.join(evidence, 'build.log'));
    const exported = path.join(dir, 'dist/client');
    server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let file = path.resolve(exported, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(exported + path.sep) && file !== exported) { res.writeHead(403).end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.txt': 'text/plain', '.svg': 'image/svg+xml' })[path.extname(file)] ?? 'application/octet-stream');
      res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const width of [300, 344, 375, 430, 1200]) for (const mode of ['link', 'direct']) {
      const driver = `
        const events=[];let clicked=0;const snapshots=[];const readyWindows=new WeakSet();
        const emptyDocumentMounts=[];
        new MutationObserver(records=>{for(const record of records){if(record.type==='attributes'&&record.target instanceof HTMLIFrameElement&&record.oldValue==='')emptyDocumentMounts.push('updated-an-empty-srcdoc');for(const node of record.addedNodes??[]){if(!(node instanceof Element))continue;for(const frame of[node,...node.querySelectorAll('iframe')])if(frame instanceof HTMLIFrameElement&&!frame.srcdoc)emptyDocumentMounts.push('inserted-an-empty-srcdoc')}}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['srcdoc'],attributeOldValue:true});
        addEventListener('message',event=>{const frame=document.querySelector('iframe[title="Navigation fixture"]');if(event.source!==frame?.contentWindow)return;if(event.data?.source==='navigation-fixture'){events.push(event.data);if(event.data.type==='ready')readyWindows.add(event.source);if(event.data.type==='clicked')clicked++}if(event.data?.source==='garden-ui-sandbox')events.push(event.data)});
        ${waitForBrowserCondition}
        function pieGeometry(){const pie=document.querySelector('.garden-ui-pie'),legend=pie.querySelector('.garden-ui-legend'),caption=pie.closest('.garden-ui').querySelector(':scope > figcaption');const range=document.createRange();range.selectNodeContents(caption);return{legendBottom:legend.getBoundingClientRect().bottom,pieBottom:pie.getBoundingClientRect().bottom,captionTop:range.getBoundingClientRect().top,values:[...pie.querySelectorAll('.garden-ui-pie-value')].map(n=>n.textContent),overflow:document.documentElement.scrollWidth>innerWidth}}
        async function enter(){await waitFor(()=>document.querySelector('a[href*="/blog/rendering-fixture"]'),'homepage article Link');const a=[...document.querySelectorAll('a')].find(a=>a.pathname.startsWith('/blog/rendering-fixture'));const event=new MouseEvent('click',{bubbles:true,cancelable:true,button:0});a.dispatchEvent(event);if(!event.defaultPrevented)throw Error('Article Link did not perform client navigation')}
        async function exercise(label){await waitFor(()=>document.querySelector('iframe[title="Navigation fixture"]')?.srcdoc.length>100,'prepared sandbox document');const frame=document.querySelector('iframe[title="Navigation fixture"]');await waitFor(()=>readyWindows.has(frame.contentWindow),'sandbox actual script execution');const before=clicked;frame.contentWindow.postMessage({source:'navigation-driver',type:'click'},'*');await waitFor(()=>clicked>before,'sandbox button responds');await waitFor(()=>document.querySelectorAll('.garden-ui-pie-value').length===3,'exact visible pie values');const column=document.querySelector('.article-reading-column');snapshots.push({pie:pieGeometry(),label,height:frame.getBoundingClientRect().height,columnWidth:column.getBoundingClientRect().width,frameWidth:frame.getBoundingClientRect().width,srcdocLength:frame.srcdoc.length,sandbox:frame.getAttribute('sandbox'),overflow:document.documentElement.scrollWidth>innerWidth})}
        addEventListener('DOMContentLoaded',()=>{(async()=>{
          if(${JSON.stringify(mode)}==='link'){
            if(location.pathname!=='/')throw Error('Unexpected document reload during client navigation');
            await waitFor(()=>window.__VINEXT_RSC_PREFETCH_CACHE__?.size>0,'homepage hydration');
            await enter();await exercise('normal-link');
            document.querySelector('a.sh-word').click();await waitFor(()=>location.pathname==='/'&&!document.querySelector('iframe[title="Navigation fixture"]'),'return home');
            await enter();await exercise('re-entry');
            history.back();await waitFor(()=>location.pathname==='/'&&!document.querySelector('iframe[title="Navigation fixture"]'),'history back');
            history.forward();await waitFor(()=>location.pathname.startsWith('/blog/rendering-fixture'),'history forward');await exercise('history-forward');
          }else await exercise('direct');
          const pie=document.querySelector('.garden-ui-pie');pie.querySelector('.garden-ui-pie-label').textContent='A deliberately long neutral legend label that must wrap naturally';for(const item of pie.querySelectorAll('.garden-ui-legend li')){item.style.fontSize='21px';item.style.lineHeight='1.6'};await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const pieStress=pieGeometry();
          window.__gardenProbeResult={pieStress,snapshots,events,clicked,emptyDocumentMounts,userAgent:navigator.userAgent,initialDocument:performance.getEntriesByType('navigation')[0].name};
        })().catch(error=>{const f=document.querySelector('iframe[title="Navigation fixture"]');window.__gardenProbeResult={failure:error.message,events,snapshots,frame:f?{height:f.getBoundingClientRect().height,srcdocLength:f.srcdoc.length}:null}})},{once:true});`;
      const result = await probeBrowser({ chrome, url: base + (mode === 'direct' ? 'blog/rendering-fixture/' : ''), profileDir: path.join(dir, `profile-${width}-${mode}`), width, height: 1800, initScript: driver });
      fs.writeFileSync(path.join(evidence, `${width}-${mode}.json`), JSON.stringify(result, null, 2));
      assert.equal(result.failure, undefined, JSON.stringify(result));
      assert.equal(result.snapshots.length, mode === 'link' ? 3 : 1);
      assert.deepEqual(result.emptyDocumentMounts, [], 'A sandbox must mount one prepared document, not navigate an empty frame first.');
      for (const pie of [...result.snapshots.map(snapshot=>snapshot.pie),result.pieStress]) {
        assert.deepEqual(pie.values,['2','3','5']);
        assert.equal(pie.overflow,false);
        assert.ok(pie.pieBottom >= pie.legendBottom-.5, JSON.stringify({width,pie,reason:'legend escapes pie flow'}));
        assert.ok(pie.captionTop >= pie.legendBottom-.5, JSON.stringify({width,pie,reason:'legend overlaps caption'}));
      }
      for (const snapshot of result.snapshots) {
        assert.equal(snapshot.sandbox, 'allow-scripts');
        assert.equal(snapshot.overflow, false);
        assert.ok(snapshot.columnWidth >= Math.min(740, width - 40) - 1, JSON.stringify({ width, snapshot }));
        assert.ok(snapshot.height > 20 && snapshot.srcdocLength > 100);
      }
      if (mode === 'link') assert.equal(result.initialDocument, base);
    }
    for (const width of [375, 1200]) {
      const noJs = await probeBrowser({ chrome, url: base, profileDir: path.join(dir, `profile-nojs-${width}`), width, height: 1800, scriptingEnabled: false,
        probeExpression: `(()=>{if(document.readyState!=='complete')return;if(location.pathname==='/'){const a=document.querySelector('a[href*=\"/blog/rendering-fixture\"]');if(a&&!window.__gardenNoJsLinkClicked){window.__gardenNoJsLinkClicked=true;a.click()}return}return{text:document.querySelector('.g-compose-card')?.textContent,noScripting:matchMedia('(scripting:none)').matches,tocButton:getComputedStyle(document.querySelector('.toc-mobile-trigger')).display,tocLink:getComputedStyle(document.querySelector('.toc-nojs-trigger')).display,overflow:document.documentElement.scrollWidth>innerWidth,documentUrl:performance.getEntriesByType('navigation')[0].name}})()` });
      fs.writeFileSync(path.join(evidence, `${width}-nojs.json`), JSON.stringify(noJs, null, 2));
      assert.match(noJs.text, /Neutral card title/);
      assert.equal(noJs.noScripting, true);
      assert.equal(noJs.documentUrl, base + 'blog/rendering-fixture/');
      assert.equal(noJs.overflow, false);
      if (width < 900) { assert.equal(noJs.tocButton, 'none'); assert.notEqual(noJs.tocLink, 'none'); }
    }
    fs.writeFileSync(path.join(evidence, 'fixture-path.txt'), dir + '\n');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (process.env.GARDEN_KEEP_BROWSER_FIXTURE !== '1') fs.rmSync(dir, { recursive: true, force: true });
  }
});
