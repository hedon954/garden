import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readGeneratedCache, writeGeneratedCache } from '../scripts/generated-cache.mjs';
import { readImageCache } from '../scripts/image-sizes.mjs';
import { readLinkCache, linkAssetsForRender } from '../scripts/link-assets.mjs';
test('legacy cache seeds preserve exact bytes, are idempotent, and never overwrite newer private data',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-cache-'));
 try{
  const image='{"version":1,"images":{"https://example.com/a.png":{"width":1200,"height":800}}}\n';
  fs.writeFileSync(path.join(root,'image-sizes.json'),image);assert.equal(readImageCache(root).images['https://example.com/a.png'].width,1200);
  const file=path.join(root,'.garden/image-sizes.json');assert.equal(fs.readFileSync(file,'utf8'),image);const before=fs.statSync(file).mtimeMs;readImageCache(root);assert.equal(fs.statSync(file).mtimeMs,before);
  writeGeneratedCache(root,'image-sizes.json',{images:{newer:{width:2,height:3}}});assert.equal(readImageCache(root).images.newer.width,2);assert.equal(fs.readFileSync(path.join(root,'image-sizes.json'),'utf8'),image);
  assert.equal(writeGeneratedCache(root,'image-sizes.json',{images:{newer:{width:2,height:3}}}),false);
  fs.writeFileSync(file,'broken');assert.deepEqual(readImageCache(root).images,{},'corrupt private file is not silently overwritten with stale legacy data');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('warm migrated metadata and local assets work offline; cold caches degrade without invented metadata',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-cache-offline-'));
 try{
  assert.deepEqual(readImageCache(root),{images:{}});assert.deepEqual(linkAssetsForRender(root),{favicons:{},cards:{}});
  fs.mkdirSync(path.join(root,'public/link-assets/fav'),{recursive:true});fs.writeFileSync(path.join(root,'public/link-assets/fav/example.ico'),'icon');
  const data={version:1,favicons:{'example.com':{file:'/link-assets/fav/example.ico'}},cards:{'https://example.com/post':{title:'Preserved',description:'Offline fallback'}}};
  const raw=JSON.stringify(data);fs.writeFileSync(path.join(root,'link-assets.json'),raw);assert.deepEqual(readLinkCache(root),data);assert.equal(fs.readFileSync(path.join(root,'.garden/link-assets.json'),'utf8'),raw);
  fs.unlinkSync(path.join(root,'link-assets.json'));const render=linkAssetsForRender(root);assert.equal(render.cards['https://example.com/post'].title,'Preserved');assert.equal(render.favicons['example.com'],'/link-assets/fav/example.ico');
  assert.deepEqual(readGeneratedCache(root,'missing.json',{empty:true}),{empty:true});assert.equal(fs.existsSync(path.join(root,'.garden/missing.json')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('repeated generated cache refresh leaves a clean Git working tree',async()=>{
 const {spawnSync}=await import('node:child_process');
 const {refreshImageSizes}=await import('../scripts/image-sizes.mjs');
 const {refreshLinkAssets}=await import('../scripts/link-assets.mjs');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-cache-git-'));
 try{
  fs.mkdirSync(path.join(root,'content/posts'),{recursive:true});
  fs.writeFileSync(path.join(root,'content/posts/a.md'),'---\ntitle: Fixture\n---\n![Image](https://example.com/image.svg)\n\n[Example](https://example.com/page){card}\n');
  fs.writeFileSync(path.join(root,'.gitignore'),'/.garden/\n/public/link-assets/\n');
  const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;};
  git('init','-q');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','fixture');
  for(let i=0;i<2;i++){
   await refreshImageSizes({siteRoot:root,fetch:async()=>new Response('<svg width="120" height="80" xmlns="http://www.w3.org/2000/svg"></svg>'),checkHost:async()=>{}});
   await refreshLinkAssets({siteRoot:root,fetch:async()=>{throw new Error('fixture offline')},dnsCheck:false});
  }
  assert.equal(fs.existsSync(path.join(root,'image-sizes.json')),false);assert.equal(fs.existsSync(path.join(root,'link-assets.json')),false);
  assert.equal(git('status','--porcelain'),'');assert.equal(readImageCache(root).images['https://example.com/image.svg'].width,120);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
