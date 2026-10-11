import { resolveSidecarPath } from "../../../ui/core/fence.mjs";
import { intentFence, render, renderIntent, starters } from "../../../ui/preview/index";

// typora-community-plugin exposes its core on this symbol; its own build plugin rewrites imports to the same lookup.
type Dispose = () => void;
type Command = { id: string; title: string; scope: "global" | "editor"; hotkey?: string | null; callback: () => void };
type QuickPickItem = { label: string };
type Core = {
  Plugin: new (...args: never[]) => {
    app: {
      features: {
        markdownEditor: {
          codeblock: { registerMode(options: { lang: string; mode: unknown; render: (code: string) => HTMLElement }): Dispose };
        };
      };
    };
    register(dispose: Dispose): void;
    registerCommand(command: Command): void;
    onload?(): void;
    onunload?(): void;
  };
  Notice: { info(message: string): void; success(message: string): void };
  openQuickPick<I extends QuickPickItem>(items: I[], options?: { placeholder?: string }): Promise<I | undefined>;
  fs: { readText(path: string): Promise<string> };
};
type TyporaGlobals = {
  File?: { bundle?: { filePath?: string }; filePath?: string };
  editor?: { UserOp?: { pasteHandler(editor: unknown, content: string, isMarkdown?: boolean): void } };
  CodeMirror?: { getMode(config: unknown, spec: unknown): unknown };
};

const core = (window as unknown as Record<symbol, Core>)[Symbol.for("typora-plugin-core@v2")];
const typora = window as unknown as TyporaGlobals;
const isMac = /mac/iu.test(navigator.platform);
const STALE_MS = 2000;

/** Typora themes are arbitrary CSS, so judge darkness from the first opaque background behind the text. */
function theme(): "light" | "dark" {
  for (const element of [document.getElementById("write"), document.body, document.documentElement]) {
    if (!element) continue;
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/u.exec(getComputedStyle(element).backgroundColor);
    if (!match || (match[4] !== undefined && Number(match[4]) === 0)) continue;
    const [r, g, b] = match.slice(1, 4).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? "dark" : "light";
  }
  return "light";
}

function currentFile() {
  return typora.File?.bundle?.filePath || typora.File?.filePath || "";
}

function codeMode(config: unknown) {
  try {
    return typora.CodeMirror?.getMode(config, "markdown") ?? { token: (stream: { skipToEnd(): void }) => (stream.skipToEnd(), null) };
  } catch {
    return { token: (stream: { skipToEnd(): void }) => (stream.skipToEnd(), null) };
  }
}

export default class GardenTyporaPlugin extends core.Plugin {
  private readonly mounted = new Set<{ host: HTMLElement; handle: { destroy(): void }; created: number }>();

  onload() {
    const { codeblock } = this.app.features.markdownEditor;
    this.register(codeblock.registerMode({ lang: "ui", mode: codeMode, render: (code) => this.mount("ui", code) }));
    this.register(codeblock.registerMode({ lang: "intent", mode: codeMode, render: (code) => this.mount("intent", code) }));
    this.registerCommand({
      id: "insert-intent",
      title: "Garden：插入意图块",
      scope: "editor",
      // macOS Option rewrites event.key (Option+I is "ˆ"), which the hotkey matcher compares; bind it in settings there.
      hotkey: isMac ? null : "Ctrl+Alt+I",
      callback: () => void this.insertIntent(),
    });
    this.registerCommand({ id: "copy-compile-prompt", title: "Garden：复制编译提示词", scope: "editor", callback: () => void this.copyPrompt() });
    this.register(() => {
      for (const entry of this.mounted) entry.handle.destroy();
      this.mounted.clear();
    });
  }

  /** Typora calls `render` again after each edit and swaps the element in; drop roots whose element left the page. */
  private sweep() {
    const now = Date.now();
    for (const entry of this.mounted) {
      if (entry.host.isConnected || now - entry.created < STALE_MS) continue;
      entry.handle.destroy();
      this.mounted.delete(entry);
    }
  }

  private mount(lang: "ui" | "intent", code: string) {
    this.sweep();
    const host = document.createElement("div");
    host.className = "garden-ui-typora";
    const handle =
      lang === "ui"
        ? render(host, code, {
            theme: theme(),
            isolateEvents: true,
            readFile: (src) => this.readSidecar(src),
            resolveAsset: (src) => this.assetUrl(src),
          })
        : renderIntent(host, code, { theme: theme(), isolateEvents: true, onCopyPrompt: () => void this.copyPrompt() });
    this.mounted.add({ host, handle, created: Date.now() });
    return host;
  }

  private sidecarPath(src: string) {
    const file = currentFile();
    if (!file) return null;
    const resolved = resolveSidecarPath(file, src);
    return "path" in resolved && resolved.path ? resolved.path : null;
  }

  private async readSidecar(src: string) {
    const path = this.sidecarPath(src);
    if (!path) return undefined;
    try {
      return await core.fs.readText(path);
    } catch {
      return undefined;
    }
  }

  private assetUrl(src: string) {
    const path = this.sidecarPath(src);
    return path ? `file://${encodeURI(path.replaceAll("\\", "/"))}` : src;
  }

  private async insertIntent() {
    const items = [{ label: "空白意图块", text: "" }, ...starters.map((item: { label: string; text: string }) => ({ label: item.label, text: item.text }))];
    const picked = await core.openQuickPick(items, { placeholder: "想让读者做什么？用一句话描述就行" });
    if (!picked) return;
    const editor = typora.editor;
    editor?.UserOp?.pasteHandler(editor, `\n${intentFence(picked.text)}`, true);
  }

  private async copyPrompt() {
    const file = currentFile();
    if (!file) return;
    const prompt = `编译这篇：${file}`;
    await navigator.clipboard.writeText(prompt);
    core.Notice.success(`已复制：${prompt}`);
  }
}
