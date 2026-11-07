import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {scanFences,parseGardenBlock} from '../ui/garden/parse.mjs';
import {compileUiBlock} from '../ui/core/compile.mjs';

test('all parity article scenes use Compose and compile without silently discarding unsupported content',()=>{
 let count=0;
 for(const file of fs.readdirSync('parity/articles').filter(f=>f.endsWith('.md'))){
  const source=fs.readFileSync('parity/articles/'+file,'utf8');
  for(const fence of scanFences(source)){
   if(fence.lang!=='garden')continue;
   assert.match(fence.info,/^garden compose(?:\s|$)/u,file);
   const block=parseGardenBlock(fence.info,fence.body);
   assert.ok(block&&!block.error,file+JSON.stringify(block?.error));
   if(block.mode==='play'){
    const compiled=compileUiBlock(block.uiSource);
    assert.ok(compiled.payload,file+JSON.stringify(compiled.check.diagnostics));
   }
   count++;
  }
 }
 assert.equal(count,23);
});

test('KV parity tabs preserve three remote image references and both canonical formulae without relaxing sandbox isolation',()=>{
 const source=fs.readFileSync('parity/articles/kv-cache-interactive.md','utf8');
 const fence=scanFences(source).find(f=>f.body.includes('<tabs>'));
 const block=parseGardenBlock(fence.info,fence.body);
 const result=compileUiBlock(block.uiSource);
 assert.ok(result.payload,JSON.stringify(result.check.diagnostics));
 for(const text of ['MHA','MQA','GQA','\\frac{1}{head_num}','\\frac{group_num}{head_num}'])assert.ok(fence.body.includes(text),text);
 assert.equal((fence.body.match(/<img src="https:\/\/hedonspace/g)??[]).length,3);
 assert.ok(!fence.body.includes('<sandbox'),'network resources use ordinary article content inside native tabs, not an executable network-enabled iframe');
 assert.ok(source.includes('**可以理解为：**'),'labeled comparison fields are retained');
});
