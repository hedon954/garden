import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { probeBrowser, removeFixtureDir, waitForBrowserCondition } from "./browser-fixture.mjs";
import { assertLayoutViewport } from "./browser-viewport.mjs";
import { titleCases, writeFeatureTitleFixture } from "./feature-title-fixture.mjs";

const root = path.resolve(import.meta.dirname, "..");
const chrome = [process.env.CHROME_BIN,"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome","/usr/bin/chromium"].find(file=>file&&fs.existsSync(file));
const measure = `function measure() {
  const h=document.querySelector('[data-feature-title]');if(!h)return;
  const summary=h.parentElement.querySelector('[data-feature-summary]');
  const range=document.createRange();range.selectNodeContents(h.querySelector('a'));
  const lines=new Set([...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>Math.round(r.top*2)));
  const style=getComputedStyle(h),rule=h.parentElement.querySelector('style[data-feature-title-rules]')?.sheet?.cssRules[0]?.style;
  const previous=rule?.fontSize;if(rule)rule.removeProperty('font-size');
  const maximum=parseFloat(getComputedStyle(h).fontSize);if(previous)rule.fontSize=previous;
  return {text:h.textContent,size:parseFloat(style.fontSize),summary:parseFloat(getComputedStyle(summary||h.parentElement).fontSize),
    maximum,width:h.getBoundingClientRect().width,lines:lines.size,inner:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
    mounted:!!h.parentElement[Symbol.for('garden.feature-title-fit')]};
}
const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));`;
const hydratedHome = `${waitForBrowserCondition}
async function visitHydratedHome() {
  await waitFor(()=>document.querySelector('.sh-menu-btn')?.onclick,'React header event attachment');
  const origin=performance.timeOrigin;
  document.querySelector('#ft a').click();
  await waitFor(()=>location.pathname.includes('/blog/')&&!document.querySelector('[data-feature-title]'),'article client commit');
  document.querySelector('a[href="/"]').click();
  await waitFor(()=>location.pathname==='/'&&document.querySelector('[data-feature-title]')?.parentElement[Symbol.for('garden.feature-title-fit')],'home client commit');
  if(origin!==performance.timeOrigin)throw Error('hydration readiness reloaded the document');
  await settle();
}`;
const driver = `${measure};${hydratedHome};const cases=${JSON.stringify(titleCases)};
let first;function early(){const result=measure();if(result)first=result;else requestAnimationFrame(early)}requestAnimationFrame(early);
addEventListener('load',async()=>{try{await document.fonts.ready;await settle();const initial=measure(),samples={};await visitHydratedHome();
  for(const [name,text]of Object.entries(cases)){document.querySelector('#ft a').textContent=text;await settle();samples[name]=measure()}
  document.querySelector('#ft a').textContent=cases.medium;await settle();const stableBefore=measure();await settle();const stableAfter=measure();
  const origin=performance.timeOrigin;document.querySelector('#ft a').click();
  let deadline=Date.now()+10000;while(!location.pathname.includes('/blog/')){if(Date.now()>deadline)throw Error('Link did not enter article');await settle()}
  document.querySelector('a[href="/"]').click();deadline=Date.now()+10000;
  while(location.pathname!=='/'||!document.querySelector('[data-feature-title]')?.parentElement[Symbol.for('garden.feature-title-fit')]){if(Date.now()>deadline)throw Error('Link reentry did not mount');await settle()}
  await settle();const reentry=measure();
  history.back();deadline=Date.now()+10000;while(!location.pathname.includes('/blog/')){if(Date.now()>deadline)throw Error('history back');await settle()}
  history.forward();deadline=Date.now()+10000;while(location.pathname!=='/'||!document.querySelector('[data-feature-title]')?.parentElement[Symbol.for('garden.feature-title-fit')]){if(Date.now()>deadline)throw Error('history forward');await settle()}
  await settle();const historyReturn=measure();
  const host=document.querySelector('#ft').parentElement;
  host.querySelector('[data-feature-summary]').remove();dispatchEvent(new Event('resize'));await settle();const noSummary=measure();
  host.querySelector('a').textContent='';await settle();const empty=measure();
  host.querySelector('a').textContent=cases.medium;await settle();
  document.documentElement.style.setProperty('--fs-body','22px');await settle();const largerSummary=measure();
  document.documentElement.style.setProperty('font-size','24px');await settle();const largerRoot=measure();
  document.documentElement.style.removeProperty('--fs-body');document.documentElement.style.removeProperty('font-size');await settle();
  document.documentElement.lang='en';document.body.dataset.theme='editorial';await settle();const theme=measure();
  window.__gardenProbeResult={first,initial,samples,stableBefore,stableAfter,reentry,historyReturn,noSummary,empty,largerSummary,largerRoot,theme,sameDocument:origin===performance.timeOrigin};
}catch(error){window.__gardenProbeResult={probeError:String(error),stack:error.stack}}},{once:true});`;

function assertReadable(sample,width){
  assertLayoutViewport([sample.inner,sample.client,sample.scroll],width);
  assert.ok(sample.size>sample.summary,JSON.stringify(sample));
}

test('featured title measures real text, keeps a readable summary-relative floor and survives normal client reentry', {skip:!chrome,timeout:240_000},async()=>{
  const evidence=path.join(root,'.garden/feature-title-evidence');fs.mkdirSync(evidence,{recursive:true});
  const owned=!process.env.GARDEN_TITLE_SITE;
  const dir=owned?fs.mkdtempSync(path.join(root,'.garden/feature-title-')):path.resolve(process.env.GARDEN_TITLE_SITE);
  let server;
  try{
    if(owned){
      writeFeatureTitleFixture(dir);const log=fs.openSync(path.join(evidence,'build.log'),'w');
      const status=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(root,'bin/garden.mjs'),'build'],{cwd:root,env:{...process.env,GARDEN_SITE:dir,STATIC_EXPORT:'1',GARDEN_OFFLINE:'1',GARDEN_SKIP_EDITORS:'1',CI:'1',GISCUS_DISABLED:'1'},stdio:['ignore',log,log]});child.once('exit',resolve);child.once('error',reject)});
      fs.closeSync(log);assert.equal(status,0,'Neutral title fixture build failed');
    }
    const exported=path.join(dir,'dist/client');
    server=http.createServer((req,res)=>{
      let file=path.resolve(exported,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if(!file.startsWith(exported+path.sep)&&file!==exported){res.writeHead(403).end();return}
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
      res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.txt':'text/plain','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file));
    });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
    for(const width of [300,344,375,430,1200,1920]){
      const result=await probeBrowser({chrome,url,profileDir:path.join(dir,`profile-${width}`),width,height:900,mobile:width<1200,cpuThrottlingRate:width===300?4:undefined,initScript:driver,includeDiagnostics:true,timeoutMs:45_000});
      fs.writeFileSync(path.join(evidence,`${width}.json`),JSON.stringify(result,null,2));
      assert.ok(result.first.mounted,'first visible heading must already be fitted');
      assert.ok(Math.abs(result.first.size-result.initial.size)<.05,'no visible initial fit flash with the same loaded font');
      for(const sample of Object.values(result.samples)){
        assertReadable(sample,width);assert.ok(sample.size>=sample.summary*1.125-.02,JSON.stringify(sample));
        if(sample.lines>1)assert.ok(Math.abs(sample.size-sample.summary*1.125)<.03,'wrap only at readable floor: '+JSON.stringify(sample));
      }
      assert.ok(Math.abs(result.samples.short.size-result.samples.short.maximum)<.02,'short titles keep original design size');
      assert.ok(result.samples.long.lines>1,'long title wraps rather than shrinks below floor');
      assert.equal(result.stableBefore.size,result.stableAfter.size,'observer must settle');
      assert.ok(result.sameDocument,'reentry must use normal client routing, not reload');assertReadable(result.reentry,width);assertReadable(result.historyReturn,width);
      assertReadable(result.noSummary,width);assert.ok(result.empty.size>0);
      assertReadable(result.largerSummary,width);assertReadable(result.largerRoot,width);assertReadable(result.theme,width);
      assert.ok(result.largerRoot.size>=result.largerSummary.size*1.5-.05,'root text preference must not be counter-shrunk');
      assert.deepEqual(result.browserDiagnostics.logs.filter(entry=>entry.level==='error'),[]);
    }
    const fontDriver=`${measure};${hydratedHome};addEventListener('load',async()=>{try{await document.fonts.ready;await settle();await visitHydratedHome();
      const article=document.querySelector('.sh-feature'),host=document.querySelector('#ft').parentElement;article.querySelector('.cover')?.remove();host.style.maxWidth='700px';
      host.style.maxWidth='280px';await settle();const legacyMediumAt280=measure();
      const widths=[];for(const width of [700,480,280]){host.querySelector('#ft a').textContent=width===280?${JSON.stringify(titleCases.long)}:${JSON.stringify(titleCases.medium)};host.style.maxWidth=width+'px';dispatchEvent(new Event('resize'));await settle();widths.push(measure())}
      host.style.maxWidth='400px';document.querySelector('#ft a').textContent='Measure the loaded font width';
      document.documentElement.style.setProperty('--sans','FeatureFixture,serif');await settle();const before=measure();
      const font=new FontFace('FeatureFixture','url(/feature-test-font.woff2)');document.fonts.add(font);await font.load();await document.fonts.ready;await settle();const after=measure();
      window.__gardenProbeResult={legacyMediumAt280,widths,before,after,fontLoaded:document.fonts.check('20px FeatureFixture')};
    }catch(error){window.__gardenProbeResult={probeError:String(error)}}},{once:true});`;
    const font=await probeBrowser({chrome,url,profileDir:path.join(dir,'profile-font'),width:1200,height:900,initScript:fontDriver});
    fs.writeFileSync(path.join(evidence,'font-container.json'),JSON.stringify(font,null,2));
    assert.ok(font.fontLoaded);assert.ok(Math.abs(font.before.size-font.after.size)>.1,'real loaded font metrics must trigger refit');
    for(const sample of [...font.widths,font.after])assertReadable(sample,1200);
    assert.ok(Math.abs(font.widths[0].size-font.widths[0].maximum)<.02,'700px content preserves maximum where the string fits');
    assert.equal(font.widths[2].text,titleCases.long,'narrow container preserves the complete long title');
    assert.ok(font.widths[2].lines>1,'the established long sample must wrap in the narrow container');
    assert.ok(Math.abs(font.widths[2].size-font.widths[2].summary*1.125)<.03,'narrow wrapping stops at the readable floor');
    for(const fallback of ['nojs','no-resize-observer']){
      const result=await probeBrowser({chrome,url,profileDir:path.join(dir,`profile-${fallback}`),width:300,height:900,mobile:true,
        scriptingEnabled:fallback!=='nojs',initScript:fallback==='no-resize-observer'?'window.ResizeObserver=undefined':undefined,
        probeExpression:`(()=>{${measure};if(document.readyState!=='complete')return;return measure()})()`});
      fs.writeFileSync(path.join(evidence,`${fallback}.json`),JSON.stringify(result,null,2));assertReadable(result,300);assert.equal(result.size,result.maximum);assert.ok(!result.mounted);
    }
  }finally{if(server)await new Promise(resolve=>server.close(resolve));if(owned)await removeFixtureDir(dir)}
});
