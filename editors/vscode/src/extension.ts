import {previewCompose} from "../../../ui/compose/preview.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  collectDataSources,
  findBlocks,
  resolveSidecarPath,
  scanMarkdown,
} from "../../../ui/core/index.mjs";
import { checkGardenMarkdown } from "../../../ui/garden/check.mjs";
import { gardenFoldRanges, runGardenFold } from "./folding.mjs";
import { composeFenceOpen, copyPickerPrompt, pickerItems } from "../../../ui/garden/snippets.mjs";

declare const __GARDEN_RECIPES__: { file: string; markdown: string }[];

type Block = ReturnType<typeof scanMarkdown>[number];
type MarkdownToken = { info: string; content: string; map: [number, number] | null };
type FenceRule = (tokens: MarkdownToken[], index: number, options: unknown, env: MarkdownEnv, self: { renderToken: (...args: unknown[]) => string }) => string;
type MarkdownIt = { renderer: { rules: { fence?: FenceRule } } };
type MarkdownEnv = { currentDocument?: vscode.Uri } | undefined;

const MAX_DATA_BYTES = 200 * 1024;
const STATUS_LABEL: Record<string, string> = { ok: "正常", error: "有错", uncompiled: "未编译" };

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const toBase64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

function markdownPathOf(uri: vscode.Uri | undefined) {
  return uri && uri.scheme === "file" && uri.fsPath.endsWith(".md") ? uri.fsPath : null;
}

function readSidecar(markdownPath: string, src: string) {
  const resolved = resolveSidecarPath(markdownPath, src);
  if (!("path" in resolved) || !resolved.path) return undefined;
  try {
    if (fs.statSync(resolved.path).size > MAX_DATA_BYTES) return undefined;
    return fs.readFileSync(resolved.path, "utf8");
  } catch {
    return undefined;
  }
}

/** English sites (`locale: en_US`) use the English garden-compose skill trigger. */
function englishSite(start: string) {
  let dir = path.dirname(start);
  for (let i = 0; i < 8; i += 1) {
    try {
      const raw = fs.readFileSync(path.join(dir, "site.config.yaml"), "utf8");
      return /^locale:\s*en/imu.test(raw);
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return false;
}

function compilePrompt(uri: vscode.Uri) {
  const relative = vscode.workspace.asRelativePath(uri, false);
  const file = uri.scheme === "file" ? uri.fsPath : "";
  return file && englishSite(file) ? `Compile this post: ${relative}` : `编译这篇：${relative}`;
}

/* ---------- Markdown preview ---------- */

function composeHost(token: MarkdownToken, env: MarkdownEnv) {
  const markdownPath = markdownPathOf(env?.currentDocument);
  const files: Record<string, string> = {};
  if (markdownPath) {
    for (const src of collectDataSources(`\`\`\`${token.info}\n${token.content}\n\`\`\``)) {
      const text = readSidecar(markdownPath, src);
      if (typeof text === "string") files[src] = text;
    }
  }
  const fenceLine = token.map ? token.map[0] + 1 : 1;
  const previewOptions = { info: token.info, readData: (src: string) => files[src], skipData: !markdownPath };
  const preview = previewCompose(token.content, previewOptions);
  const snapshot=preview.html||`<blockquote>${escapeHtml(preview.diagnostics.map((d:{message:string})=>d.message).join("；"))}</blockquote>`;
  const line = token.map ? ` data-line="${token.map[0]}"` : "";
  return `<div class="garden-ui-host code-line"${line} data-garden-lang="compose" data-garden-prompt="${env?.currentDocument?escapeHtml(compilePrompt(env.currentDocument)):""}" data-garden-fence-line="${fenceLine}" data-garden-source="${toBase64(token.content)}" data-garden-files="${toBase64(JSON.stringify(files))}">${snapshot}</div>\n`;
}

function extendMarkdownIt(md: MarkdownIt) {
  const fallback = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index];
    if (/^garden\s+compose(?:\s|$)/u.test(token.info.trim())) return composeHost(token, env);
    return fallback ? fallback(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
  };
  return md;
}

/* ---------- Diagnostics, CodeLens, folding ---------- */

class BlockIndex implements vscode.CodeLensProvider {
  private readonly blocks = new Map<string, Block[]>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changed.event;
  readonly diagnostics = vscode.languages.createDiagnosticCollection("garden-ui");

  schedule(document: vscode.TextDocument, delay = 300) {
    if (document.languageId !== "markdown") return;
    const key = document.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => this.refresh(document), delay));
  }

  forget(document: vscode.TextDocument) {
    const key = document.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    this.blocks.delete(key);
    this.diagnostics.delete(document.uri);
  }

  refresh(document: vscode.TextDocument) {
    const markdownPath = markdownPathOf(document.uri);
    const blocks = scanMarkdown(document.getText(), {
      markdownPath,
      readData: markdownPath ? (src: string) => readSidecar(markdownPath, src) : null,
      skipData: !markdownPath,
    });
    this.blocks.set(document.uri.toString(), blocks);
    const last = Math.max(0, document.lineCount - 1);
    const text = document.getText();
    const titleLine = Math.max(1, text.split(/\r?\n/u).findIndex((line) => /^title:/u.test(line)) + 1);
    const title = text.match(/^title:\s*(.+)$/mu)?.[1]?.replace(/^["']|["']$/gu, "") ?? "";
    const draft = /^draft:\s*true\s*$/mu.test(text);
    const gardenDiagnostics = checkGardenMarkdown(text, { draft, title, titleLine }).map((item) => {
      const range = document.lineAt(Math.min(Math.max(item.line - 1, 0), last)).range;
      const severity = item.severity === "warning" ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
      const diagnostic = new vscode.Diagnostic(range, `${item.message} 建议：${item.suggestion}`, severity);
      diagnostic.code = item.code;
      diagnostic.source = "garden";
      return diagnostic;
    });
    this.diagnostics.set(
      document.uri,
      [
        ...blocks.flatMap((block) =>
          block.diagnostics.map((item: { code: string; line: number; message: string; severity: string }) => {
            const range = document.lineAt(Math.min(Math.max(item.line - 1, 0), last)).range;
            const severity = item.severity === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
            const diagnostic = new vscode.Diagnostic(range, item.message, severity);
            diagnostic.code = item.code;
            diagnostic.source = "garden";
            return diagnostic;
          }),
        ),
        ...gardenDiagnostics,
      ],
    );
    this.changed.fire();
  }

  provideCodeLenses(document: vscode.TextDocument) {
    const blocks = this.blocks.get(document.uri.toString());
    if (!blocks) {
      this.schedule(document, 0);
      return [];
    }
    const foldingLenses = gardenFoldRanges(document.getText()).map(({ start }) =>
      new vscode.CodeLens(new vscode.Range(start, 0, start, 0), {
        title: "收起 Garden 块", command: "garden.foldBlock", arguments: [document.uri, start],
      }),
    );
    return [...foldingLenses, ...blocks.flatMap((block) => {
      const range = new vscode.Range(block.startLine - 1, 0, block.startLine - 1, 0);
      const errors = block.diagnostics.filter((item: { severity: string }) => item.severity === "error").length;
      const name = block.id ? ` · ${block.id}` : "";
      const status = block.status === "error" ? `有错 ${errors} 处` : STATUS_LABEL[block.status] ?? block.status;
      const lenses = [
        new vscode.CodeLens(range, {
          title: `Garden ${block.lang}${name} · ${status}`,
          command: block.status === "error" ? "workbench.actions.view.problems" : "",
        }),
      ];
      if (block.status !== "ok") {
        lenses.push(new vscode.CodeLens(range, { title: "复制编译提示词", command: "garden.copyCompilePrompt", arguments: [document.uri] }));
      }
      lenses.push(new vscode.CodeLens(range, { title: "组件清单", command: "garden.openCatalog" }));
      return lenses;
    })];
  }

}

async function foldBodies(editor: vscode.TextEditor, folded: Set<string>) {
  const key = editor.document.uri.toString();
  if (editor.document.languageId !== "markdown" || folded.has(key)) return;
  folded.add(key);
  if (!vscode.workspace.getConfiguration("garden").get<boolean>("foldUiBodies", true)) return;
  const starts = findBlocks(editor.document.getText())
    .filter((fence) => fence.lang === "garden-compose" && fence.closed && fence.endLine > fence.startLine)
    .map((fence) => fence.startLine - 1);
  if (!starts.length) return;
  // Folding providers answer asynchronously after a document opens; folding too early is a no-op.
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (vscode.window.activeTextEditor !== editor) return;
  await vscode.commands.executeCommand("editor.fold", { selectionLines: starts, levels: 1, direction: "up" });
}

/* ---------- Commands ---------- */

async function foldGarden(action: "fold" | "unfold", all: boolean, uri?: vscode.Uri, line?: number) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "markdown") return;
  if (uri && uri.toString() !== editor.document.uri.toString()) return;
  const changed = await runGardenFold({
    markdown: editor.document.getText(),
    line: line ?? editor.selection.active.line,
    action,
    all,
    execute: (command: string, args: { selectionLines: number[]; levels: number; direction: string }) =>
      vscode.commands.executeCommand(command, args),
  });
  if (!changed) void vscode.window.showInformationMessage(all ? "当前稿件没有已闭合的 Garden 块。" : "请把光标放在已闭合的 Garden 块内。");
}


async function insertIntent() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "markdown") return;
  const items = pickerItems().map((item) => ({
    label: item.label,
    description: item.hint ?? item.when,
    text: item.body,
    prompt: item.prompt,
  }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: "插入 Garden 块" });
  if (!picked) return;
  await copyPickerPrompt(picked, {
    writeText: (text) => vscode.env.clipboard.writeText(text),
    notifySuccess: (message) => void vscode.window.showInformationMessage(message),
    notifyFailure: (message) => void vscode.window.showWarningMessage(message),
  });
  const position = editor.selection.active;
  const lineText = editor.document.lineAt(position.line).text;
  const prefix = lineText.trim() ? "\n\n" : "";
  const at = prefix ? new vscode.Position(position.line, lineText.length) : position;
  await editor.insertSnippet(new vscode.SnippetString(`${prefix}${picked.text}
`), at);
}

function gardenCompletions() {
  return vscode.languages.registerCompletionItemProvider(
    { language: "markdown" },
    {
      provideCompletionItems(document, position) {
        const line = document.lineAt(position).text.slice(0, position.character);
        if (!/(^|\s)`{3,}g(?:arden)?\s*$/u.test(line) && !/`{3,}garden\s+\w*$/u.test(line)) return undefined;
        const completion = new vscode.CompletionItem("compose", vscode.CompletionItemKind.Snippet);
        completion.detail = "Garden Compose";
        completion.documentation = "在统一的 garden compose 围栏里组合内容。图示选择请用插入 Garden 块命令。";
        completion.insertText = new vscode.SnippetString(`${composeFenceOpen()}
$0
\`\`\``);
        completion.filterText = composeFenceOpen();
        return [completion];

      },
    },
    " ",
    "n",
  );
}

async function copyCompilePrompt(uri?: vscode.Uri) {
  const target = uri ?? vscode.window.activeTextEditor?.document.uri;
  if (!target) return;
  const prompt = compilePrompt(target);
  await vscode.env.clipboard.writeText(prompt);
  const commands = await vscode.commands.getCommands(true);
  const canChat = commands.includes("workbench.action.chat.open");
  const action = await vscode.window.showInformationMessage(`已复制：${prompt}`, ...(canChat ? ["发到聊天"] : []));
  if (action === "发到聊天") await vscode.commands.executeCommand("workbench.action.chat.open", { query: prompt, isPartialQuery: true });
}

function openCatalog(context: vscode.ExtensionContext, lastMarkdown: () => vscode.TextEditor | undefined) {
  const dist = vscode.Uri.joinPath(context.extensionUri, "dist");
  const panel = vscode.window.createWebviewPanel("gardenCatalog", "Garden 组件清单", vscode.ViewColumn.Beside, {
    enableScripts: true,
    localResourceRoots: [dist],
  });
  const { webview } = panel;
  const nonce = Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
  const kind = vscode.window.activeColorTheme.kind;
  const theme = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast ? "dark" : "light";
  const recipes = JSON.stringify(__GARDEN_RECIPES__).replaceAll("<", "\\u003c");
  webview.html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${webview.asWebviewUri(vscode.Uri.joinPath(dist, "garden-ui.css"))}">
<style>body { padding: 16px 24px 48px; }</style>
</head>
<body>
<main id="catalog"></main>
<script nonce="${nonce}" src="${webview.asWebviewUri(vscode.Uri.joinPath(dist, "garden-ui.iife.js"))}"></script>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
GardenUI.renderCatalog(document.getElementById("catalog"), {
  theme: "${theme}",
  recipes: ${recipes},
  onStart: (fence) => vscode.postMessage({ type: "start", fence }),
});
</script>
</body>
</html>`;
  webview.onDidReceiveMessage(async (message: { type?: string; fence?: unknown }) => {
    if (message?.type !== "start" || typeof message.fence !== "string") return;
    const editor = lastMarkdown();
    if (!editor) {
      await vscode.env.clipboard.writeText(message.fence);
      void vscode.window.showInformationMessage("没有打开的稿件，围栏已复制到剪贴板。");
      return;
    }
    const position = editor.selection.active;
    const lineText = editor.document.lineAt(position.line).text;
    const prefix = lineText.trim() ? "\n\n" : "";
    await editor.edit((edit) => edit.insert(prefix ? new vscode.Position(position.line, lineText.length) : position, `${prefix}${message.fence}\n`));
    void vscode.window.showTextDocument(editor.document, editor.viewColumn);
  }, undefined, context.subscriptions);
}

export function activate(context: vscode.ExtensionContext) {
  const index = new BlockIndex();
  const folded = new Set<string>();
  let lastMarkdown: vscode.TextEditor | undefined;
  const track = (editor: vscode.TextEditor | undefined) => {
    if (editor?.document.languageId === "markdown") {
      lastMarkdown = editor;
      void foldBodies(editor, folded);
    }
  };

  const selector: vscode.DocumentSelector = { language: "markdown" };
  context.subscriptions.push(
    index.diagnostics,
    vscode.languages.registerCodeLensProvider(selector, index),
    gardenCompletions(),
    vscode.workspace.onDidOpenTextDocument((document) => index.schedule(document, 0)),
    vscode.workspace.onDidChangeTextDocument((event) => index.schedule(event.document)),
    vscode.workspace.onDidSaveTextDocument((document) => index.schedule(document, 0)),
    vscode.workspace.onDidCloseTextDocument((document) => {
      index.forget(document);
      folded.delete(document.uri.toString());
    }),
    vscode.window.onDidChangeActiveTextEditor(track),
    vscode.commands.registerCommand("garden.foldBlock", (uri?: vscode.Uri, line?: number) => foldGarden("fold", false, uri, line)),
    vscode.commands.registerCommand("garden.unfoldBlock", () => foldGarden("unfold", false)),
    vscode.commands.registerCommand("garden.foldAllBlocks", () => foldGarden("fold", true)),
    vscode.commands.registerCommand("garden.unfoldAllBlocks", () => foldGarden("unfold", true)),
    vscode.commands.registerCommand("garden.insertIntent", insertIntent),
    vscode.commands.registerCommand("garden.copyCompilePrompt", copyCompilePrompt),
    vscode.commands.registerCommand("garden.openCatalog", () => openCatalog(context, () => lastMarkdown)),
  );
  for (const document of vscode.workspace.textDocuments) index.schedule(document, 0);
  track(vscode.window.activeTextEditor);

  return { extendMarkdownIt };
}

export function deactivate() {}
