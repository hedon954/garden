import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const engine=new URL('../',import.meta.url).pathname;
const body=(description,block)=>`---\ntitle: Fixture\n${description?'description: Fixture description\n':'description: 42\n'}date: 2026-11-07\ndraft: true\n---\n${block}\n`;
const compiled='```garden compose\n<card><title>Fixture</title><text>Valid content</text></card>\n```';
test('combined preflight sees untracked drafts, passes valid content and still emits skill instructions after structural failure',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'make-check-'));
 try{
  fs.mkdirSync(path.join(root,'content/posts'),{recursive:true});
  const file=path.join(root,'content/posts/draft.md');
  function run(args=[],extra={}){return spawnSync(process.execPath,[path.join(engine,'scripts/check-site.mjs'),...args],{cwd:root,env:{...process.env,GARDEN_SITE:root,...extra},encoding:'utf8'});}
  fs.writeFileSync(file,body(true,compiled));assert.equal(run().status,0);
  const idea=body(false,'```garden compose\n两卡片并排\n```');fs.writeFileSync(file,idea);
  const failed=run();assert.equal(failed.status,1);assert.match(failed.stdout,/invalid-description/);assert.match(failed.stderr,/compose-uncompiled/);assert.match(failed.stderr,/garden-compose skill/);assert.equal(fs.existsSync(path.join(root,'.garden/ui-fix-prompt.md')),false);assert.equal(fs.readFileSync(file,'utf8'),idea);
  fs.writeFileSync(path.join(root,'content/posts/valid.md'),body(true,compiled));assert.equal(run([],{GARDEN_CHECK_FILE:'content/posts/valid.md'}).status,0);
  assert.equal(run(['content/posts/draft.md']).status,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('both site templates and engine make check retain previous stages after strict preflight',()=>{
 for(const name of ['templates/site/Makefile','templates/site/Makefile.en']){
  const text=fs.readFileSync(path.join(engine,name),'utf8');assert.match(text,/check: prepare\n\tnpx --no-install garden verify\n\tnpx garden sync && npx garden build/);assert.match(text,/GARDEN_CHECK_FILE := \$\(value FILE\)/);
 }
 assert.match(fs.readFileSync(path.join(engine,'Makefile'),'utf8'),/check:\n\tnode bin\/garden.mjs verify\n\tnpm run lint && npm test/);
});

test('real make check gates legacy sync/build on preflight and retains success stages',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'make-flow-'));
 try{
  fs.mkdirSync(path.join(root,'content/posts'),{recursive:true});fs.mkdirSync(path.join(root,'node_modules'),{recursive:true});fs.mkdirSync(path.join(root,'tools'));
  fs.copyFileSync(path.join(engine,'templates/site/Makefile'),path.join(root,'Makefile'));
  const fake=path.join(root,'tools/npx');
  fs.writeFileSync(fake,`#!/usr/bin/env node
const fs=require('node:fs'),cp=require('node:child_process');const args=process.argv.slice(2).filter(a=>a!=='--no-install');const cmd=args[1];if(cmd==='verify'){const r=cp.spawnSync(process.execPath,[${JSON.stringify(path.join(engine,'scripts/check-site.mjs'))}],{stdio:'inherit',env:process.env});process.exit(r.status??1);}fs.appendFileSync('legacy-stages.txt',cmd+'\\n');
`);fs.chmodSync(fake,0o755);
  const file=path.join(root,'content/posts/draft.md');
  const run=()=>spawnSync('make',['check'],{cwd:root,env:{...process.env,PATH:path.join(root,'tools')+path.delimiter+process.env.PATH,GARDEN_SITE:root},encoding:'utf8'});
  fs.writeFileSync(file,body(true,compiled));let result=run();assert.equal(result.status,0,result.stderr);assert.equal(fs.readFileSync(path.join(root,'legacy-stages.txt'),'utf8'),'sync\nbuild\n');
  fs.unlinkSync(path.join(root,'legacy-stages.txt'));fs.writeFileSync(file,body(false,'```garden compose\n两卡片并排\n```'));
  result=run();assert.notEqual(result.status,0);assert.match(result.stdout,/invalid-description/);assert.match(result.stderr,/compose-uncompiled/);assert.equal(fs.existsSync(path.join(root,'legacy-stages.txt')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
