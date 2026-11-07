import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {managedSkillBundle} from '../scripts/managed-skills.mjs';
const engineRoot=new URL('../',import.meta.url).pathname;
const kit=path.join(engineRoot,'.agents/skills/garden-compose');
function run(script,args,cwd){return spawnSync(process.execPath,[path.join(kit,'scripts',script+'.mjs'),...args],{cwd,env:{...process.env,GARDEN_SITE:cwd,GARDEN_UI_NO_COPY:'1'},encoding:'utf8'});}
test('English entry point overlays shared kit recursively without writing any skills',()=>{
 const en=managedSkillBundle({engineRoot,name:'garden-compose',lang:'en'}),zh=managedSkillBundle({engineRoot,name:'garden-compose'});
 assert.match(en['SKILL.md'].toString(),/Compile, repair/);
 for(const name of ['scripts/check.mjs','scripts/apply.mjs','references/static-play.md','references/colors.md','references/examples.md'])assert.deepEqual(en[name],zh[name]);
});
test('shipped examples and wrappers pass authoritative CLI checks in an isolated site',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'compose-kit-'));
 try{
  fs.mkdirSync(path.join(root,'node_modules/.bin'),{recursive:true});
  fs.symlinkSync(path.join(engineRoot,'bin/garden.mjs'),path.join(root,'node_modules/.bin/garden'));
  fs.writeFileSync(path.join(root,'package.json'),'{"private":true}');
  const examples=fs.readFileSync(path.join(kit,'references/examples.md'),'utf8');
  const fences=[...examples.matchAll(/^```garden compose[^\n]*\n[\s\S]*?^```/gm)].map(m=>m[0]);
  assert.equal(fences.length,2);
  for(const fence of fences){fs.writeFileSync(path.join(root,'post.md'),fence+'\n');const r=run('check',['post.md'],root);assert.equal(r.status,0,r.stderr);}
  const scan=run('scan',['post.md'],root);assert.equal(scan.status,0,scan.stderr);assert.doesNotThrow(()=>JSON.parse(scan.stdout));
  const prompt=run('prompt',[],root);assert.equal(prompt.status,0,prompt.stderr);assert.match(prompt.stdout,/backgroundColor/);assert.doesNotMatch(prompt.stdout,/不要写(?:脚本、)?色值/);
  fs.writeFileSync(path.join(root,'post.md'),'```garden compose\n两个卡片\n```\n');
  const failed=run('check',['post.md'],root);assert.equal(failed.status,1,failed.stderr);assert.match(fs.readFileSync(path.join(root,'.garden/ui-fix-prompt.md'),'utf8'),/两个卡片/);
  fs.writeFileSync(path.join(root,'replacement.md'),fences[0]);
  const applied=run('apply',['post.md','--at','1','--file','replacement.md'],root);assert.equal(applied.status,0,applied.stderr);
  assert.equal(run('check',['post.md'],root).status,0);
  // Play replacement is validated using the same path as scan/check.
  fs.writeFileSync(path.join(root,'replacement.md'),fences[1]);
  assert.equal(run('apply',['post.md','--at','1','--file','replacement.md'],root).status,0);
  assert.equal(run('check',['post.md'],root).status,0);
  const before=fs.readFileSync(path.join(root,'post.md'),'utf8');
  fs.writeFileSync(path.join(root,'replacement.md'),fences[1].replace('seats * 24','absent * 24'));
  assert.equal(run('apply',['post.md','--at','1','--file','replacement.md'],root).status,1);
  assert.equal(fs.readFileSync(path.join(root,'post.md'),'utf8'),before);

 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
