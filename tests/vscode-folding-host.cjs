// Run only with Cursor/VS Code --extensionTestsPath, not node --test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vscode = require("vscode");

exports.run = async function () {
  const extension = vscode.extensions.getExtension("hedon954.garden-ui");
  assert.ok(extension, "Garden extension is loaded");
  await extension.activate();
  await vscode.extensions.getExtension("vscode.markdown-language-features").activate();
  const source = [
    "# Heading", "", "intro", "", "- one", "  - nested", "", 
    "```garden compose", "<intent>说明</intent>", "<view>", "  <row>",
    "    <text>正文</text>", "  </row>", "</view>", "```", "",
    "~~~garden compose", "未编译的原文", "~~~", "",
    "```js", "const x = 1;", "```", "", "# Next", "", "end",
  ].join("\n");
  const document = await vscode.workspace.openTextDocument({ language: "markdown", content: source });
  const editor = await vscode.window.showTextDocument(document);
  const config = vscode.workspace.getConfiguration("editor", document);
  assert.equal(document.languageId, "markdown");
  assert.equal(config.get("folding"), true);
  assert.equal(config.get("foldingStrategy"), "auto");
  assert.equal(config.get("showFoldingControls"), "always");
  // Request the real registered language provider. No mocked folding providers.
  let ranges = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    ranges = await vscode.commands.executeCommand("vscode.executeFoldingRangeProvider", document.uri) || [];
    if ([0, 4, 7, 16, 20].every((start) => ranges.some((range) => range.start === start))) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  for (const start of [0, 4, 7, 16, 20]) assert.ok(ranges.some((range) => range.start === start), `missing native range at ${start}: ${JSON.stringify(ranges)}`);
  editor.selection = new vscode.Selection(7, 0, 7, 0);
  await vscode.commands.executeCommand("editor.fold", { selectionLines: [7], levels: 1 });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const folded = editor.visibleRanges.map((range) => [range.start.line, range.end.line]);
  assert.ok(!editor.visibleRanges.some((range) => range.start.line <= 10 && range.end.line >= 10), "Compose interior must be hidden");
  await vscode.commands.executeCommand("editor.unfold", { selectionLines: [7], levels: 1 });
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.ok(editor.visibleRanges.some((range) => range.start.line <= 10 && range.end.line >= 10), "Compose interior must reappear");
  assert.equal(document.getText(), source, "folding must not edit the document");
  const result = { languageId: document.languageId, folding: config.get("folding"), strategy: config.get("foldingStrategy"), controls: config.get("showFoldingControls"), ranges, folded, unfolded: editor.visibleRanges.map((range) => [range.start.line, range.end.line]) };
  fs.writeFileSync(process.env.GARDEN_FOLD_HOST_RESULT, JSON.stringify(result, null, 2));
};
