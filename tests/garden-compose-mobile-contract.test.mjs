import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLayout,validateCard} from '../.agents/skills/garden-compose/scripts/lint-layout.mjs';
import {parseCompose} from '../ui/compose/index.mjs';
const base={at:1,base:'1234abcd',layout:'flow-row'};
const row=wrap=>({nodes:[{type:'row',wrap,children:[{type:'text',text:'阶段甲'},{type:'arrow',direction:'right'},{type:'text',text:'阶段乙'}]}]});
test('legacy card behavior is unchanged without mobile contract',()=>assert.equal(inspectLayout(row('nowrap'),base).ok,true));
test('declared responsive sequence rejects hard nowrap without inferring prose',()=>{const r=inspectLayout(row('nowrap'),{...base,mobile:{readingMode:'sequence',reflow:true}});assert.equal(r.ok,false);assert.ok(r.diagnostics.some(d=>d.code==='mobile-flow-nowrap'));});
test('default wrapping sequence passes structure but still requires browser evidence',()=>{const r=inspectLayout(row('wrap'),{...base,mobile:{readingMode:'sequence',reflow:true}});assert.equal(r.ok,true);assert.equal(r.browserRequired,true);assert.ok(r.coverage.notChecked.includes('responsive layout'));});
test('explicit non-reflow mode is not treated as a universal nowrap ban',()=>assert.equal(inspectLayout(row('nowrap'),{...base,mobile:{readingMode:'spatial',reflow:false}}).ok,true));
test('local icon rail nowrap remains legal under mobile scan contract',()=>{const doc={nodes:[{type:'stack',children:[{type:'row',wrap:'nowrap',children:[{type:'icon'},{type:'group',children:[{type:'text',text:'标题'},{type:'text',text:'完整原文'}]}]}]}]};assert.equal(inspectLayout(doc,{...base,layout:'icon-rail',units:1,mobile:{readingMode:'scan-list',reflow:true}}).ok,true);});
test('repeated centered scan units are advisory, not a fabricated height verdict',()=>{const doc={nodes:[{type:'stack',align:'center',children:[{type:'card',children:[]},{type:'card',children:[]}]}]};const r=inspectLayout(doc,{...base,layout:'centered-chip',mobile:{readingMode:'scan-list'}});assert.equal(r.ok,true);assert.ok(r.diagnostics.some(d=>d.code==='mobile-scan-centering'&&d.severity==='warning'));});
test('spatial grouping is not incorrectly classified as a scan list',()=>{const doc={nodes:[{type:'stack',align:'center',children:[{type:'card'},{type:'card'}]}]};assert.ok(!inspectLayout(doc,{...base,mobile:{readingMode:'spatial'}}).diagnostics.some(d=>d.code==='mobile-scan-centering'));});
test('mobile schema rejects invented density thresholds and invalid values',()=>{for(const mobile of [{maxScreens:1},{readingMode:'pretty'},{reflow:'yes'},null])assert.throws(()=>validateCard({...base,mobile}));});
test('actual normalized parser tree drives mobile guard',()=>{const p=parseCompose('<row wrap="nowrap"><text>阶段甲</text><arrow dir="right"/><text>阶段乙</text></row>');assert.equal(p.ok,true);assert.equal(inspectLayout(p.doc,{...base,mobile:{readingMode:'sequence',reflow:true}}).ok,false);});

test('content-sized nested icon pair is not mistaken for the responsive flow axis',()=>{
 const doc={nodes:[{type:'row',wrap:'wrap',children:[{type:'group',children:[{type:'row',wrap:'nowrap',children:[{type:'icon'},{type:'text',text:'局部标题'}]}]},{type:'arrow',direction:'right'},{type:'text',text:'下一阶段'}]}]};
 assert.equal(inspectLayout(doc,{...base,mobile:{readingMode:'sequence',reflow:true}}).ok,true);
});
