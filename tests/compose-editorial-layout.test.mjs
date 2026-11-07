import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { parseCompose, renderCompose } from '../ui/compose/index.mjs';

const root = new URL('../', import.meta.url).pathname;
const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));

test('complete article theme preserves icon rail, paragraph alignment and optional scene frame', { skip: !chrome }, async () => {
  const scratch = path.join(root, '.garden');
  fs.mkdirSync(scratch, { recursive: true });
  const dir = fs.mkdtempSync(path.join(scratch, 'compose-layout-test-'));
  try {
    const css = await postcss([tailwind()]).process(['globals.css', 'styles/tokens.css', 'styles/a2.css', 'styles/shell.css'].map(file => `@import ${JSON.stringify(path.join(root, 'app', file))};`).join('\n'), { from: path.join(root, 'app/globals.css') });
    const row = '<row wrap="nowrap" gap={3}><icon name="book-open" size="xl"/><group gap={3}><text>**标题**</text><text>' + '用于测试正文自动换行，保持段落与标题的共同起点。'.repeat(12) + '</text><text>独立第二段。</text></group></row>';
    const source = `<stack>${row}<divider/>${row}</stack>`;
    const plain = renderCompose(parseCompose(source).doc);
    const none = renderCompose(parseCompose(`<figure frame="none">${source}</figure>`).doc);
    const measure = `const r=e=>e.getBoundingClientRect();const result=[...document.querySelectorAll('article')].map(a=>{const f=a.querySelector('figure');return {frame:getComputedStyle(f).borderTopWidth,padding:getComputedStyle(f).paddingTop,background:getComputedStyle(f).backgroundColor,dividers:a.querySelectorAll('hr').length,rows:[...a.querySelectorAll('.g-compose-row')].map(row=>{const p=[...row.querySelectorAll('p')],icon=row.querySelector('svg');return {icon:r(icon).x,iconWidth:r(icon).width,heading:r(p[0]).x,paragraphs:p.slice(1).map(e=>r(e).x),align:getComputedStyle(p[0]).textAlign,overflow:row.scrollWidth>row.clientWidth}})}});document.getElementById('metrics').textContent=JSON.stringify(result);`;
    const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css.css}</style><article class="markdown-body prose" style="max-width:700px;margin:20px">${plain}</article><article class="markdown-body prose" style="max-width:700px;margin:20px">${none}</article><pre id="metrics"></pre><script>${measure}</script>`;
    const file = path.join(dir, 'fixture.html');
    fs.writeFileSync(file, html);
    for (const width of [1200, 500]) {
      const output = spawnSync(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--window-size=' + width + ',1800', '--user-data-dir=' + path.join(dir, 'profile'), '--dump-dom', 'file://' + file], { encoding: 'utf8', timeout: 20000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(output.status, 0, output.stderr);
      const match = output.stdout.match(/<pre id="metrics">([^<]+)<\/pre>/);
      assert.ok(match, 'browser executed measurement');
      const scenes = JSON.parse(match[1]);
      assert.equal(scenes[0].frame, '1px');
      assert.equal(scenes[1].frame, '0px');
      assert.equal(scenes[1].padding, '0px');
      assert.equal(scenes[1].background, 'rgba(0, 0, 0, 0)');
      for (const scene of scenes) {
        assert.equal(scene.dividers, 1);
        assert.equal(scene.rows.length, 2);
        for (const row of scene.rows) {
          assert.equal(row.iconWidth, 22);
          assert.ok(row.heading > row.icon + row.iconWidth);
          assert.ok(row.paragraphs.every(x => Math.abs(x - row.heading) < 0.1));
          assert.notEqual(row.align, 'center');
          assert.equal(row.overflow, false);
        }
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
