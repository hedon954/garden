import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {probeBrowser, waitForBrowserCondition} from './browser-fixture.mjs';
const root=path.resolve(import.meta.dirname,'..');
const chrome=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p));
test('shipped standalone preview hydrates Compose native scenes and data without styling the editor or loading Node',{skip:!chrome,timeout:120_000},async()=>{
 fs.mkdirSync(path.join(root,'.garden'),{recursive:true});
 const dir=fs.mkdtempSync(path.join(root,'.garden/editor-browser-'));
 try {
  // A clean checkout has no generated preview. Build the real shipped entry
  // into test-owned output, so stale local artifacts cannot mask regressions.
  const out=path.join(dir,'preview');
  assert.equal(fs.existsSync(out),false,'preview starts unbuilt');
  execFileSync(process.execPath,[path.join(root,'scripts/build-ui-preview.mjs'),out],{cwd:root,stdio:'pipe',timeout:60_000});
  const js=fs.readFileSync(path.join(out,'garden-ui.iife.js'),'utf8'),css=fs.readFileSync(path.join(out,'garden-ui.css'),'utf8');
  assert.doesNotMatch(js,/postcss\/lib|node:fs|node:path|process\.env\.NEXT_PUBLIC_BASE_PATH/);
 const source='caption: Preview test\\n---\\n{@body const [n,setN]=DIL.useState(1)}\\n<button onClick={setN(n+1)}>Increment</button>\\nCounter: {n}\\n<icon-list><entry icon="book-open" title="Editorial heading"><text>Complete test paragraph with <u>underline</u>.</text><text>Second paragraph.</text></entry></icon-list>\\n<choices><choice-option label="A" reply="Selected A"/><choice-option label="B" reply="Selected B"/></choices>\\n<data name="bench" src="./bench.csv"/>\\n<table data={bench} columns={[{key:"name",label:"Name"},{key:"value",label:"Value"}]}/>'.replaceAll('\\n','\n');

  const driver=`${waitForBrowserCondition}
(async()=>{
 await waitFor(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Increment')&&document.querySelector('.g-choice-opt')&&document.body.textContent.includes('24'),'preview mount and CSV data');
 [...document.querySelectorAll('button')].find(b=>b.textContent==='Increment').click();
 document.querySelector('.g-choice-opt').click();
 await waitFor(()=>document.body.textContent.includes('Counter: 2')&&document.querySelector('.g-choice-reply')?.textContent==='Selected A','counter and choice reply');
 const p=document.querySelector('.g-list-x');
 window.__gardenProbeResult={errors,counter:document.body.textContent.includes('Counter: 2'),reply:document.querySelector('.g-choice-reply')?.textContent,underline:document.querySelector('u')?.textContent,body:p&&getComputedStyle(p).fontSize,outside:getComputedStyle(document.getElementById('outside')).fontSize,data:document.body.textContent.includes('24'),error:document.querySelector('.garden-ui-error')?.textContent};
})().catch(error=>{window.__gardenProbeResult={probeError:error.message,errors};});`;
  const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css}</style><p id="outside" style="font:19px Georgia">Editor chrome</p><main style="font:21px Georgia"><div id="mount"></div></main><script>window.errors=[];addEventListener('error',e=>errors.push(e.message))</script><script>${js.replaceAll('</script','<\\/script')}</script><script>GardenUI.render(document.getElementById('mount'),${JSON.stringify(source)},{lang:'en',readFile:()=> ${JSON.stringify('name,value\none,12\ntwo,24')}});${driver}</script>`;
  const file=path.join(dir,'fixture.html');fs.writeFileSync(file,html);
  for(const width of[1100,480]){
   const m=await probeBrowser({chrome,url:'file://'+file,profileDir:path.join(dir,'profile-'+width),width,height:2000});
   assert.deepEqual(m.errors,[]);assert.equal(m.error,undefined);assert.equal(m.counter,true);assert.equal(m.reply,'Selected A');assert.equal(m.underline,'underline');assert.equal(m.body,'21px');assert.equal(m.outside,'19px');assert.equal(m.data,true);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
