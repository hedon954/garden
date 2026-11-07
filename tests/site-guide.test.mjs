import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {installSiteGuide} from '../scripts/site-guide.mjs';
const engineRoot=new URL('../',import.meta.url).pathname;
test('both locale guides install missing-only and preserve custom files/directories/dangling links',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-guide-'));
 try{
  for(const lang of ['zh','en']){
   const siteRoot=path.join(root,lang);assert.equal(installSiteGuide({engineRoot,siteRoot,lang}),true);const target=path.join(siteRoot,'AGENTS.md');const text=fs.readFileSync(target,'utf8');assert.equal(text,fs.readFileSync(path.join(engineRoot,'templates/site',lang==='en'?'AGENTS.en.md':'AGENTS.md'),'utf8'));assert.ok(text.split('\n').length<=100);assert.match(text,/\.agents\/skills\/garden-compose\/SKILL.md/);assert.match(text,/\.agents\/skills\/garden-post-review\/SKILL.md/);assert.match(text,/make check diff/);assert.match(text,/\.garden\//);if(lang==='en')assert.doesNotMatch(text,/[\u3400-\u9fff]/);
   fs.writeFileSync(target,'CUSTOM USER GUIDE');assert.equal(installSiteGuide({engineRoot,siteRoot,lang}),false);assert.equal(fs.readFileSync(target,'utf8'),'CUSTOM USER GUIDE');fs.unlinkSync(target);fs.symlinkSync(path.join(root,'absent'),target);assert.equal(installSiteGuide({engineRoot,siteRoot,lang}),false);assert.equal(fs.existsSync(path.join(root,'absent')),false);fs.unlinkSync(target);fs.mkdirSync(target);assert.equal(installSiteGuide({engineRoot,siteRoot,lang}),false);
  }
  fs.symlinkSync(path.join(root,'zh'),path.join(root,'alias'));assert.throws(()=>installSiteGuide({engineRoot,siteRoot:path.join(root,'alias')}),/symlink destination/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('agents CLI adds only a site guide and preserves it on repeat, without installing skills',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-guide-cli-'));
 try{fs.writeFileSync(path.join(root,'site.config.yaml'),'name: Fixture\nlocale: en_US\n');const invoke=()=>spawnSync(process.execPath,[path.join(engineRoot,'bin/garden.mjs'),'agents'],{cwd:root,env:{...process.env,GARDEN_SITE:root},encoding:'utf8'});assert.equal(invoke().status,0);fs.writeFileSync(path.join(root,'AGENTS.md'),'CUSTOM');const repeat=invoke();assert.equal(repeat.status,0);assert.match(repeat.stdout,/Kept existing/);assert.equal(fs.readFileSync(path.join(root,'AGENTS.md'),'utf8'),'CUSTOM');assert.equal(fs.existsSync(path.join(root,'.agents')),false);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('init routes guide creation through missing-only installer and package includes both templates',()=>{
 const bin=fs.readFileSync(path.join(engineRoot,'bin/garden.mjs'),'utf8');assert.match(bin,/installSiteGuide\(\{ engineRoot: gardenPackageRoot, siteRoot: destination, lang \}\)/);assert.match(bin,/entry.name === "AGENTS.md"/);assert.match(bin,/entry.name === "AGENTS.en.md"/);assert.match(bin,/siteRoot: destinationRoot, lang/);
 const pkg=JSON.parse(fs.readFileSync(path.join(engineRoot,'package.json'),'utf8'));assert.ok(pkg.files.includes('templates'));
});

test('actual init entrypoint selects both guide locales and preserves a preexisting guide',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-guide-init-'));
 try{
  // Isolate unrelated editor/skill installers: tests must not write skill files.
  const harness=path.join(root,'engine');fs.mkdirSync(path.join(harness,'bin'),{recursive:true});fs.mkdirSync(path.join(harness,'scripts'));
  fs.copyFileSync(path.join(engineRoot,'bin/garden.mjs'),path.join(harness,'bin/garden.mjs'));
  for(const name of ['dev-server.mjs','site-guide.mjs','garden-paths.mjs'])fs.symlinkSync(path.join(engineRoot,'scripts',name),path.join(harness,'scripts',name));
  fs.mkdirSync(path.join(harness,'ui'));fs.symlinkSync(path.join(engineRoot,'ui/core'),path.join(harness,'ui/core'));
  fs.writeFileSync(path.join(harness,'scripts/managed-skills.mjs'),'export function installManagedSkills(){return [];}');
  fs.writeFileSync(path.join(harness,'scripts/editors-kit.mjs'),'export async function editorsInstall(){};export async function offerEditorsOnce(){};');
  for(const lang of ['zh','en'])for(const custom of [false,true]){
   const site=path.join(root,`${lang}-${custom}`);if(custom){fs.mkdirSync(site);fs.writeFileSync(path.join(site,'AGENTS.md'),'USER OWNED');}
   const result=spawnSync(process.execPath,[path.join(harness,'bin/garden.mjs'),'init',site,'--locale',lang],{cwd:root,env:{...process.env,GARDEN_SITE:''},encoding:'utf8'});assert.equal(result.status,0,result.stderr);
   const expected=custom?'USER OWNED':fs.readFileSync(path.join(engineRoot,'templates/site',lang==='en'?'AGENTS.en.md':'AGENTS.md'),'utf8');assert.equal(fs.readFileSync(path.join(site,'AGENTS.md'),'utf8'),expected);assert.equal(fs.existsSync(path.join(site,'AGENTS.en.md')),false);assert.equal(fs.existsSync(path.join(site,'.agents')),false);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
