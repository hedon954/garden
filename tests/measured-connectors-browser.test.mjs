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
    const html = '<div class="graph-viewport" tabindex="0" role="region" aria-label="Spatial diagram, horizontal scroll on narrow screens"><section id="graph"><div data-node="a"><p>Neutral source label with natural wrapping.</p></div><div data-node="b"><p>Neutral second node.</p></div><div data-node="c"><p>Neutral final node with a longer explanation.</p></div></section></div>';
    const css = '*{box-sizing:border-box}.graph-viewport{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;padding:2px}#graph{position:relative;width:100%;min-width:34em;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}#graph>[data-node]{border:1px solid var(--rule);padding:12px;min-width:0}[data-node="a"]{grid-row:span 2;align-self:center}p{margin:0;font:inherit;overflow-wrap:break-word;word-break:normal}';
    const script = `${recipe}\n(async()=>{
      const graph=document.getElementById('graph');const dispose=mountMeasuredConnectors(graph,[{from:'a',to:'b'},{from:'a',to:'c',route:'elbow'},{from:'b',to:'c',route:'elbow',dashed:true}]);
      const settle=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      await document.fonts.ready;await settle();
      const measure=()=>({rootWidth:graph.getBoundingClientRect().width,viewportWidth:graph.parentElement.getBoundingClientRect().width,nodeWidths:[...graph.querySelectorAll('[data-node]')].map(n=>n.getBoundingClientRect().width),overflow:document.documentElement.scrollWidth>innerWidth,font:parseFloat(getComputedStyle(graph.querySelector('p')).fontSize),paths:[...graph.querySelectorAll('path')].map(p=>{
        const svg=p.ownerSVGElement,m=svg.getScreenCTM(),length=p.getTotalLength(),start=p.getPointAtLength(0).matrixTransform(m),end=p.getPointAtLength(length).matrixTransform(m),afterStart=p.getPointAtLength(Math.min(1,length)).matrixTransform(m),beforeEnd=p.getPointAtLength(Math.max(0,length-1)).matrixTransform(m);
        const bounds=id=>{const r=graph.querySelector('[data-node="'+id+'"]').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
        const coords=p.getAttribute('d').match(/-?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?/gi).map(Number);const vertices=[];for(let i=0;i<coords.length;i+=2)vertices.push({x:coords[i],y:coords[i+1]});
        return{start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},from:bounds(p.dataset.from),to:bounds(p.dataset.to),afterStart:{x:afterStart.x,y:afterStart.y},beforeEnd:{x:beforeEnd.x,y:beforeEnd.y},route:p.dataset.route,dash:getComputedStyle(p).strokeDasharray,vertices};
      })});
      const initial=measure();document.body.style.fontSize='21px';await settle();const enlarged=measure();graph.querySelector('[data-node="b"]').style.transform='translateY(8px)';await settle();const moved=measure();graph.parentElement.style.width='75%';await settle();const resized=measure();dispose();
      parent.postMessage({source:'connector-test',initial,enlarged,moved,resized,disposed:!graph.querySelector('svg')},'*');
    })();`;
    const srcdoc = buildSrcdoc({ html, css, js: script });
    const file = path.join(dir, 'fixture.html');
    fs.writeFileSync(file, `<!doctype html><meta name="viewport" content="width=device-width"><style>body{margin:20px}iframe{width:100%;height:1800px;border:0}</style><script>addEventListener('message',e=>{if(e.data?.source==='connector-test')window.__gardenProbeResult=e.data})</script><iframe sandbox="allow-scripts" srcdoc="${srcdoc.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe>`);
    const onBoundary = (point, rect) => point.x >= rect.left - 1 && point.x <= rect.right + 1 && point.y >= rect.top - 1 && point.y <= rect.bottom + 1 && Math.min(Math.abs(point.x - rect.left), Math.abs(point.x - rect.right), Math.abs(point.y - rect.top), Math.abs(point.y - rect.bottom)) < 1;
    for (const width of [300, 344, 375, 430, 820, 1200]) {
      const result = await probeBrowser({ chrome, url: 'file://' + file, profileDir: path.join(dir, 'profile-' + width), width, height: 2200 });
      assert.equal(result.disposed, true);
      assert.equal(result.enlarged.font, 21);
      assert.ok(Math.abs(result.moved.paths[0].to.top-result.enlarged.paths[0].to.top-8)<.1, 'Position-only node move was not exercised');
      assert.ok(result.resized.viewportWidth < result.enlarged.viewportWidth * .8);
      assert.ok(Math.min(...result.resized.nodeWidths) >= result.resized.font * 15, 'Spatial node text must retain a readable minimum width');
      for (const state of [result.initial, result.enlarged, result.moved, result.resized]) {
        assert.equal(state.overflow, false, width + ': overflow');
        assert.equal(state.paths.length, 3);
        assert.equal(state.paths[0].route, 'straight');
        assert.equal(state.paths[0].vertices.length, 2);
        assert.equal(state.paths[1].route, 'elbow');
        assert.equal(state.paths[1].vertices.length, 4);
        assert.ok(new Set(state.paths[1].vertices.map(p=>p.x)).size > 1 && new Set(state.paths[1].vertices.map(p=>p.y)).size > 1, 'Elbow fixture must exercise real turns');
        assert.match(state.paths[2].dash, /6.*4/);
        for (const line of state.paths.filter(line => line.route === 'elbow')) {
          for (let i=1;i<line.vertices.length;i++) {
            const a=line.vertices[i-1], b=line.vertices[i];
            assert.ok(Math.abs(a.x-b.x)<.01 || Math.abs(a.y-b.y)<.01, 'Non-orthogonal elbow segment');
          }
        }
        for (const line of state.paths) {
          assert.ok(onBoundary(line.start, line.from), JSON.stringify({ width, line }));
          assert.ok(onBoundary(line.end, line.to), JSON.stringify({ width, line }));
          const inside=(point,rect)=>point.x>rect.left+.01 && point.x<rect.right-.01 && point.y>rect.top+.01 && point.y<rect.bottom-.01;
          assert.equal(inside(line.afterStart,line.from),false,'First segment enters its source node');
          assert.equal(inside(line.beforeEnd,line.to),false,'Last segment enters its target node');
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

test('measured recipes reject unknown route and non-boolean dash options before mounting', () => {
  const recipe=fs.readFileSync(path.join(root, '.agents/skills/garden-compose/references/measured-connectors.js'), 'utf8');
  const mount=Function(recipe + ';return mountMeasuredConnectors')();
  const nodes=[{dataset:{node:'a'}},{dataset:{node:'b'}}];
  const rootNode={querySelectorAll:()=>nodes};
  assert.throws(()=>mount(rootNode,[{from:'a',to:'b',route:'automatic'}]), /Unknown connector route/);
  assert.throws(()=>mount(rootNode,[{from:'a',to:'b',dashed:'true'}]), /dashed must be boolean/);
});
