import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { managedSkillBundle } from '../scripts/managed-skills.mjs';
import { buildSrcdoc } from '../ui/host.mjs';
import { probeBrowser } from './browser-fixture.mjs';
const root = path.resolve(import.meta.dirname, '..');
const chrome = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium'].find(p => p && fs.existsSync(p));
test('measured connector recipe keeps text in DOM and endpoints on actual resized node boundaries', { skip: !chrome, timeout: 90000 }, async () => {
  const dir = fs.mkdtempSync(path.join(root, '.garden/connectors-'));
  try {
    const recipe = fs.readFileSync(path.join(root, '.agents/skills/garden-compose/references/measured-connectors.js'), 'utf8');
    const html = '<section id="graph"><div data-node="a"><p>Neutral source label with natural wrapping.</p></div><div data-node="b"><p>Neutral second node.</p></div><div data-node="c"><p>Neutral final node with a longer explanation.</p></div></section>';
    const css = '*{box-sizing:border-box}#graph{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}#graph>[data-node]{border:1px solid var(--rule);padding:12px;min-width:0}[data-node="a"]{grid-row:span 2;align-self:center}p{margin:0;font:inherit;overflow-wrap:anywhere}';
    const script = `${recipe}\n(async()=>{
      const graph=document.getElementById('graph');const dispose=mountMeasuredConnectors(graph,[{from:'a',to:'b'},{from:'a',to:'c'},{from:'b',to:'c'}]);
      const settle=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      await document.fonts.ready;await settle();
      const measure=()=>({rootWidth:graph.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth,font:parseFloat(getComputedStyle(graph.querySelector('p')).fontSize),paths:[...graph.querySelectorAll('path')].map(p=>{
        const svg=p.ownerSVGElement,m=svg.getScreenCTM(),start=p.getPointAtLength(0).matrixTransform(m),end=p.getPointAtLength(p.getTotalLength()).matrixTransform(m);
        const bounds=id=>{const r=graph.querySelector('[data-node="'+id+'"]').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
        return{start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},from:bounds(p.dataset.from),to:bounds(p.dataset.to)};
      })});
      const initial=measure();document.body.style.fontSize='21px';await settle();const enlarged=measure();graph.style.width='75%';await settle();const resized=measure();dispose();
      parent.postMessage({source:'connector-test',initial,enlarged,resized,disposed:!graph.querySelector('svg')},'*');
    })();`;
    const srcdoc = buildSrcdoc({ html, css, js: script });
    const file = path.join(dir, 'fixture.html');
    fs.writeFileSync(file, `<!doctype html><meta name="viewport" content="width=device-width"><style>body{margin:20px}iframe{width:100%;height:1800px;border:0}</style><script>addEventListener('message',e=>{if(e.data?.source==='connector-test')window.__gardenProbeResult=e.data})</script><iframe sandbox="allow-scripts" srcdoc="${srcdoc.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe>`);
    const onBoundary = (point, rect) => point.x >= rect.left - 1 && point.x <= rect.right + 1 && point.y >= rect.top - 1 && point.y <= rect.bottom + 1 && Math.min(Math.abs(point.x - rect.left), Math.abs(point.x - rect.right), Math.abs(point.y - rect.top), Math.abs(point.y - rect.bottom)) < 1;
    for (const width of [300, 344, 375, 430, 820, 1200]) {
      const result = await probeBrowser({ chrome, url: 'file://' + file, profileDir: path.join(dir, 'profile-' + width), width, height: 2200 });
      assert.equal(result.disposed, true);
      assert.equal(result.enlarged.font, 21);
      assert.ok(result.resized.rootWidth < result.enlarged.rootWidth * .8);
      for (const state of [result.initial, result.enlarged, result.resized]) {
        assert.equal(state.overflow, false, width + ': overflow');
        assert.equal(state.paths.length, 3);
        for (const line of state.paths) {
          assert.ok(onBoundary(line.start, line.from), JSON.stringify({ width, line }));
          assert.ok(onBoundary(line.end, line.to), JSON.stringify({ width, line }));
        }
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('both managed skill languages include the exact executable connector foundation', () => {
  const expected = fs.readFileSync(path.join(root, '.agents/skills/garden-compose/references/measured-connectors.js'));
  for (const lang of ['zh', 'en']) {
    const bundle = managedSkillBundle({ engineRoot: root, name: 'garden-compose', lang });
    assert.deepEqual(bundle['references/measured-connectors.js'], expected);
  }
});
