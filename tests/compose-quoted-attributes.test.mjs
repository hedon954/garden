import test from'node:test';import assert from'node:assert/strict';
import{parseCompose}from'../ui/compose/index.mjs';
test('static quoted attributes preserve safe inline HTML, comparisons, escaped quotes and backslashes',()=>{
 const title='<b>Data</b> "quoted" > threshold';
 const p=parseCompose(`<file src="./kit/data.csv" title=${JSON.stringify(title)}/>`);
 assert.equal(p.ok,true,p.error?.message);assert.equal(p.doc.nodes[0].props.title,title);
 assert.equal(parseCompose('<file src="a" src="b"/>').ok,false);
});
