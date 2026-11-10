import fs from 'node:fs';
import path from 'node:path';
import { titleCases } from './feature-title-fixture.mjs';

// A neutral, standalone matrix derived from the actual export. The untouched
// index.html remains the real React/Link lifecycle preview.
export function writeTitleMatrix(exported) {
  const controls=`<section aria-label="Neutral test controls" style="margin:16px auto;padding:16px;max-width:min(1120px,calc(100% - 40px));border:1px solid #94a3b8;font:16px/1.5 system-ui;overflow-wrap:anywhere">
  <p>Neutral featured-title matrix. <a href="/">Actual homepage / client navigation →</a></p>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
  <label>Complete title <select id="fixture-case">${Object.keys(titleCases).map(key=>`<option>${key}</option>`).join('')}</select></label>
  <label>Content maximum <input id="fixture-width" type="range" min="180" max="700" value="700" style="max-width:100%;width:180px"></label>
  <label><input id="fixture-cover" type="checkbox" checked> Cover / original two-column layout</label>
  <label><input id="fixture-summary" type="checkbox" checked> Summary</label>
  <button id="fixture-font" type="button">Load a different real font</button>
  </div><output id="fixture-measure" style="display:block;margin-top:8px"></output>
  <p>The full title is retained. Long titles wrap at the readable floor; controls belong only to this test document.</p></section>`;
  let html=fs.readFileSync(path.join(exported,'index.html'),'utf8');
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,script=>/\bdata-feature-title-boot[=\s>]/.test(script.match(/^<script\b[^>]*>/i)?.[0]||'')?script:'');
  html=html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/gi,'');
  html=html.replace(/<main\b/,controls+'<main');
  const script=`(()=>{const cases=${JSON.stringify(titleCases)},h=document.querySelector('[data-feature-title]'),host=h.parentElement,article=h.closest('.sh-feature'),summary=host.querySelector('[data-feature-summary]');
  const byId=id=>document.getElementById(id);
  function metrics(){const r=document.createRange();r.selectNodeContents(h.querySelector('a'));const lines=new Set([...r.getClientRects()].filter(x=>x.width&&x.height).map(x=>Math.round(x.top*2))).size;
    byId('fixture-measure').textContent='Available '+h.getBoundingClientRect().width.toFixed(1)+'px · title '+getComputedStyle(h).fontSize+' · summary/body '+getComputedStyle(summary.isConnected?summary:host).fontSize+' · '+lines+' line(s) · page '+document.documentElement.scrollWidth+'/'+document.documentElement.clientWidth;}
  byId('fixture-case').value='medium';byId('fixture-case').onchange=e=>{h.querySelector('a').textContent=cases[e.target.value];};
  byId('fixture-width').oninput=e=>{host.style.maxWidth=e.target.value+'px';};
  byId('fixture-cover').onchange=e=>{article.querySelector('.cover').hidden=!e.target.checked;article.style.gridTemplateColumns=e.target.checked?'':'minmax(0,1fr)';};
  byId('fixture-summary').onchange=e=>{if(e.target.checked)h.after(summary);else summary.remove();dispatchEvent(new Event('resize'));};
  byId('fixture-font').onclick=async e=>{e.target.disabled=true;document.documentElement.style.setProperty('--sans','FeatureFixture,serif');const face=new FontFace('FeatureFixture','url(/feature-test-font.woff2)');document.fonts.add(face);await face.load();await document.fonts.ready;requestAnimationFrame(metrics);};
  new ResizeObserver(metrics).observe(h);new MutationObserver(()=>requestAnimationFrame(metrics)).observe(h,{childList:true,subtree:true,characterData:true});metrics();})();`;
  html=html.replace('</body>',`<script data-neutral-controls="">${script}</script></body>`);
  fs.writeFileSync(path.join(exported,'title-fit-cases.html'),html);
}
if(process.argv[1]===new URL(import.meta.url).pathname)writeTitleMatrix(path.resolve(process.argv[2]));
