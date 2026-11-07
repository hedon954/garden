import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const engine=new URL('../',import.meta.url).pathname;
const valid='---\ntitle: Fixture\ndescription: Fixture description\ndate: 2026-11-07\ndraft: true\n---\n```garden compose\n<card><title>Fixture</title><text>Valid</text></card>\n```\n';
function setup(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-diff-'));fs.mkdirSync(path.join(root,'content/posts'),{recursive:true});return root;}
function write(root,name,text=valid){const full=path.join(root,name);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,text);}
function git(root,...args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;}
function init(root){git(root,'init','-q');git(root,'add','.');git(root,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','fixture');}
function run(root,args=['--diff']){return spawnSync(process.execPath,[path.join(engine,'scripts/check-site.mjs'),...args],{cwd:root,env:{...process.env,GARDEN_SITE:root},encoding:'utf8'});}
test('diff covers staged, unstaged, untracked and renamed destinations; skips unchanged/deleted/outside content and reads working tree',()=>{
 const root=setup();
 try{
  for(const name of ['staged','unstaged','renamed','deleted'])write(root,`content/posts/${name}.md`);
  write(root,'content/posts/unchanged-invalid.md','bad baseline');init(root);
  assert.equal(run(root).status,0);assert.match(run(root).stdout,/No changed Markdown/);
  write(root,'content/posts/staged.md',valid+'\nStaged.');git(root,'add','content/posts/staged.md');
  write(root,'content/posts/staged.md',valid.replace('<card><title>Fixture</title><text>Valid</text></card>','白话待编译'));
  write(root,'content/posts/unstaged.md',valid+'\nUnstaged.');
  git(root,'mv','content/posts/renamed.md','content/posts/重命名 destination.md');
  fs.unlinkSync(path.join(root,'content/posts/deleted.md'));
  write(root,'content/posts/新增 draft with spaces.md');write(root,'outside.md','not a post');
  const r=run(root);assert.equal(r.status,1);assert.match(r.stdout,/4 changed Markdown/);assert.match(r.stdout,/重命名 destination.md/);assert.match(r.stdout,/新增 draft with spaces.md/);
  assert.doesNotMatch(r.stdout,/unchanged-invalid|deleted\.md|outside\.md/);assert.match(r.stderr,/compose-uncompiled/);
  assert.match(fs.readFileSync(path.join(root,'.garden/ui-fix-prompt.md'),'utf8'),/白话待编译/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('non-Git and unborn repositories fail safely without checking everything',()=>{
 const root=setup();try{write(root,'content/posts/bad.md','invalid');let r=run(root);assert.equal(r.status,2);assert.match(r.stderr,/Cannot select/);assert.doesNotMatch(r.stdout,/all content/);git(root,'init','-q');assert.equal(run(root).status,2);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('make -j check diff performs one diff check and never invokes legacy sync/build',()=>{
 const root=setup();try{
  write(root,'content/posts/bad-baseline.md','invalid');init(root);write(root,'content/posts/new valid.md');
  fs.copyFileSync(path.join(engine,'templates/site/Makefile'),path.join(root,'Makefile'));fs.mkdirSync(path.join(root,'tools'));
  const fake=path.join(root,'tools/npx');
  fs.writeFileSync(fake,`#!/usr/bin/env node\nconst fs=require('node:fs'),cp=require('node:child_process');const args=process.argv.slice(2).filter(a=>a!=='--no-install');fs.appendFileSync('commands.txt',JSON.stringify(args)+'\\n');if(args[1]!=='verify')process.exit(77);const r=cp.spawnSync(process.execPath,[${JSON.stringify(path.join(engine,'scripts/check-site.mjs'))},...args.slice(2)],{stdio:'inherit',env:process.env});process.exit(r.status??1);\n`);fs.chmodSync(fake,0o755);
  const r=spawnSync('make',['-j4','check','diff'],{cwd:root,env:{...process.env,GARDEN_SITE:root,PATH:path.join(root,'tools')+path.delimiter+process.env.PATH},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/1 changed Markdown/);assert.equal(fs.readFileSync(path.join(root,'commands.txt'),'utf8').trim(),'["garden","verify","--diff"]');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
