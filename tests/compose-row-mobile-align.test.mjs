import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { parseCompose, renderCompose } from "../ui/compose/index.mjs";

const root = path.resolve(import.meta.dirname, "..");
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/chromium"].find((file) => file && fs.existsSync(file));

const fixtures = {
  stages: '<row align="center" gap={2} size="sm"><text size="sm">立项前</text><arrow dir="right"/><text size="sm">定规矩</text><arrow dir="right"/><text size="sm">产品探索阶段</text><arrow dir="right"/><text size="sm">工程开发阶段</text><arrow dir="right"/><text size="sm">发布与改版阶段</text></row>',
  explicitStart: '<row align="center" gap={2}><text align="start">显式左对齐</text><arrow dir="right"/><text>默认标签</text></row>',
  unmarked: '<row gap={2}><text>未声明对齐</text><arrow dir="right"/><text>下一阶段</text></row>',
  nestedProse: '<row align="center" gap={2}><card><text>卡片内段落应保持左对齐，用来确认不会把 Markdown 段落一起居中。</text></card></row>',
  nowrap: '<row align="center" wrap="nowrap" gap={2}><text>横排标签</text><arrow dir="right"/><text>仍横排</text></row>',
  stack: '<stack align="center" gap={2}><text>堆叠标签</text><arrow dir="down"/><text>第二行</text></stack>',
};

function render(source) {
  const parsed = parseCompose(source);
  assert.equal(parsed.ok, true, parsed.error?.message);
  return renderCompose(parsed.doc);
}

const measure = `const mid=r=>(r.left+r.right)/2;
const glyph=el=>{const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect()};
const result={};
for(const article of document.querySelectorAll('article[data-case]')){
  const name=article.dataset.case;
  const row=article.querySelector('.g-compose-row, .g-compose-stack');
  const texts=[...article.querySelectorAll('.g-compose-text, .g-compose-h')];
  const arrow=article.querySelector('.g-compose-arrow');
  const rowBox=row.getBoundingClientRect();
  result[name]={
    direction:getComputedStyle(row).flexDirection,
    wrap:row.getAttribute('data-wrap'),
    align:row.getAttribute('data-align'),
    texts:texts.map(el=>{
      const box=el.getBoundingClientRect();
      const g=glyph(el);
      return {text:el.textContent,css:getComputedStyle(el).textAlign,attr:el.getAttribute('data-align'),
        boxMid:mid(box),glyphMid:mid(g),glyphLeft:g.left,rowMid:mid(rowBox),rowLeft:rowBox.left,
        arrowMid:arrow?mid(arrow.getBoundingClientRect()):null};
    })
  };
}
document.getElementById('metrics').textContent=JSON.stringify(result);`;

test("columnized centered rows center direct labels but honor explicit start and nested prose", { skip: !chrome, timeout: 60_000 }, async () => {
  const evidence = path.join(root, ".garden/compose-row-mobile-align-evidence");
  fs.mkdirSync(evidence, { recursive: true });
  const dir = fs.mkdtempSync(path.join(root, ".garden/compose-row-mobile-align-"));
  try {
    const css = [path.join(root, "app/styles/tokens.css"), path.join(root, "ui/compose/compose.css")].map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const body = Object.entries(fixtures).map(([name, source]) => `<article data-case="${name}" class="markdown-body" style="max-width:740px;margin:16px auto;padding:0 16px">${render(source)}</article>`).join("");
    const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style>${body}<pre id="metrics"></pre><script>${measure}</script>`;
    const file = path.join(dir, "fixture.html");
    fs.writeFileSync(file, html);
    for (const width of [375, 1200]) {
      const output = spawnSync(chrome, [
        "--headless=new", "--disable-gpu", "--no-first-run", "--disable-background-networking",
        `--window-size=${width},2400`, `--user-data-dir=${path.join(dir, "profile-" + width)}`,
        `--screenshot=${path.join(evidence, "align-" + width + ".png")}`, "--dump-dom", "file://" + file,
      ], { encoding: "utf8", timeout: 20000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(output.status, 0, output.stderr);
      const match = output.stdout.match(/<pre id="metrics">([^<]+)<\/pre>/);
      assert.ok(match, "browser executed measurement");
      const result = JSON.parse(match[1].replace(/&quot;/g, '"'));
      fs.writeFileSync(path.join(evidence, `align-${width}.json`), JSON.stringify(result, null, 2));
      if (width <= 800) {
        assert.equal(result.stages.direction, "column");
        for (const text of result.stages.texts) {
          assert.equal(text.css, "center", JSON.stringify(text));
          assert.ok(Math.abs(text.glyphMid - text.arrowMid) < 2, "stage label should share the arrow center: " + JSON.stringify(text));
        }
        assert.equal(result.explicitStart.texts[0].css, "start", JSON.stringify(result.explicitStart.texts[0]));
        assert.equal(result.explicitStart.texts[0].attr, "start");
        assert.ok(result.explicitStart.texts[0].glyphMid < result.explicitStart.texts[0].rowMid - 8, "explicit start stays left of center: " + JSON.stringify(result.explicitStart.texts[0]));
        assert.equal(result.explicitStart.texts[1].css, "center");
        assert.equal(result.unmarked.direction, "column");
        for (const text of result.unmarked.texts) {
          assert.ok(text.css === "start" || text.css === "left", JSON.stringify(text));
          assert.ok(text.glyphMid < text.rowMid - 8, "unmarked labels stay start-aligned: " + JSON.stringify(text));
        }
        assert.ok(result.nestedProse.texts[0].css === "start" || result.nestedProse.texts[0].css === "left", JSON.stringify(result.nestedProse.texts[0]));
        assert.ok(result.nestedProse.texts[0].glyphLeft - result.nestedProse.texts[0].rowLeft < 24, "nested card prose still starts on the left: " + JSON.stringify(result.nestedProse.texts[0]));
        assert.equal(result.nowrap.direction, "row");
        for (const text of result.nowrap.texts) {
          assert.ok(text.css === "start" || text.css === "left", "nowrap rows keep horizontal text alignment: " + JSON.stringify(text));
        }
      } else {
        assert.equal(result.stages.direction, "row");
        for (const text of result.stages.texts) {
          assert.ok(text.css === "start" || text.css === "left", "desktop wrapping row does not inherit a new text-align: " + JSON.stringify(text));
        }
      }
      for (const text of result.stack.texts) {
        assert.equal(text.css, "center", "stack align=center still centers labels: " + JSON.stringify(text));
      }
    }
  } finally {
    if (process.env.GARDEN_KEEP_BROWSER_FIXTURE !== "1") fs.rmSync(dir, { recursive: true, force: true });
  }
});
