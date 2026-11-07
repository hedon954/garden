import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {parse as yaml} from 'yaml';
import {parsePlayCompose} from '../ui/compose/dil.mjs';
import {compileUiBlock} from '../ui/core/compile.mjs';
import {renderStatic} from '../ui/core/static.mjs';
import {parseCompose,renderCompose,composeText} from '../ui/compose/index.mjs';
const root=path.resolve(import.meta.dirname,'..');
const examples=[
 ['<resource href="https://example.com" title="Resource" meta="Book"><text><u>Description</u></text><point title="Point"><text>Detail</text></point></resource>','g-entity'],
 ['<metric label="Readers" value="80" unit="people" caption="Measured"/>','g-stat'],
 ['<timeline title="History"><event date="2026" title="Launch"><text>One</text><text>Two</text></event></timeline>','g-timeline'],
 ['<relations title="Network" center="a"><entity id="a" title="A"/><entity id="b" title="B"/><entity id="c" title="C"/><edge from="a" to="b" direction="both" style="dashed" label="Link"/></relations>','g-rel'],
 ['<choices title="Choose"><choice-option icon="shield" value="10" label="A" reply="Good"><text><u>Option</u></text></choice-option><choice-option none label="Neither" reply="Try again"/></choices>','role="radiogroup"'],
 ['<icon-list title="Ideas"><entry icon="book" title="Experiment"><text>First paragraph</text><text>Second paragraph</text></entry></icon-list>','g-list'],
 ['<plot type="bar" title="Data"><datum x="A" y="2"/><datum x="B" y="4"/></plot>','g-chart'],
 ['<compare><item verdict="good"><title>Good</title><text>First</text><text>Second</text></item><item verdict="bad"><title>Bad</title><text>Other</text></item></compare>','g-verdicts'],
 ['<file src="https://example.com/data.csv" title="Data"/>','data-garden-file'],
];
test('native semantic components render through the real app components, not static approximations',async()=>{
 const dir=await fs.mkdtemp(path.join(tmpdir(),'garden-features-'));
 try {
  const config=yaml(await fs.readFile(path.join(root,'site.config.yaml'),'utf8'));
  const configFile=path.join(dir,'site-config.mjs');await fs.writeFile(configFile,`export const siteConfig=${JSON.stringify(config)};export const githubUrl="";export const siteLinks={basePath:""};`);
  const outfile=path.join(root,'.garden',`feature-test-${process.pid}.mjs`);await fs.mkdir(path.dirname(outfile),{recursive:true});
  try {
   await build({stdin:{contents:`import {GardenBlock} from './app/components/garden/GardenBlock';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';export const render=block=>renderToStaticMarkup(createElement(GardenBlock,{dataPayload:encodeURIComponent(JSON.stringify(block))}));`,resolveDir:root,loader:'tsx'},bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',alias:{'@garden/site-config':configFile},outfile,logLevel:'silent'});
   const {render}=await import(outfile);
   for(const [source,marker] of examples){const parsed=parseCompose(source);assert.equal(parsed.ok,true,JSON.stringify(parsed.error));assert.match(renderCompose(parsed.doc),/garden-block/);const html=render({name:'compose',props:parsed.doc});assert.ok(html.includes(marker),`${marker}: ${html}`);if(source.includes('<u>'))assert.match(html,/<u>/);
    const play=parsePlayCompose({id:'scene-test'},`caption: Native scene behavior\n---\n{@body const [n,setN]=DIL.useState(1)}\n${source}\n<slider label="n" min={1} max={3} value={n} onChange={setN}/>`);
    const compiled=compileUiBlock(play.uiSource);assert.equal(compiled.check.ok,true,JSON.stringify(compiled.check.diagnostics));
    const playHtml=render({...play,name:'compose',mode:'play'});assert.ok(playHtml.includes(marker),`${marker}: ${playHtml}`);if(source.includes('<u>'))assert.match(playHtml,/<u>/);
    assert.ok(renderStatic(compiled.payload,'text').length>0);
   }
  }finally{await fs.rm(outfile,{force:true});}
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('feature contracts reject discarded attributes, bad references, missing sources and unsafe HTML',()=>{
 for(const source of ['<metric unknown="x"/>','<file/>','<choices><choice-option icon="not-a-real-icon"/></choices>','<relations><entity title="A"/><entity title="B"/><entity title="C"/><edge from="missing" to="A"/></relations>','<resource href="javascript:alert(1)"/>','<icon-list><entry><text><script>x</script></text></entry></icon-list>']){assert.equal(parseCompose(source).ok,false,source);}
 const parsed=parseCompose('<icon-list><entry title="Heading"><text>First</text><text>Second</text></entry></icon-list>');assert.equal(composeText(parsed.doc),'Heading\nFirst\nSecond');
 assert.doesNotMatch(composeText(parsed.doc),/"items"|"text"/);
 const compare=parseCompose('<compare><item><title>One</title><text>First</text><text>Second</text></item><item><text>Other</text></item></compare>');assert.match(renderCompose(compare.doc),/Second/);
});

test('lowercase sandbox shares the existing isolated JS/CSS runtime and rejects external scripts',()=>{
 const body = html => `caption: Sandbox counter updates\n---\n<sandbox title="Counter" html={${JSON.stringify(html)}} css="p{color:red}" js="document.getElementById('n').textContent='1'"/>`;
 for(const [html,expected] of [['<p id="n">0</p>',true],['<script src="https://example.com/a.js"></script>',false]]){
  const play=parsePlayCompose({id:'sandbox-test'},body(html));assert.equal(compileUiBlock(play.uiSource).check.ok,expected);
 }
});

test('plain comparison lines preserve punctuation, code, emphasis and all paragraphs',()=>{
 const lines=['**FIFO 的优势**：跨度在队列中"陈酿"。','`intra-system communication`: 应用程序内部的交互。'];
 const parsed=parseCompose(`<figure frame="none"><compare>${lines.map(line=>`<item><text>${line}</text></item>`).join('')}</compare></figure>`);
 assert.equal(parsed.ok,true,JSON.stringify(parsed.error));assert.deepEqual(parsed.doc.nodes[0].children[0].props.items,lines);
 for(const line of ['FIFO 的优势','intra-system communication']){assert.ok(composeText(parsed.doc).includes(line));assert.ok(renderCompose(parsed.doc).includes(line));}
});
