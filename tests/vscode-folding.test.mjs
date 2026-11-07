import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { gardenFoldRanges, runGardenFold } from "../editors/vscode/src/folding.mjs";

const compose = ["```garden compose", "<intent>说明</intent>", "<view><text>正文</text></view>", "```"].join("\n");

test("folds uncompiled and compiled Compose and tilde fences", () => {
  for (const text of [compose, "~~~garden compose\n原文\n~~~"])
    assert.deepEqual(gardenFoldRanges(text), [{ start: 0, end: text.split("\n").length - 1 }]);
});

test("uses scanner boundaries: CRLF, longer fence, embedded Markdown, no ordinary fences", () => {
  const source = ["# Title", "", "````garden compose", "```md", "text", "```", "````", "```js", "code", "```"].join("\r\n");
  assert.deepEqual(gardenFoldRanges(source), [{ start: 2, end: 6 }]);
  assert.deepEqual(gardenFoldRanges("````md\n" + compose + "\n````"), []);
  assert.deepEqual(gardenFoldRanges("    ```garden compose\n    text\n    ```"), []);
});

test("does not fold unclosed or mismatched fences through the rest of a draft", () => {
  for (const source of ["```garden compose\ntext", "```garden compose\ntext\n~~~", "````garden compose\ntext\n```", "# title\n- item"])
    assert.deepEqual(gardenFoldRanges(source), []);
});

test("current fold and unfold target the opening line from anywhere inside, including closer", async () => {
  for (const action of ["fold", "unfold"]) for (const line of [0, 1, 3]) {
    const calls = [];
    assert.equal(await runGardenFold({ markdown: compose, line, action, all: false, execute: (...args) => calls.push(args) }), true);
    assert.deepEqual(calls, [["editor." + action, { selectionLines: [0], levels: 1, direction: "up" }]]);
  }
});

test("all targets only Garden blocks; outside current and unclosed blocks are no-ops", async () => {
  const markdown = compose + "\nparagraph\n```js\ncode\n```\n" + compose;
  const calls = [];
  await runGardenFold({ markdown, line: 4, action: "fold", all: true, execute: (...args) => calls.push(args) });
  assert.deepEqual(calls, [["editor.fold", { selectionLines: [0, 8], levels: 1, direction: "up" }]]);
  calls.length = 0;
  assert.equal(await runGardenFold({ markdown, line: 4, action: "fold", all: false, execute: (...args) => calls.push(args) }), false);
  assert.deepEqual(calls, []);
});

test("commands are discoverable without extra shortcuts or replacing native Markdown folding", () => {
  const manifest = JSON.parse(readFileSync(new URL("../editors/vscode/package.json", import.meta.url)));
  const source = readFileSync(new URL("../editors/vscode/src/extension.ts", import.meta.url), "utf8");
  for (const name of ["foldBlock", "unfoldBlock", "foldAllBlocks", "unfoldAllBlocks"]) {
    const id = "garden." + name;
    assert.ok(manifest.contributes.commands.some((entry) => entry.command === id));
    assert.ok(manifest.contributes.menus["editor/context"].some((entry) => entry.command === id));
    assert.ok(manifest.contributes.menus.commandPalette.some((entry) => entry.command === id));
    assert.ok(!manifest.contributes.keybindings.some((entry) => entry.command === id));
    assert.ok(source.includes('registerCommand("' + id + '"'));
  }
  assert.doesNotMatch(source, /registerFoldingRangeProvider/u);
  assert.match(source, /title: "收起 Garden 块"/u);
});


test("Markdown defaults expose native gutter controls without mutating user settings", () => {
  const manifest = JSON.parse(readFileSync(new URL("../editors/vscode/package.json", import.meta.url)));
  assert.deepEqual(manifest.contributes.configurationDefaults, {
    "[markdown]": { "editor.folding": true, "editor.foldingStrategy": "auto", "editor.showFoldingControls": "always" },
  });
});
