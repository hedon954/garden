import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {refreshDevLinkAssets} from '../scripts/link-assets.mjs';
test('two documents: only changed document URLs fetch, unchanged rerun and deletion fetch zero', async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dev-links-'));fs.mkdirSync(path.join(root,'content'));fs.mkdirSync(path.join(root,'.garden'));
 const a=path.join(root,'content','a.md'),b=path.join(root,'content','b.md');
 fs.writeFileSync(a,'[A](https://changed.example/a){card}\n[A](https://changed.example/a){card}');fs.writeFileSync(b,'[B](https://untouched.example/b){card}');
 const calls=[];const fetch=async u=>{calls.push(String(u));return new Response('<title>Example</title>',{headers:{'content-type':'text/html'}})};
 const run=files=>refreshDevLinkAssets({siteRoot:root,files,dnsCheck:false,fetch});
 await run([a]);assert.ok(calls.length);assert.ok(calls.every(u=>!u.includes('untouched.example')));
 calls.length=0;await run();assert.equal(calls.length,0);
 fs.unlinkSync(a);calls.length=0;await run([a]);assert.equal(calls.length,0);
 assert.ok(JSON.parse(fs.readFileSync(path.join(root,'.garden','link-assets.json'))).cards['https://changed.example/a']);
 fs.rmSync(root,{recursive:true});
});
