import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const layouts = new Set(['icon-rail','equal-cards','flow-row','flow-stack','centered-chip','prose-list']);
export function validateCard(card) {
  const keys = new Set(['id','at','base','layout','units','outerFrame']);
  if (!card || typeof card !== 'object' || Array.isArray(card) || Object.keys(card).some(k=>!keys.has(k))) throw new Error('Unknown constraint field/object');
  if ((typeof card.id==='string' && card.id.length>0) === (Number.isInteger(card.at) && card.at>0)) throw new Error('Choose exactly one nonempty id or positive at line');
  if (card.id!==undefined && (typeof card.id!=='string'||!card.id)) throw new Error('Invalid id');
  if (card.at!==undefined && (!Number.isInteger(card.at)||card.at<1)) throw new Error('Invalid at');
  if (!/^[a-f0-9]{8}$/.test(card.base??'')) throw new Error('base must be the scanned complete fence hash');
  if (!layouts.has(card.layout)) throw new Error('Unsupported layout recommendation');
  if (card.units!==undefined && (!Number.isInteger(card.units)||card.units<1)) throw new Error('units must be positive');
  if (card.outerFrame!==undefined && !['none','card'].includes(card.outerFrame)) throw new Error('Invalid outerFrame');
}
export function inspectLayout(doc, card) {
  validateCard(card);
  const diagnostics=[];
  const add=(severity,code,message)=>diagnostics.push({severity,code,message});
  if (!Array.isArray(doc?.nodes)) throw new Error('Only normalized static Compose is supported');
  const nodes=doc.nodes.length===1 && doc.nodes[0].type==='figure' ? doc.nodes[0].children : doc.nodes;
  if (card.outerFrame && (doc.frame??'card')!==card.outerFrame) add('error','outer-frame','Declared scene frame does not match normalized scene');
  if (card.layout==='icon-rail') {
    const stack=nodes.length===1 && nodes[0].type==='stack' ? nodes[0] : null;
    if (!stack) add('error','rail-container','Recommended rail needs one outer stack');
    else {
      const rows=stack.children.filter(n=>n.type==='row');
      if (!rows.length || stack.children.some(n=>!['row','divider'].includes(n.type))) add('error','rail-outside-body','Only rows and between-row dividers belong in the outer rail');
      if (card.units!==undefined && rows.length!==card.units) add('error','unit-count','Row count differs from declared source units');
      for (const [i,n] of stack.children.entries()) if (n.type==='divider' && (stack.children[i-1]?.type!=='row'||stack.children[i+1]?.type!=='row')) add('error','rail-divider','Divider must separate two rows');
      for (const row of rows) {
        const icons=row.children.filter(n=>n.type==='icon'), groups=row.children.filter(n=>n.type==='group');
        if (row.children.length!==2 || icons.length!==1 || groups.length!==1 || row.children[0].type!=='icon') add('error','rail-shared-container','Row needs icon then exactly one shared right-hand group');
        const group=groups[0];
        if (group && (group.children.length<2 || !['text','title'].includes(group.children[0].type))) add('error','rail-heading-body','Group needs heading and body/content leaves');
      }
    }
  }
  if (card.layout==='equal-cards') {
    const grid=nodes.length===1 && nodes[0].type==='grid' ? nodes[0] : null;
    if (!grid || !grid.children.length || grid.children.some(n=>n.type!=='card')) add('error','cards-grid','Recommended equal cards need one grid with direct cards');
    else if (card.units!==undefined && (grid.children.length!==card.units || grid.cols!==Math.min(card.units,6))) add('error','unit-count','Grid cards/columns differ from declared source units');
  }
  const visit=(n,parent)=>{
    if (parent?.type==='row' && n.type==='stack') add('warning','row-stack-padding','Current theme adds 12px top padding');
    if (n.type==='row' && n.align==='center' && n.children?.some(c=>['title','text'].includes(c.type))) add('warning','center-flex','Center couples axes/text; direct title/text keep flex:1');
    if (n.type==='row' && n.wrap==='nowrap') add('warning','nowrap','Browser must verify wrapping and overflow');
    if (n.size && n.size!=='md') add('warning','normalized-size','Non-baseline normalized size: compare with source intent; normalization does not prove an authored attribute');
    if (n.type==='card' && parent?.type==='card') add('warning','nested-surface','Check whether nested surfaces are intentional');
    for (const child of n.children??[]) visit(child,n);
  };
  doc.nodes.forEach(n=>visit(n,null));
  return {ok:!diagnostics.some(d=>d.severity==='error'),diagnostics,coverage:{structural:[...(card.outerFrame?['declared outerFrame']:[]),...(['icon-rail','equal-cards'].includes(card.layout)?[card.layout+' shape']:[])],notChecked:['source fidelity','unknown source attributes','other route structures','DOM geometry','responsive layout','optical alignment','AI reliability']},browserRequired:true};
}
async function main() {
  const args=process.argv.slice(2);
  if (args.length!==3 || args[1]!=='--constraints') throw new Error('Usage: lint-layout.mjs post.md --constraints card.json');
  const card=JSON.parse(fs.readFileSync(args[2],'utf8')); validateCard(card);
  const cwd=process.cwd();
  const localManifest=path.join(cwd,'package.json');
  const local=JSON.parse(fs.readFileSync(localManifest,'utf8'));
  const root=local.name==='hd-garden'?cwd:path.dirname(createRequire(localManifest).resolve('hd-garden/package.json'));
  // These exported functions in the installed package are authoritative. No parser copy/fallback/download.
  const {scanMarkdown,checkComposeFence}=await import(pathToFileURL(path.join(root,'ui/core/scan.mjs')).href);
  const {scanFences}=await import(pathToFileURL(path.join(root,'ui/core/fence.mjs')).href);
  const file=path.resolve(args[0]), source=fs.readFileSync(file,'utf8');
  const blocks=scanMarkdown(source,{markdownPath:file});
  const matches=blocks.filter(b=>card.id?b.id===card.id:b.startLine===card.at);
  if (matches.length!==1) throw new Error('Constraint locator must match exactly one block');
  const block=matches[0];
  if (block.hash!==card.base) throw new Error('Stale constraint base; rescan before checking');
  const fence=scanFences(source).find(f=>f.startLine===block.startLine);
  const parsed=checkComposeFence(fence,{markdownPath:file});
  if (!parsed.ok) { console.log(JSON.stringify({ok:false,diagnostics:parsed.diagnostics,browserRequired:true},null,2)); process.exitCode=1; return; }
  const result=inspectLayout(parsed.doc,card);
  console.log(JSON.stringify(result,null,2)); process.exitCode=result.ok?0:1;
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error=>{console.error(JSON.stringify({ok:false,code:'layout-input',message:error.message}));process.exitCode=2;});
