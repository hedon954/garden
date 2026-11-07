import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import {markdownPlugins} from '../app/lib/markdown-plugins.ts';
import {remarkA2} from '../app/lib/remark-a2.mjs';

const root=new URL('../',import.meta.url).pathname;
const chrome=[process.env.CHROME_BIN,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'].find(p=>p&&fs.existsSync(p));

test('theme keeps prose/list boundaries symmetric for tight, loose and nested lists',{skip:!chrome},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'garden-list-spacing-'));
 try{
  const css=await postcss([tailwind()]).process(fs.readFileSync(path.join(root,'app/globals.css'),'utf8'),{from:path.join(root,'app/globals.css')});
  const samples={
   tight:'引导段落。\n\n1. 第一项\n2. 第二项\n\n后续段落。',
   loose:'引导段落。\n\n1. 第一项\n\n2. 第二项\n\n后续段落。',
   nested:'引导段落。\n\n1. 第一项\n   - 子项甲\n   - 子项乙\n2. 第二项\n\n后续段落。',
   nestedLoose:'引导段落。\n\n1. 第一项\n\n   - 子项甲\n\n   - 子项乙\n\n2. 第二项\n\n后续段落。',
  };
  const articles=Object.entries(samples).map(([id,source])=>`<article id="${id}" class="markdown-body prose" style="width:740px;margin:50px">${renderToStaticMarkup(createElement(ReactMarkdown,{remarkPlugins:[...markdownPlugins,remarkA2]},source))}</article>`).join('');
  const measure=`const result={};for(const a of document.querySelectorAll('article')){const [p,list,after]=a.children,items=list.children;result[a.id]={top:items[0].getBoundingClientRect().top-p.getBoundingClientRect().bottom,bottom:after.getBoundingClientRect().top-items[items.length-1].getBoundingClientRect().bottom,paragraphs:[...list.querySelectorAll('li > p')].map(p=>[getComputedStyle(p).marginTop,getComputedStyle(p).marginBottom])};}document.getElementById('metrics').textContent=JSON.stringify(result);`;
  const file=path.join(dir,'fixture.html');
  fs.writeFileSync(file,`<!doctype html><meta charset="utf-8"><style>${css.css}</style>${articles}<pre id="metrics"></pre><script>${measure}</script>`);
  const output=spawnSync(chrome,['--headless','--disable-gpu','--no-first-run','--disable-background-networking','--user-data-dir='+path.join(dir,'profile'),'--dump-dom','file://'+file],{encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024});
  assert.equal(output.status,0,output.stderr);
  const match=output.stdout.match(/<pre id="metrics">([^<]+)<\/pre>/);
  assert.ok(match,'headless browser must execute measurement');
  const metrics=JSON.parse(match[1]);
  for(const [name,value]of Object.entries(metrics)){
   assert.equal(value.top,22,name+' paragraph→first item');
   assert.equal(value.bottom,22,name+' last item→paragraph');
   for(const margins of value.paragraphs)assert.deepEqual(margins,['0px','0px'],name+' loose item paragraphs');
  }
  assert.ok(metrics.loose.paragraphs.length>0);
  assert.ok(metrics.nestedLoose.paragraphs.length>0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
