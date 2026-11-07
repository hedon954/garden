import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
const engine=new URL('../',import.meta.url).pathname;
test('default checks are skill-led and never create or modify a prompt; explicit export remains available',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-check-output-'));
 try{
  fs.mkdirSync(path.join(root,'content/posts'),{recursive:true});
  const promptFile=path.join(root,'.garden/ui-fix-prompt.md');
  const invoke=(script,args=[])=>spawnSync(process.execPath,[path.join(engine,'scripts',script),...args],{cwd:root,env:{...process.env,GARDEN_SITE:root},encoding:'utf8'});
  for(const [name,block,code] of [
   ['intent','```garden compose\nPRIVATE_AUTHOR_INTENT\n```','compose-uncompiled'],
   ['play','```garden compose\ncaption: Example\nintent: PRIVATE_AUTHOR_INTENT\n---\n{@body const value = missing + 1}\n<stat label="Value" value={value} />\n```','ui-'],
  ]){
   fs.writeFileSync(path.join(root,'content/posts/post.md'),'---\ntitle: Example\ndate: 2026-11-07\ndraft: true\n---\n'+block+'\n');
   for(const sentinel of [false,true]){
    if(sentinel){fs.mkdirSync(path.dirname(promptFile),{recursive:true});fs.writeFileSync(promptFile,'Existing user file');}
    const r=invoke('check-site.mjs'),terminal=r.stdout+r.stderr;
    assert.equal(r.status,1,name);assert.match(terminal,/missing-description/);assert.ok(terminal.includes(code),terminal);assert.match(terminal,/content\/posts\/post.md:\d+/);assert.match(terminal,/garden-compose skill/);assert.match(terminal,/\.agents\/skills\/garden-compose\/SKILL.md/);assert.doesNotMatch(terminal,/PRIVATE_AUTHOR_INTENT|## 配方|#### Slider|ui-fix-prompt|no-verify|```/);assert.ok(terminal.split('\n').length<20,terminal);
    if(sentinel)assert.equal(fs.readFileSync(promptFile,'utf8'),'Existing user file');else assert.equal(fs.existsSync(promptFile),false);
   }
   // Old installed wrappers supply --standalone: it must not force an export.
   const legacy=invoke('ui-cli.mjs',['check','content/posts/post.md','--standalone','--no-copy']);assert.equal(legacy.status,1);assert.equal(fs.readFileSync(promptFile,'utf8'),'Existing user file');assert.doesNotMatch(legacy.stderr,/ui-fix-prompt/);
   const exported=invoke('ui-cli.mjs',['check','content/posts/post.md','--out','.garden/export.md','--standalone']);assert.equal(exported.status,1);
   const prompt=fs.readFileSync(path.join(root,'.garden/export.md'),'utf8');assert.match(prompt,/PRIVATE_AUTHOR_INTENT/);assert.match(prompt,/## 配方/);assert.ok(prompt.length>20000);
   fs.unlinkSync(promptFile);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
