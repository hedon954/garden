import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {probeBrowser, removeFixtureDir, waitForBrowserCondition} from './browser-fixture.mjs';
import {build} from 'esbuild';
import {parse as yaml} from 'yaml';
import postcss from 'postcss';
import {transformUiContent} from '../ui/core/transform.mjs';
import tailwind from '@tailwindcss/postcss';
import {parseCompose,renderCompose} from '../ui/compose/index.mjs';
const root=path.resolve(import.meta.dirname,'..');
const chrome=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p));
test('native scenes hydrate with Play state, rich choices, relation details and isolated sandbox under the complete article theme',{skip:!chrome,timeout:180_000},async()=>{
 fs.mkdirSync(path.join(root,'.garden'),{recursive:true});
 const evidence=path.join(root,'.garden/semantic-browser-evidence');fs.mkdirSync(evidence,{recursive:true});
 const dir=fs.mkdtempSync(path.join(root,'.garden/semantic-browser-'));
 try{
  const config=path.join(dir,'config.mjs');fs.writeFileSync(config,`export const siteConfig=${JSON.stringify(yaml(fs.readFileSync(path.join(root,'site.config.yaml'),'utf8')))};export const githubUrl='';export const siteLinks={basePath:''};`);
  const nativeHeader=parseCompose('<card><row align="center" justify="between" wrap="nowrap"><title align="start">Test header</title><badge>Weekly</badge></row><text>Header layout fixture</text></card>');assert.equal(nativeHeader.ok,true);
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
  const built=transformUiContent('```garden compose #semantic-browser\n'+source+'\n```');assert.deepEqual(built.errors,[]);
  const compiled=JSON.parse(decodeURIComponent(/data-payload="([^"]+)"/.exec(built.content)[1]));
  const entry=`import {createRoot} from 'react-dom/client';import {createElement} from 'react';import{GardenBlock}from './app/components/garden/GardenBlock';import{parsePlayCompose}from './ui/compose/dil.mjs';const block=location.search.includes('built')?${JSON.stringify(compiled)}:parsePlayCompose({id:'semantic-browser'},${JSON.stringify(source)});createRoot(document.getElementById('mount')).render(createElement(GardenBlock,{dataPayload:encodeURIComponent(JSON.stringify({...block,name:'compose',mode:'play'}))}));`;
  const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,platform:'browser',format:'iife',jsx:'automatic',write:false,alias:{'@garden/site-config':config},define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_BASE_PATH':'""'},logLevel:'silent'});
  assert.doesNotMatch(bundle.outputFiles[0].text,/postcss\/lib|node:fs|node:path/);
  const css=await postcss([tailwind()]).process(['globals.css','styles/tokens.css','styles/a2.css','styles/shell.css'].map(f=>`@import ${JSON.stringify(path.join(root,'app',f))};`).join('\n'),{from:path.join(root,'app/globals.css')});
  // Install the listener before mounting; wait for the iframe's actual output,
  // not just the parent DOM snapshot or an elapsed virtual-time budget.
  // Interacting before this child initialization can interrupt its navigation.
  const driver=`window.errors=[];
window.addEventListener('error',e=>errors.push(e.message));
window.addEventListener('message',e=>{if(e.data?.source==='semantic-test')window.sandboxRan=e.data.value;});
${waitForBrowserCondition}
(async()=>{
 await waitFor(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Increment')&&document.querySelector('.g-choice-opt')&&document.querySelector('.g-rel-node')&&window.sandboxRan==='sandbox-ran', 'interactive scene mount and sandbox postMessage');
 [...document.querySelectorAll('button')].find(b=>b.textContent==='Increment').click();
 document.querySelector('.g-choice-opt').click();
 document.querySelector('.g-rel-node').click();
 await waitFor(()=>document.body.textContent.includes('Counter: 2')&&document.querySelector('.g-choice-reply')?.textContent==='Selected A'&&document.querySelector('.g-rel-detail')?.textContent.includes('Alpha')&&window.sandboxRan==='sandbox-ran', 'counter, choice reply, relation detail and sandbox postMessage');
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const a=document.querySelector('article');
 const sels=['#article-body','.g-list-x','.g-choice-x','.g-tl-x','.g-entity-b>p','.g-stat-t','.g-verdict p'];
 const measure=()=>Object.fromEntries(sels.map(q=>{const e=document.querySelector(q),s=e&&getComputedStyle(e);return[q,s?{size:parseFloat(s.fontSize),family:s.fontFamily}:null]}));
 const semantic=Object.fromEntries(['.g-choice-v','.g-stat-n','.g-stat-c','.g-rel-t','.g-rel-x','.g-list-h'].map(q=>{const e=document.querySelector(q),s=e&&getComputedStyle(e);return[q,s?{size:parseFloat(s.fontSize),family:s.fontFamily}:null]}));
 const header=document.querySelector('.g-compose-row[data-justify="between"]');
    const headerHeading=header?.querySelector('.g-compose-h'),headerBadge=header?.querySelector('.g-compose-badge');
    const hr=header?.getBoundingClientRect(),tr=headerHeading?.getBoundingClientRect(),br=headerBadge?.getBoundingClientRect();
    const headerLayout=hr&&tr&&br?{justify:getComputedStyle(header).justifyContent,align:getComputedStyle(header).alignItems,leftGap:tr.left-hr.left,rightGap:hr.right-br.right,titleWidth:tr.width,rowWidth:hr.width}:null;
    const initial=measure();a.style.setProperty('--fs-body','21px');a.style.fontFamily='Georgia, serif';const changed=measure();
 const row=document.querySelector('.g-list li'),heading=row?.querySelector('.g-list-t'),p=row?.querySelectorAll('.g-list-x');const x=e=>e?.getBoundingClientRect().x;
 window.__gardenProbeResult={headerLayout,errors,initial,changed,semantic,counter:document.body.textContent.includes('Counter: 2'),reply:document.querySelector('.g-choice-reply')?.textContent,selected:document.querySelector('.g-choice-opt')?.getAttribute('aria-checked'),relation:document.querySelector('.g-rel-detail')?.textContent,sandbox:window.sandboxRan,sandboxFlags:document.querySelector('iframe')?.getAttribute('sandbox'),iconRail:{heading:x(heading),paragraphs:[...(p??[])].map(x)},overflow:document.documentElement.scrollWidth>innerWidth};
})().catch(error=>{window.__gardenProbeResult={probeError:error.message,errors,sandbox:window.sandboxRan,counter:document.body.textContent.includes("Counter: 2"),reply:document.querySelector(".g-choice-reply")?.textContent,relation:document.querySelector(".g-rel-detail")?.textContent};});`;
  const file=path.join(dir,'fixture.html');fs.writeFileSync(file,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css.css}</style><article class="markdown-body prose" style="margin:20px;max-width:850px"><p id="article-body">Actual article body baseline</p>${renderCompose(nativeHeader.doc)}<div id="mount"></div></article><pre id="metrics"></pre><script>${driver}</script><script>${bundle.outputFiles[0].text.replaceAll('</script','<\\/script')}</script>`);
  for(const width of [1200,500,430,375,344,300])for(const mode of ["live","built"]){
   const m=await probeBrowser({chrome,url:'file://'+file+'?'+mode,profileDir:path.join(dir,'profile-'+width+'-'+mode),width,height:2600,screenshot:path.join(evidence,'scene-'+width+'-'+mode+'.png')});
   fs.writeFileSync(path.join(evidence,'scene-'+width+'-'+mode+'.json'),JSON.stringify(m,null,2));assert.deepEqual(m.errors,[]);assert.equal(m.counter,true);assert.equal(m.selected,'true');assert.equal(m.reply,'Selected A');assert.match(m.relation,/Alpha/);assert.equal(m.sandbox,'sandbox-ran');assert.equal(m.sandboxFlags,'allow-scripts');assert.equal(m.overflow,false);
   for(const values of [m.initial,m.changed])for(const [key,value] of Object.entries(values)){assert.ok(value,key);assert.equal(value.size,values['#article-body'].size,width+':'+key);assert.equal(value.family,values['#article-body'].family,width+':'+key+' family');}
   assert.ok(m.headerLayout,'native header exists');assert.equal(m.headerLayout.justify,'space-between');assert.equal(m.headerLayout.align,'center');assert.ok(Math.abs(m.headerLayout.leftGap)<2,JSON.stringify(m.headerLayout));assert.ok(Math.abs(m.headerLayout.rightGap)<2,JSON.stringify(m.headerLayout));assert.ok(m.headerLayout.titleWidth<m.headerLayout.rowWidth*.85,JSON.stringify(m.headerLayout));
   assert.ok(m.iconRail.paragraphs.every(x=>Math.abs(x-m.iconRail.heading)<1));
  }
 }finally{await removeFixtureDir(dir);}
});
