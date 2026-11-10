import assert from 'node:assert/strict';
import test from 'node:test';
import {fitTitleSize} from '../ui/garden/feature-title-fit.mjs';

test('short title keeps the design maximum',()=>{
 assert.equal(fitTitleSize({width:500,minimum:19.125,maximum:30,measure:size=>size*4}),30);
});
test('moderate title uses the largest size that actually fits',()=>{
 const size=fitTitleSize({width:450,minimum:19.125,maximum:30,measure:size=>size*20});
 assert.ok(size<=22.5&&size>22.4);
});
test('overlong title stops at the summary-relative floor and is left to wrap',()=>{
 const body=22,minimum=body*1.125;
 assert.equal(fitTitleSize({width:300,minimum,maximum:35,measure:size=>size*50}),minimum);
});
test('empty text and unavailable layout keep a nonzero readable maximum',()=>{
 assert.equal(fitTitleSize({width:300,minimum:19,maximum:30,measure:()=>0}),30);
 assert.equal(fitTitleSize({width:0,minimum:19,maximum:30,measure:()=>100}),30);
});
