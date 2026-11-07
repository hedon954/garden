import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {managedSkillBundle} from '../scripts/managed-skills.mjs';
import {parseCompose,renderCompose} from '../ui/compose/index.mjs';
import {looksLikeDilPlay,parsePlayCompose} from '../ui/compose/dil.mjs';
import {compileUiBlock} from '../ui/core/compile.mjs';

const engineRoot=new URL('../',import.meta.url).pathname;
const kit=path.join(engineRoot,'.agents/skills/garden-compose');
const refs=['visual-selection.md','composition-patterns.md'];
const read=name=>fs.readFileSync(path.join(kit,'references',name),'utf8');

test('both locale bundles include byte-identical selection and composition references',()=>{
 for(const lang of ['zh','en']){
  const bundle=managedSkillBundle({engineRoot,name:'garden-compose',lang});
  for(const name of refs){
   assert.deepEqual(bundle['references/'+name],fs.readFileSync(path.join(kit,'references',name)));
   assert.ok(bundle['SKILL.md'].toString().includes('references/'+name));
  }
 }
});

test('selection guidance preserves no-drawing, source-backed relations and compositional boundaries',()=>{
 const selection=read('visual-selection.md'),composition=read('composition-patterns.md');
 assert.match(selection,/Keep ordinary|保留 Markdown/);
 assert.match(selection,/没有因果就不画因果箭头/);
 assert.match(selection,/Suggestion-only|建议请求只给形式与理由/);
 assert.match(selection,/Honor an explicit requested effect/);
 assert.match(selection,/No arbitrary SVG\/canvas/);
 assert.match(composition,/containers|Scene\/container/);
 assert.match(composition,/Do not force every relation into cards/);
 assert.match(composition,/source-backed directional relation/);
 assert.match(composition,/Play supports a restricted lowercase component subset/);
 for(const lang of ['zh','en']){
  const skill=managedSkillBundle({engineRoot,name:'garden-compose',lang})['SKILL.md'].toString();
  assert.match(skill,/没有.*不画|Keep ordinary prose\/lists/);
  assert.match(skill,/不机械套|instead of copying a rigid/);
  assert.match(skill,/每条连接有依据|justify every connector/);
 }
});

test('every new reference example parses, renders and passes the authoritative check wrapper',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'compose-selection-'));
 const renderRoot=fs.mkdtempSync(path.join(engineRoot,'node_modules','.selection-render-'));
 try{
  fs.mkdirSync(path.join(root,'node_modules/.bin'),{recursive:true});
  fs.symlinkSync(path.join(engineRoot,'bin/garden.mjs'),path.join(root,'node_modules/.bin/garden'));
  fs.writeFileSync(path.join(root,'package.json'),'{"private":true}');
  const file=path.join(renderRoot,'render.cjs');
  await build({stdin:{contents:'import "./ui/react/components/layout";import "./ui/react/components/inputs";import "./ui/react/components/display";import {UiRuntime} from "./ui/react/runtime";import {createElement} from "react";import {renderToStaticMarkup} from "react-dom/server";export const render=payload=>renderToStaticMarkup(createElement(UiRuntime,{payload}));',resolveDir:engineRoot,loader:'tsx'},bundle:true,packages:'external',platform:'node',format:'cjs',jsx:'automatic',outfile:file,logLevel:'silent'});
  const renderPlay=createRequire(import.meta.url)(file).render;
  let staticCount=0,playCount=0;
  for(const name of refs){
   const fences=[...read(name).matchAll(/^```garden compose[^\n]*\n([\s\S]*?)^```/gm)];
   for(const [index,fence]of fences.entries()){
    const label=name+':'+(index+1);
    if(looksLikeDilPlay(fence[1])){
     const parsed=parsePlayCompose({id:'selection-example'},fence[1]);
     const compiled=compileUiBlock(parsed.uiSource);
     assert.equal(compiled.check.ok,true,label+JSON.stringify(compiled.check.diagnostics));
     const html=renderPlay(compiled.payload);
     assert.match(html,/席位/);assert.match(html,/月费/);assert.match(html,/72/);
     playCount++;
    }else{
     const parsed=parseCompose(fence[1]);
     assert.equal(parsed.ok,true,label+JSON.stringify(parsed.error));
     const html=renderCompose(parsed.doc);
     assert.ok(html.length>0,label);
     assert.ok(!html.includes('Syntax-only example'),label+' intent must not become display copy');
     staticCount++;
    }
    fs.writeFileSync(path.join(root,'example.md'),fence[0]+'\n');
    const result=spawnSync(process.execPath,[path.join(kit,'scripts/check.mjs'),'example.md'],{cwd:root,env:{...process.env,GARDEN_SITE:root,GARDEN_UI_NO_COPY:'1'},encoding:'utf8'});
    assert.equal(result.status,0,label+result.stderr);
    assert.ok(result.stdout.split('\n').length<5,label+' concise check output');
   }
  }
  assert.equal(staticCount,11);assert.equal(playCount,1);
  assert.equal(fs.existsSync(path.join(root,'.garden/ui-fix-prompt.md')),false);
 }finally{
  fs.rmSync(root,{recursive:true,force:true});
  fs.rmSync(renderRoot,{recursive:true,force:true});
 }
});
