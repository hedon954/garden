import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
const engine=new URL('../',import.meta.url).pathname;
test('human checks show diagnostics/path only while standalone prompt keeps source and complete catalog',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-check-output-'));
 try{
  fs.mkdirSync(path.join(root,'content/posts'),{recursive:true});
  for(const [name,block,code] of [
   ['intent','```garden compose\nPRIVATE_AUTHOR_INTENT\n```','compose-uncompiled'],
   ['play','```garden compose\ncaption: Example\nintent: PRIVATE_AUTHOR_INTENT\n---\n{@body const value = missing + 1}\n<stat label="Value" value={value} />\n```','ui-'],
  ]){
   fs.writeFileSync(path.join(root,'content/posts/post.md'),'---\ntitle: Example\ndate: 2026-11-07\ndraft: true\n---\n'+block+'\n');
   const r=spawnSync(process.execPath,[path.join(engine,'scripts/check-site.mjs')],{cwd:root,env:{...process.env,GARDEN_SITE:root},encoding:'utf8'});const terminal=r.stdout+r.stderr;
   assert.equal(r.status,1,name);assert.match(terminal,/missing-description/);assert.ok(terminal.includes(code),terminal);assert.match(terminal,/content\/posts\/post.md:\d+/);assert.match(terminal,/\.garden\/ui-fix-prompt.md/);assert.doesNotMatch(terminal,/PRIVATE_AUTHOR_INTENT|## 配方|#### Slider|no-verify|```/);assert.ok(terminal.split('\n').length<20,terminal);
   const prompt=fs.readFileSync(path.join(root,'.garden/ui-fix-prompt.md'),'utf8');assert.match(prompt,/PRIVATE_AUTHOR_INTENT/);assert.match(prompt,/## 配方/);assert.ok(prompt.length>20000);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
