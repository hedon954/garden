import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {isColor} from '../ui/core/color.mjs';
import {parseCompose} from '../ui/compose/parse.mjs';
import {renderCompose} from '../ui/compose/render.mjs';
import {parsePlayCompose} from '../ui/compose/dil.mjs';
import {compileUiBlock} from '../ui/core/compile.mjs';

test('color subset accepts alpha/transparent and rejects CSS injection consistently',()=>{
 for(const value of ['red','rebeccapurple','transparent','currentColor','#abc','#abcd','#123456','#12345678','rgb(10 20 30 / 25%)','rgba(10, 20, 30, 0.4)','hsl(24 80% 50% / .2)']) assert.equal(isColor(value),true,value);
 for(const value of ['url(https://evil.test)','var(--x)','red;background:url(x)','red\" onclick=\"x','rgb(1,2)','rgba(1,2,3,9)','rgb(999 0 0)','rgb(0 1% 2)','hsl(1 2 3)','not-a-color','']) {
  assert.equal(isColor(value),false,value);
  assert.equal(parseCompose(`<card color="${value.replaceAll('"',"'")}">text</card>`).ok,false,value);
  const b=parsePlayCompose({id:'invalid'},`caption: test\n---\n<Card color={${JSON.stringify(value)}}>text</Card>`);
  assert.equal(compileUiBlock(b.uiSource).check.ok,false,value);
 }
});

test('static two-card layout retains explicit color, transparent background and nested title override',()=>{
 const parsed=parseCompose('<columns color="#302820" backgroundColor="transparent"><card backgroundColor="#b97b3b12"><title color="red">A</title><text>Body A</text></card><card backgroundColor="rgba(185, 123, 59, 0.07)"><title>B</title><text>Body B</text></card></columns>');
 assert.equal(parsed.ok,true,parsed.error?.message);
 const html=renderCompose(parsed.doc);
 assert.match(html,/--compose-color:#302820;color:#302820;background-color:transparent/);
 assert.match(html,/background-color:#b97b3b12/);
 assert.match(html,/--compose-color:red;color:red/);
 assert.match(html,/background-color:rgba\(185, 123, 59, 0.07\)/);
 assert.match(fs.readFileSync(new URL('../ui/compose/compose.css',import.meta.url),'utf8'),/\[data-custom-color\] \*.*\{ color: var\(--compose-color\)/);
});

test('play SSR uses same colors on real generic Card/Columns renderer, no chart widening',async()=>{
 const body='caption: test\n---\n<Columns color="#302820" backgroundColor="transparent"><Card title="A" backgroundColor="#b97b3b12">Body A</Card><Card title="B" color="red" backgroundColor="rgba(185, 123, 59, 0.07)">Body B</Card></Columns>';
 const b=parsePlayCompose({id:'colors'},body); const c=compileUiBlock(b.uiSource);assert.equal(c.check.ok,true,JSON.stringify(c.check.diagnostics));
 const root=path.resolve(new URL('..',import.meta.url).pathname);
 const dir=fs.mkdtempSync(path.join(root,'node_modules','.color-render-'));
 try {
  const file=path.join(dir,'render.cjs');
  await build({stdin:{contents:'import "./ui/react/components/layout";import {UiRuntime} from "./ui/react/runtime";import {createElement} from "react";import {renderToStaticMarkup} from "react-dom/server";export const render=payload=>renderToStaticMarkup(createElement(UiRuntime,{payload}));',resolveDir:root,loader:'tsx'},bundle:true,packages:'external',platform:'node',format:'cjs',jsx:'automatic',outfile:file,logLevel:'silent'});
  const html=createRequire(import.meta.url)(file).render(c.payload);
  assert.match(html,/class="garden-ui-columns"/);assert.match(html,/class="garden-ui-card/);
  assert.match(html,/--compose-color:#302820/);assert.match(html,/background-color:transparent/);assert.match(html,/--compose-background:#b97b3b12/);assert.match(html,/--compose-color:red/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
 const bad=parsePlayCompose({id:'chart'},'caption: test\n---\n<State n={1}/><Chart sweep="n" from={1} to={3} color="red"><Line y={n}/></Chart>');assert.equal(compileUiBlock(bad.uiSource).check.ok,false);
});
