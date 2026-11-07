import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {parse as yaml} from 'yaml';
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
   for(const [source,marker] of examples){const parsed=parseCompose(source);assert.equal(parsed.ok,true,JSON.stringify(parsed.error));assert.match(renderCompose(parsed.doc),/garden-block/);const html=render({name:'compose',props:parsed.doc});assert.ok(html.includes(marker),`${marker}: ${html}`);if(source.includes('<u>'))assert.match(html,/<u>/);}
  }finally{await fs.rm(outfile,{force:true});}
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('feature contracts reject discarded attributes, bad references, missing sources and unsafe HTML',()=>{
 for(const source of ['<metric unknown="x"/>','<file/>','<choices><choice-option icon="not-a-real-icon"/></choices>','<relations><entity title="A"/><entity title="B"/><entity title="C"/><edge from="missing" to="A"/></relations>','<resource href="javascript:alert(1)"/>','<icon-list><entry><text><script>x</script></text></entry></icon-list>']){assert.equal(parseCompose(source).ok,false,source);}
 const parsed=parseCompose('<icon-list><entry title="Heading"><text>First</text><text>Second</text></entry></icon-list>');assert.equal(composeText(parsed.doc),'Heading\nFirst\nSecond');
 assert.doesNotMatch(composeText(parsed.doc),/"items"|"text"/);
 const compare=parseCompose('<compare><item><title>One</title><text>First</text><text>Second</text></item><item><text>Other</text></item></compare>');assert.match(renderCompose(compare.doc),/Second/);
});
