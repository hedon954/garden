import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { parseCompose, renderCompose, composeText } from '../ui/compose/index.mjs';
import { looksLikePlayCompose, parsePlayCompose } from '../ui/compose/dil.mjs';
import { compileUiBlock } from '../ui/core/compile.mjs';
import { renderStatic } from '../ui/core/static.mjs';
const content = '## Heading\n\n**bold** _em_ `code` [link](https://example.com) ~~gone~~ <u>under</u>\n\n- one\n- two\n\n|A|B|\n|-|-|\n|1|2|\n\n<details><summary>More</summary><p>HTML body</p></details>';
const body = `caption: probe\n---\n{@body const [n, setN] = DIL.useState(1)}\n<markdown>${content}</markdown>\n~~gone~~ <u>inline</u>\n<slider label="n" min={1} max={2} value={n} onChange={setN}/>`;

test('one Compose scene nests shared Markdown/HTML blocks inside ordinary layout', () => {
 const parsed=parseCompose(`<stack><row><box><markdown>${content}</markdown></box><box><html><div style="padding:12px;border:1px solid gray">Safe HTML</div></html></box></row></stack>`);
 assert.equal(parsed.ok,true,JSON.stringify(parsed.error));
 const html=renderCompose(parsed.doc);
 for(const expected of ['<h2>Heading</h2>','<u>under</u>','<del>gone</del>','<table>','<ul>','<details>','padding:12px'])assert.ok(html.includes(expected),expected);
 assert.match(composeText(parsed.doc),/Heading/);
 assert.ok(!looksLikePlayCompose('<markdown>```\n<Slider/><State/>\n```</markdown>'));
});

test('Play shared content preserves Markdown/HTML and live input IR; SSR and runtime agree',async()=>{
 const parsed=parsePlayCompose({id:'rich'},body);const c=compileUiBlock(parsed.uiSource);
 assert.equal(c.check.ok,true,JSON.stringify(c.check.diagnostics));
 const fallback=renderStatic(c.payload);
 for(const expected of ['<u>under</u>','<u>inline</u>','<del>gone</del>','<table>','<h2>Heading</h2>'])assert.ok(fallback.includes(expected),expected);
 assert.match(renderStatic(c.payload,'text'),/Heading/);
 assert.doesNotMatch(renderStatic(c.payload,'text'),/<u>/);
 const root=new URL('../',import.meta.url).pathname;
 fs.mkdirSync(path.join(root,'.garden'),{recursive:true});const dir=fs.mkdtempSync(path.join(root,'.garden/rich-render-'));
 try{
  const file=path.join(dir,'render.mjs');
  await build({stdin:{contents:'import "./ui/react/components/inputs";import {UiRuntime} from "./ui/react/runtime";import {createElement} from "react";import {renderToStaticMarkup} from "react-dom/server";export const render=payload=>renderToStaticMarkup(createElement(UiRuntime,{payload}));',resolveDir:root,loader:'tsx'},bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',outfile:file,logLevel:'silent'});
  const html=(await import(file)).render(c.payload);
  assert.match(html,/<u>under<\/u>/);assert.match(html,/<u>inline<\/u>/);assert.match(html,/type="range"/);assert.match(html,/value="1"/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('unsafe islands fail official compilation; no raw source escapes validation',()=>{
 for(const source of ['<script>alert(1)</script>','<img src="x" onerror="alert(1)">','<a href="javascript:alert(1)">x</a>']){
  const p=parseCompose(`<markdown>${source}</markdown>`);assert.equal(p.ok,false);assert.equal(p.error.code,'compose-content');
  const play=parsePlayCompose({id:'unsafe'},body.replace(content,source));const c=compileUiBlock(play.uiSource);assert.equal(c.check.ok,false);assert.ok(c.check.diagnostics.some(d=>d.code==='compose-content'));
 }
});
