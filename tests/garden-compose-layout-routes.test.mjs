import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLayout,validateCard} from '../.agents/skills/garden-compose/scripts/lint-layout.mjs';
const card={at:1,base:'1234abcd',layout:'icon-rail',units:1};
const text={type:'text',text:'source'};
const row={type:'row',children:[{type:'icon'},{type:'group',children:[text,text]}]};
const doc={nodes:[{type:'stack',children:[row]}]};
test('explicit rail passes; AST does not claim browser/source proof',()=>{const r=inspectLayout(doc,card);assert.equal(r.ok,true);assert.equal(r.browserRequired,true);assert.ok(r.coverage.notChecked.includes('source fidelity'));});
test('body outside shared row is rejected only under rail contract',()=>{const d={nodes:[{type:'stack',children:[row,text]}]};assert.equal(inspectLayout(d,card).ok,false);assert.equal(inspectLayout(d,{...card,layout:'flow-stack'}).ok,true);});
test('row > stack cannot replace shared group',()=>{const r=inspectLayout({nodes:[{type:'stack',children:[{type:'row',children:[{type:'icon'},{type:'stack',children:[text,text]}]}]}]},card);assert.equal(r.ok,false);assert.ok(r.diagnostics.some(x=>x.code==='row-stack-padding'&&x.severity==='warning'));});
test('risk combinations remain advisory outside declared rail',()=>{const r=inspectLayout({nodes:[{type:'row',align:'center',wrap:'nowrap',children:[{...text,size:'sm'}]}]},{...card,layout:'centered-chip'});assert.equal(r.ok,true);assert.ok(r.diagnostics.length>=3);});
test('frame default is card; none must actually survive normalization',()=>{assert.equal(inspectLayout(doc,{...card,outerFrame:'none'}).ok,false);assert.equal(inspectLayout({...doc,frame:'none'},{...card,outerFrame:'none'}).ok,true);});
test('independent cards do not use compare',()=>{const c={...card,layout:'equal-cards',units:2};assert.equal(inspectLayout({nodes:[{type:'grid',cols:2,children:[{type:'card'},{type:'card'}]}]},c).ok,true);assert.equal(inspectLayout({nodes:[{type:'compare',children:[]}]},c).ok,false);});
test('strict card: no prose-keyword inference, missing hash or ambiguous locator',()=>{for(const c of [{...card,request:'去外框'},{...card,base:''},{...card,id:'x'}])assert.throws(()=>validateCard(c));});
test('static tree only; play must not be claimed checked',()=>assert.throws(()=>inspectLayout({},card)));

// Actual package parser integration, not a second parser or keyword heuristic.
import {parseCompose} from '../ui/compose/index.mjs';
test('real normalized icon rail and Markdown body reach lint without source rewriting',()=>{
 const parsed=parseCompose('<figure frame="none"><stack><row wrap="nowrap"><icon name="users"/><group><title>标题</title><markdown>- 原文甲\n- 原文乙</markdown></group></row></stack></figure>');
 assert.equal(parsed.ok,true,parsed.error?.message); assert.equal(inspectLayout(parsed.doc,{...card,outerFrame:'none'}).ok,true);
});
test('ignored static attributes remain an explicit engine gap, not fabricated diagnostics',()=>{
 const parsed=parseCompose('<stack direction="row"><text>甲</text></stack>');assert.equal(parsed.ok,true);assert.equal(parsed.doc.nodes[0].type,'stack');
 const report=inspectLayout(parsed.doc,{...card,layout:'flow-stack'});assert.ok(report.coverage.notChecked.includes('unknown source attributes'));
});

test('parser-default md icon is not mislabeled as an authored size override',()=>{
 const parsed=parseCompose('<stack><row><icon name="users" inline/><text>原文</text></row></stack>');assert.equal(parsed.ok,true);
 const report=inspectLayout(parsed.doc,{...card,layout:'centered-chip'});assert.ok(!report.diagnostics.some(d=>['explicit-size','normalized-size'].includes(d.code)));
 const changed=parseCompose('<stack><text size="sm">原文</text></stack>');const risk=inspectLayout(changed.doc,{...card,layout:'flow-stack'});assert.ok(risk.diagnostics.some(d=>d.code==='normalized-size'));
});
