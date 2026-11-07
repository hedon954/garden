import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const cli = new URL('../scripts/ui-cli.mjs', import.meta.url).pathname;
test('draft and published files obey identical compile and syntax rules', () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'garden-strict-'));
 try {
  for(const draft of [true,false]) for(const [name,body,expected] of [
   ['idea','```garden compose\n两张卡片并排\n```',1],
   ['generic','```garden\n两张卡片并排\n```',1],
   ['intent','```intent\n---\nid: idea\n---\n两张卡片并排\n```',1],
   ['invalid','```garden compose\n<card><text>bad</card>\n```',1],
   ['play','```garden compose\ncaption: 调整席位\nintent: 调整席位并查看总计\n---\n{@body const [n, setN] = DIL.useState(3)}\n<slider min={1} max={12} value={n} onChange={setN} label="席位" />\n<stat label="总计" value={n} />\n```',0],
   ['invalid-play','```garden compose\ncaption: 查看总计\nintent: 查看派生值\n---\n{@body const total = absent * 24}\n<stat label="总计" value={total} />\n```',1],
   ['compiled','```garden compose\n<card><title>A</title><text>正文</text></card>\n```',0],
  ]) {
   fs.writeFileSync(path.join(root,'post.md'),`---\ndraft: ${draft}\n---\n${body}\n`);
   const r=spawnSync(process.execPath,[cli,'check','post.md','--out','.garden/ui-fix-prompt.md','--standalone','--no-copy'],{cwd:root,env:{...process.env,GARDEN_SITE:root,GARDEN_UI_NO_COPY:'1'},encoding:'utf8'});
   assert.equal(r.status,expected,`${name} draft=${draft}: ${r.stderr}`);
   if(expected){const prompt=fs.readFileSync(path.join(root,'.garden/ui-fix-prompt.md'),'utf8');assert.ok(prompt.includes(body));assert.ok(prompt.includes('post.md'));if(name==='invalid'){assert.ok(prompt.includes('--at 4 --base '));assert.ok(!prompt.includes('intent-hash: null'));}}
  }
 } finally {fs.rmSync(root,{recursive:true,force:true})}
});
