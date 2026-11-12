import { resolveSidecarPath } from "../../../ui/core/fence.mjs";
import { pickerItems } from "../../../ui/garden/snippets.mjs";
import { render } from "../../../ui/preview/index";
import { GardenSlashSuggest } from "./slash-suggest";

// typora-community-plugin exposes its core on this symbol; its own build plugin rewrites imports to the same lookup.
type Dispose = () => void;
type Command = { id: string; title: string; scope: "global" | "editor"; hotkey?: string | null; callback: () => void };
type QuickPickItem = { label: string };
type PickerItem = ReturnType<typeof pickerItems>[number];
type Core = {
  Plugin: new (...args: never[]) => {
    app: {
      features: {
        markdownEditor: {
          codeblock: { registerMode(options: { lang: string; mode: unknown; render: (code: string) => HTMLElement }): Dispose };
          emit?(name: "edit"): void;
        };
      };
    };
    register(dispose: Dispose): void;
    registerCommand(command: Command): void;
    registerMarkdownSuggest?(suggest: object): void;
    registerMarkdownSugguest?(suggest: object): void;
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

function parentDir(file: string) {
  const trimmed = file.replace(/[/\\]+$/u, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index <= 0 ? "" : trimmed.slice(0, index);
}

/** English sites (`locale: en_US`) use the English garden-ui skill trigger. */
async function compilePrompt(file: string) {
  let dir = parentDir(file);
  for (let i = 0; i < 8 && dir; i += 1) {
    const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
    try {
      const raw = await core.fs.readText(`${dir}${sep}site.config.yaml`);
      const relative = file.startsWith(dir) ? file.slice(dir.length).replace(/^[/\\]/u, "") : file;
      return /^locale:\s*en/imu.test(raw) ? `Compile this post: ${relative}` : `编译这篇：${relative}`;
    } catch {
      dir = parentDir(dir);
    }
  }
  return `编译这篇：${file}`;
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
    this.register(codeblock.registerMode({ lang: "garden", mode: codeMode, render: (code) => this.mount(code) }));
    this.registerCommand({
      id: "insert-intent",
      title: "插入 Garden 块",
      scope: "editor",
      // macOS Option rewrites event.key (Option+I is "ˆ"), which the hotkey matcher compares; bind it in settings there.
      hotkey: isMac ? null : "Ctrl+Alt+I",
      callback: () => void this.insertIntent(),
    });
    this.registerCommand({ id: "copy-compile-prompt", title: "Garden：复制编译提示词", scope: "editor", callback: () => void this.copyPrompt() });
    const registerSuggest = this.registerMarkdownSuggest?.bind(this) ?? this.registerMarkdownSugguest?.bind(this);
    if (registerSuggest) registerSuggest(new GardenSlashSuggest(this.app.features.markdownEditor));
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

  private mount(code:string) {
    this.sweep();
    const host=document.createElement("div");host.className="garden-ui-typora";
    const handle=render(host,code,{theme:theme(),isolateEvents:true,readFile:src=>this.readSidecar(src),resolveAsset:src=>this.assetUrl(src),onCopyPrompt:()=>void this.copyPrompt()});
    this.mounted.add({host,handle,created:Date.now()});return host;
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
    const items = pickerItems().map((item) => ({ label: item.label, text: item.body }));
    const picked = await core.openQuickPick(items, { placeholder: "插入 Garden 块" });
    if (!picked) return;
    const editor = typora.editor;
    editor?.UserOp?.pasteHandler(editor, `\n${picked.text}\n`, true);
  }

  private async copyPrompt() {
    const file = currentFile();
    if (!file) return;
    const prompt = await compilePrompt(file);
    await navigator.clipboard.writeText(prompt);
    core.Notice.success(`已复制：${prompt}`);
  }
}
