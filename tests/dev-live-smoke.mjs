// Opt-in local integration harness: node tests/dev-live-smoke.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
const root = fs.realpathSync(new URL("..", import.meta.url));
const site = fs.mkdtempSync(path.join(os.tmpdir(), "garden-live-smoke-"));
const bin = path.join(site, "fake-bin"); fs.mkdirSync(bin);
fs.writeFileSync(path.join(bin, "gh"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
const env = { ...process.env, GARDEN_SITE: site, GARDEN_SKIP_HOOKS: "1", GARDEN_OFFLINE: "1", PATH: `${bin}:${process.env.PATH}` };
delete env.CONTENT_INCLUDE_DRAFTS;
execFileSync(process.execPath, [path.join(root, "bin/garden.mjs"), "init", site], { cwd: site, env, stdio: "ignore" });
fs.symlinkSync(path.join(root, "node_modules"), path.join(site, "node_modules"), "dir");
const post = (text, title = "Live smoke") => `---\ntitle: ${title}\ndate: 2026-01-01\ndescription: isolated preview test\ndraft: true\n---\n\n${text}\n`;
const file = path.join(site, "content/posts/smoke.md");
fs.writeFileSync(file, post("DRAFT_ALPHA\n\n## 重点 **总结**\n\n### 人员\n\n#### 流程 `code`\n\n## 1. 标题\n\n4~6 个小时，7~8 个小时。 ~~删除线~~"));
let browser; const children = [];
const launch = () => {
 const log = fs.openSync(path.join(site, `server-${children.length}.log`), "w");
 const child = spawn(process.execPath, [path.join(root,"bin/garden.mjs"),"dev","--host","127.0.0.1","--port","5197","--strictPort"], { cwd: site, env, stdio: ["ignore", log, log] });
 children.push(child); return child;
};
async function until(fn, label) {
 const deadline=Date.now()+90000; let last;
 while(Date.now()<deadline){try{if(await fn())return;}catch(e){last=e;}await delay(300);}
 throw new Error(`Timed out: ${label}: ${last ?? ""}; fixture ${site}`);
}
try {
 const first=launch();
 await until(async()=>{const r=await fetch('http://127.0.0.1:5197/blog/smoke', { signal: AbortSignal.timeout(20000) });return r.status===200 && (await r.text()).includes('DRAFT_ALPHA');},'initial draft HTTP');
 const second=launch();
 await until(()=>first.exitCode!==null,'old CLI exit');
 await until(async()=>{const r=await fetch('http://127.0.0.1:5197/blog/smoke', { signal: AbortSignal.timeout(20000) });return r.status===200;},'replacement HTTP');
 assert.equal(second.exitCode,null);
 console.log('PASS real sequential Garden/Vinext replacement + draft HTTP 200');
 browser=await chromium.launch({ executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox'] });
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5197/blog/smoke');await page.getByText('DRAFT_ALPHA',{exact:true}).waitFor();
 assert.equal(await page.locator('.sec-no,.t-no').count(),0);
 assert.equal(await page.locator('del').innerText(),'删除线');
 assert.ok((await page.locator('body').innerText()).includes('4~6 个小时，7~8 个小时。'));
 assert.equal(await page.locator('h2').filter({hasText:'重点 总结'}).innerText(),'重点 总结');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.sec-no,.t-no').count(),0);
 console.log('PASS desktop/mobile literal headings, inline markup, ranges and explicit double tilde');
 fs.writeFileSync(file,post('DRAFT_BETA','Changed title'));
 await until(async()=> (await page.locator('body').innerText()).includes('DRAFT_BETA'),'already-open browser changed Markdown');
 console.log('PASS already-open browser updates Markdown and frontmatter without navigation/restart');
 const added=path.join(site,'content/posts/new-route.md');fs.writeFileSync(added,post('ADDED_GAMMA'));
 await until(async()=>{const r=await fetch('http://127.0.0.1:5197/blog/new-route', { signal: AbortSignal.timeout(20000) });return r.status===200 && (await r.text()).includes('ADDED_GAMMA');},'new route');
 fs.unlinkSync(added);
 await until(async()=> (await fetch('http://127.0.0.1:5197/blog/new-route', { signal: AbortSignal.timeout(20000) })).status===404,'deleted route');
 console.log('PASS create/delete routes');
 fs.writeFileSync(file,'---\ntitle: [\n---\nbroken'); await delay(1500);
 fs.writeFileSync(file,post('RECOVERED_DELTA'));
 await until(async()=> (await page.locator('body').innerText()).includes('RECOVERED_DELTA'),'recovery after invalid frontmatter');
 console.log('PASS browser recovery after invalid frontmatter; fixture',site);
} catch (error) {
 if (browser) { for (const context of browser.contexts()) for (const page of context.pages()) fs.writeFileSync(path.join(site,"failed-page.html"),await page.content()); }
 console.error(error); process.exitCode=1;
} finally {
 await browser?.close();
 for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');
 // Keep isolated fixture/logs for inspection, never user content.
}
