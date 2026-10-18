import assert from "node:assert/strict";
import test from "node:test";
import { compileUiBlock } from "../ui/core/compile.mjs";
import { buildSrcdoc, readSandboxMessage, sandboxRemote } from "../ui/host.mjs";

test("sandbox document stays offline and only prompts when the host allows it", () => {
  const doc = buildSrcdoc({
    html: "<button id=\"b\">下一步</button>",
    css: "button{color:var(--blue)}",
    js: "document.getElementById('b').onclick=()=>GardenUI.issuePrompt('继续')",
    canPrompt: false,
  });
  assert.match(doc, /default-src 'none'/u);
  assert.match(doc, /canPrompt: false/u);
  assert.match(doc, /--blue: #30302E/u);
  assert.match(doc, /--ink: #1B1A18/u);
  assert.match(doc, /getBoundingClientRect\(\)\.bottom/u);
  assert.equal(doc.includes("https://"), false);
  const dark = buildSrcdoc({ theme: "dark", css: "</style><script>1</script>" });
  assert.match(dark, /--ink: #EEECE7/u);
  assert.match(dark, /--blue: #EEECE7/u);
  assert.equal(dark.includes("</style><script>"), false);
  assert.equal(sandboxRemote("<script src=\"https://cdn.example/a.js\"></script>"), "不能加载远程脚本");
});

test("sandbox messages ignore anything that is not the frame protocol", () => {
  assert.equal(readSandboxMessage({ source: "other", type: "openUrl", url: "https://example.com" }), null);
  assert.equal(readSandboxMessage({ source: "garden-ui-sandbox", type: "openUrl", url: "http://example.com" }), null);
  assert.deepEqual(readSandboxMessage({ source: "garden-ui-sandbox", type: "height", height: 240 }), { type: "height", height: 240 });
  assert.deepEqual(readSandboxMessage({ source: "garden-ui-sandbox", type: "copy", text: "  42 " }), { type: "copy", text: "  42 " });
});

test("a sandbox block compiles and a remote script does not", () => {
  const ok = compileUiBlock(`---
id: counter
caption: 点一下，数字加一。
intent: |
  做一个计数器
---
<Sandbox title="计数" html={"<p id=\\"n\\">0</p>"} js="document.getElementById('n').textContent='1'" />
`);
  assert.equal(ok.check.ok, true);
  const blocked = compileUiBlock(`---
id: remote
caption: 这块不该通过。
intent: |
  加载远程脚本
---
<Sandbox title="远程" html={"<script src=\\"https://cdn.example/a.js\\"></script>"} />
`);
  assert.equal(blocked.check.ok, false);
});
