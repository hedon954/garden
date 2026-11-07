import assert from 'node:assert/strict';
import test from 'node:test';
import {rehypeGardenBlocks} from '../app/lib/rehype-garden-blocks.mjs';
const text=value=>({type:'text',value});
const el=(tagName,children=[],properties={})=>({type:'element',tagName,properties,children});
test('Compose flow hosts lift out of parser-created paragraphs without losing adjacent prose',()=>{
 const payload=el('garden-block',[],{'data-payload':'opaque'});
 const tree={type:'root',children:[el('p',[text('Before '),payload,text(' after')],{className:['original']}),el('p',[el('strong',[text('untouched')])])]};
 rehypeGardenBlocks()(tree);
 assert.deepEqual(tree.children,[el('p',[text('Before ')],{className:['original']}),payload,el('p',[text(' after')],{className:['original']}),el('p',[el('strong',[text('untouched')])])]);
});
test('standalone hosts do not create empty paragraphs; normal inline custom elements stay inline',()=>{
 const tree={type:'root',children:[el('blockquote',[el('p',[text('\n'),el('garden-codediff'),text('\n')])]),el('p',[el('garden-source')])]};
 rehypeGardenBlocks()(tree);
 assert.deepEqual(tree.children,[el('blockquote',[el('garden-codediff')]),el('p',[el('garden-source')])]);
});
