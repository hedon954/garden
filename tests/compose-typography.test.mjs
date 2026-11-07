import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const root = new URL('../', import.meta.url).pathname;
const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));

test('article typography propagates to static, list and Play body without overriding explicit hierarchy', { skip: !chrome }, async () => {
  fs.mkdirSync(path.join(root, '.garden'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, '.garden/typography-'));
  try {
    const css = await postcss([tailwind()]).process(['globals.css', 'styles/tokens.css', 'styles/a2.css', 'styles/shell.css'].map(file => `@import ${JSON.stringify(path.join(root, 'app', file))};`).join('\n'), { from: path.join(root, 'app/globals.css') });
    const content = `<article class="markdown-body prose" style="margin:20px;max-width:700px"><p id="body">Article body</p><figure class="g-compose"><div class="g-compose-body"><p class="g-compose-h" id="title">Title</p><p class="g-compose-text" id="text">Body</p><p class="g-compose-text" data-tone="muted" id="muted">Muted</p><p class="g-compose-text" data-size="sm" id="small">Small</p><p class="g-compose-text" data-size="lg" id="large">Large</p><div class="g-compose-row"><div class="g-compose-stack"><p class="g-compose-h" data-size="lg" id="nested">Nested large</p></div></div><ul class="g-compose-list"><li id="list">List body</li></ul><p class="g-compose-caption-inline" id="caption">Caption</p><span class="g-compose-button" id="control">Button</span></div></figure><figure class="garden-ui"><div class="garden-ui-body"><p id="play">Play body</p><ul><li id="play-list">Play list</li></ul></div></figure><figure class="g-list g-list-rows"><ul><li><p class="g-list-x" id="legacy-list">Legacy list body</p></li></ul></figure></article>`;
    const measure = `const ids=['body','title','text','muted','small','large','nested','list','caption','control','play','play-list','legacy-list'];const measure=()=>Object.fromEntries(ids.map(id=>{const s=getComputedStyle(document.getElementById(id));return[id,{size:parseFloat(s.fontSize),family:s.fontFamily}]}));const initial=measure();const a=document.querySelector('article');a.style.setProperty('--fs-body','19px');a.style.fontFamily='Georgia, serif';document.getElementById('metrics').textContent=JSON.stringify({initial,changed:measure()});`;
    const file = path.join(dir, 'fixture.html');
    fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>${css.css}</style>${content}<pre id="metrics"></pre><script>${measure}</script>`);
    for (const width of [1200, 500]) {
      const result = spawnSync(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--window-size='+width+',1800', '--user-data-dir='+path.join(dir,'profile'), '--dump-dom', 'file://'+file], { encoding:'utf8', timeout:20000, maxBuffer:8*1024*1024 });
      assert.equal(result.status,0,result.stderr);
      const match = result.stdout.match(/<pre id="metrics">([^<]+)<\/pre>/);
      assert.ok(match);
      const metrics = JSON.parse(match[1]);
      for (const values of Object.values(metrics)) {
        const body=values.body;
        for (const id of ['title','text','muted','list','play','play-list','legacy-list']) {
          assert.equal(values[id].size, body.size, width+':'+id);
          assert.equal(values[id].family, body.family, width+':'+id+' font family');
        }
        assert.ok(Math.abs(values.small.size-body.size*.875)<.01);
        assert.ok(Math.abs(values.large.size-body.size*1.125)<.01);
        assert.ok(Math.abs(values.nested.size-body.size*1.125)<.01);
        assert.ok(values.caption.size<body.size);
        assert.ok(values.control.size<body.size);
      }
      assert.equal(metrics.changed.body.size,19);
      assert.notEqual(metrics.initial.body.size,metrics.changed.body.size);
    }
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
