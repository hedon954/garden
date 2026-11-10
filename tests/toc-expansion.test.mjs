import assert from "node:assert/strict";
import test from "node:test";
import { nestHeadings, expandedTocSections, toggleTocSection } from "../app/lib/toc-expansion.ts";
const headings=[['a',2],['a1',3],['a11',4],['a111',5],['a2',3],['b',2],['b1',4],['b11',5],['c',2]].map(([id,depth])=>({id,depth,text:id}));
const tree=nestHeadings(headings),follow={mode:"follow"};
const expand=(state,id)=>[...expandedTocSections(tree,state,id)].sort();
test('unreached article starts at roots; each current node exposes only its next level',()=>{
 assert.deepEqual(expand(follow),[]);assert.deepEqual(expand(follow,'a'),['a']);assert.deepEqual(expand(follow,'a1'),['a','a1']);assert.deepEqual(expand(follow,'a11'),['a','a1','a11']);
});
test('next chapter collapses old path and scrolling backwards reconstructs it',()=>{
 assert.deepEqual(expand(follow,'b1'),['b','b1']);assert.deepEqual(expand(follow,'a11'),['a','a1','a11']);assert.deepEqual(expand(follow,'c'),[]);assert.deepEqual(expand(follow,'missing'),[]);
});
test('heading-rank gaps follow actual parent relationships, not numeric rank differences',()=>{assert.equal(tree[1].children[0].id,'b1');assert.deepEqual(expand(follow,'b11'),['b','b1']);});
test('expand all stays expanded across active headings until explicitly following again',()=>{const all={mode:'all'};for(const id of ['a','b11','c',undefined])assert.deepEqual(expand(all,id),['a','a1','a11','b','b1']);assert.deepEqual(expand(follow,'b'),['b']);});
test('individual toggles freeze the visible branches and do not mutate previous state',()=>{
 const before=expandedTocSections(tree,follow,'a1'),manual=toggleTocSection(before,'a');assert.equal(manual.mode,'manual');assert.deepEqual([...before].sort(),['a','a1']);assert.deepEqual(expand(manual,'c'),['a1']);const reopened=toggleTocSection(expandedTocSections(tree,manual),'a');assert.deepEqual(expand(reopened,'b1'),['a','a1']);
});
