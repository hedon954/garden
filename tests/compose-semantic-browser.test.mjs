import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {parse as yaml} from 'yaml';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const root=path.resolve(import.meta.dirname,'..');
const chrome=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p));
test('native scenes hydrate with Play state, rich choices, relation details and isolated sandbox under the complete article theme',{skip:!chrome},async()=>{
 fs.mkdirSync(path.join(root,'.garden'),{recursive:true});
 const evidence=path.join(root,'.garden/semantic-browser-evidence');fs.mkdirSync(evidence,{recursive:true});
 const dir=fs.mkdtempSync(path.join(root,'.garden/semantic-browser-'));
 try{
  const config=path.join(dir,'config.mjs');fs.writeFileSync(config,`export const siteConfig=${JSON.stringify(yaml(fs.readFileSync(path.join(root,'site.config.yaml'),'utf8')))};export const githubUrl='';export const siteLinks={basePath:''};`);
  const prose='这是明确标注的测试正文，用于验证长段落换行、字体继承与窄屏布局，不是用户文章内容。'.repeat(4);
  const source=`caption: Test scenes preserve content and interactions\n---\n{@body const [n,setN]=DIL.useState(1)}
<markdown>### Test article content\n\n**Bold** _emphasis_ [safe link](https://example.com) ~~strike~~ <u>underline</u>\n\n- Markdown list\n\n<details><summary>Details</summary><p>Safe HTML body</p></details></markdown>
<button onClick={setN(n+1)}>Increment</button>\nCounter: {n}
<icon-list title="Test editorial list"><entry icon="book-open" title="Test heading"><text>${prose}</text><text>Independent second test paragraph.</text></entry><entry icon="users" title="Second test heading"><text>${prose}</text></entry></icon-list>
<choices title="Test choices"><choice-option icon="shield" value="42" label="A" reply="Selected A"><text><u>Option body</u></text></choice-option><choice-option label="B" reply="Selected B"/><choice-option none label="Neither" reply="Selected neither"/></choices>
<relations title="Test relations" center="a"><entity id="a" title="Alpha"><text>Alpha detail</text></entity><entity id="b" title="Beta"><text>Beta detail</text></entity><entity id="c" title="Gamma"/><edge from="a" to="b" direction="both" style="dashed" label="Connection"/></relations>
<timeline><event date="2026" title="Test event"><text>Timeline body</text></event></timeline>
<resource title="Test resource" href="https://example.com"><text>Resource body</text><point title="Test point"><text>Point body</text></point></resource>
<metric label="Test metric" value="80" caption="Metric caption" text="Metric body"/>
<compare><item verdict="good"><title>Test good</title><text>Comparison body</text></item><item verdict="bad"><title>Test bad</title><text>Alternative body</text></item></compare>
<sandbox title="Test sandbox" html={${JSON.stringify('<p>Sandbox body</p>')}} js="parent.postMessage({source:'semantic-test',value:'sandbox-ran'},'*')"/>`;
  const entry=`import {createRoot} from 'react-dom/client';import {createElement} from 'react';import{GardenBlock}from './app/components/garden/GardenBlock';import{parsePlayCompose}from './ui/compose/dil.mjs';const block=parsePlayCompose({id:'semantic-browser'},${JSON.stringify(source)});createRoot(document.getElementById('mount')).render(createElement(GardenBlock,{dataPayload:encodeURIComponent(JSON.stringify({...block,name:'compose',mode:'play'}))}));`;
  const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,platform:'browser',format:'iife',jsx:'automatic',write:false,alias:{'@garden/site-config':config},define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_BASE_PATH':'""'},logLevel:'silent'});
  assert.doesNotMatch(bundle.outputFiles[0].text,/postcss\/lib|node:fs|node:path/);
  const css=await postcss([tailwind()]).process(['globals.css','styles/tokens.css','styles/a2.css','styles/shell.css'].map(f=>`@import ${JSON.stringify(path.join(root,'app',f))};`).join('\n'),{from:path.join(root,'app/globals.css')});
  const driver=`window.errors=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('message',e=>{if(e.data?.source==='semantic-test')window.sandboxRan=e.data.value});setTimeout(()=>{const buttons=[...document.querySelectorAll('button')];buttons.find(b=>b.textContent==='Increment')?.click();document.querySelector('.g-choice-opt')?.click();document.querySelector('.g-rel-node')?.click();setTimeout(()=>{const a=document.querySelector('article');const sels=['#article-body','.g-list-x','.g-choice-x','.g-tl-x','.g-entity-b>p','.g-stat-t','.g-verdict p'];const measure=()=>Object.fromEntries(sels.map(q=>{const e=document.querySelector(q),s=e&&getComputedStyle(e);return[q,s?{size:parseFloat(s.fontSize),family:s.fontFamily}:null]}));const semantic=Object.fromEntries(['.g-choice-v','.g-stat-n','.g-stat-c','.g-rel-t','.g-rel-x','.g-list-h'].map(q=>{const e=document.querySelector(q),s=e&&getComputedStyle(e);return[q,s?{size:parseFloat(s.fontSize),family:s.fontFamily}:null]}));const initial=measure();a.style.setProperty('--fs-body','21px');a.style.fontFamily='Georgia, serif';const changed=measure();const row=document.querySelector('.g-list li'),heading=row?.querySelector('.g-list-t'),p=row?.querySelectorAll('.g-list-x');const x=e=>e?.getBoundingClientRect().x;document.getElementById('metrics').textContent=JSON.stringify({errors,initial,changed,semantic,counter:document.body.textContent.includes('Counter: 2'),reply:document.querySelector('.g-choice-reply')?.textContent,selected:document.querySelector('.g-choice-opt')?.getAttribute('aria-checked'),relation:document.querySelector('.g-rel-detail')?.textContent,sandbox:window.sandboxRan,sandboxFlags:document.querySelector('iframe')?.getAttribute('sandbox'),iconRail:{heading:x(heading),paragraphs:[...(p??[])].map(x)},overflow:document.documentElement.scrollWidth>innerWidth});},150)},500);`;
  const file=path.join(dir,'fixture.html');fs.writeFileSync(file,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css.css}</style><article class="markdown-body prose" style="margin:20px;max-width:850px"><p id="article-body">Actual article body baseline</p><div id="mount"></div></article><pre id="metrics"></pre><script>${driver}</script><script>${bundle.outputFiles[0].text.replaceAll('</script','<\\/script')}</script>`);
  for(const width of [1200,500]){
   const result=spawnSync(chrome,['--headless','--disable-gpu','--no-first-run','--disable-background-networking','--virtual-time-budget=3000',`--window-size=${width},2600`,`--user-data-dir=${path.join(dir,'profile-'+width)}`,`--screenshot=${path.join(evidence,'scene-'+width+'.png')}`,'--dump-dom','file://'+file],{encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});assert.equal(result.status,0,result.stderr);
   const match=result.stdout.match(/<pre id="metrics">([^<]+)<\/pre>/);assert.ok(match,result.stdout.slice(-1500));const m=JSON.parse(match[1].replaceAll('&amp;','&'));fs.writeFileSync(path.join(evidence,'scene-'+width+'.json'),JSON.stringify(m,null,2));assert.deepEqual(m.errors,[]);assert.equal(m.counter,true);assert.equal(m.selected,'true');assert.equal(m.reply,'Selected A');assert.match(m.relation,/Alpha/);assert.equal(m.sandbox,'sandbox-ran');assert.equal(m.sandboxFlags,'allow-scripts');assert.equal(m.overflow,false);
   for(const values of [m.initial,m.changed])for(const [key,value] of Object.entries(values)){assert.ok(value,key);assert.equal(value.size,values['#article-body'].size,width+':'+key);assert.equal(value.family,values['#article-body'].family,width+':'+key+' family');}
   assert.ok(m.iconRail.paragraphs.every(x=>Math.abs(x-m.iconRail.heading)<1));
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
