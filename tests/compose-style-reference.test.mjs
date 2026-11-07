import test from'node:test';import assert from'node:assert/strict';import path from'node:path';
import{composeStyleReference}from'../scripts/compose-style-reference.mjs';
test('schema style evidence extracts actual contextual CSS instead of inventing computed typography',()=>{
 const ref=composeStyleReference(path.resolve(import.meta.dirname,'..'));
 assert.equal(ref.kind,'source-declarations-not-computed');assert.ok(ref.rules.length>50);
 const row=ref.rules.find(r=>r.selector==='.g-compose-row > .g-compose-stack');assert.ok(row.declarations.some(d=>d.property==='padding-top'&&d.value==='12px'));
 const body=ref.rules.find(r=>r.selector==='.g-compose');assert.ok(body.declarations.some(d=>d.property==='font-size'&&d.value==='inherit'));
 assert.ok(ref.rules.some(r=>r.context.some(c=>c.name==='media'&&c.params.includes('800px'))));
 assert.ok(ref.rules.some(r=>r.selector.includes('.g-choice-v')&&r.declarations.some(d=>d.value.includes('22px'))));
 assert.ok(ref.rules.every(r=>r.source&&Number.isInteger(r.line)));
});
