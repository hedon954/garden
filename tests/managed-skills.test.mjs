import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {syncManagedTree} from '../scripts/managed-skills.mjs';
test('recursive managed updates preserve local edits and are idempotent, without creating installed skills',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'managed-tree-')),backups=[];const backup=(name,bytes)=>backups.push([name,bytes.toString()]);
 try{
 let previous=syncManagedTree({destination:dir,files:{'references/rules.txt':Buffer.from('v1'),'scripts/check.txt':Buffer.from('cli')},backup});
 fs.writeFileSync(path.join(dir,'references/rules.txt'),'local edits');
 previous=syncManagedTree({destination:dir,previous,files:{'references/rules.txt':Buffer.from('v2')},backup});
 assert.deepEqual(backups,[['references/rules.txt','local edits']]);assert.equal(fs.existsSync(path.join(dir,'scripts/check.txt')),false);
 syncManagedTree({destination:dir,previous,files:{'references/rules.txt':Buffer.from('v2')},backup});assert.equal(backups.length,1);
 assert.throws(()=>syncManagedTree({destination:dir,files:{'../escape':Buffer.from('bad')},backup}),/Invalid managed path/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
