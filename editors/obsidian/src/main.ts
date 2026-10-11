import {
  loadMermaid,
  MarkdownRenderChild,
  Modal,
  normalizePath,
  Notice,
  Plugin,
  SuggestModal,
  type App,
  type Editor,
  type MarkdownPostProcessorContext,
} from "obsidian";
import { resolveSidecarPath } from "../../../ui/core/fence.mjs";
import { intentFence, render, renderCatalog, renderIntent, starters } from "../../../ui/preview/index";

declare const __GARDEN_RECIPES__: { file: string; markdown: string }[];

type Starter = { id: string; label: string; text: string };
type Handle = { destroy(): void };

const theme = () => (document.body.classList.contains("theme-dark") ? "dark" : "light");

/** Puts a fence on its own lines at the cursor and leaves the cursor inside it. */
function insertFence(editor: Editor, fence: string, cursorOffset: number) {
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  let start = cursor.line;
  if (line.trim()) {
    editor.setCursor({ line: cursor.line, ch: line.length });
    editor.replaceSelection(`\n\n${fence}`);
    start = cursor.line + 2;
  } else {
    editor.replaceSelection(fence);
  }
  editor.setCursor({ line: start + cursorOffset, ch: 0 });
}

function insertIntent(editor: Editor, text: string) {
  insertFence(editor, intentFence(text), 1);
  const blank = text.indexOf("「」");
  if (blank >= 0) editor.setCursor({ line: editor.getCursor().line, ch: blank + 1 });
}

class BlockChild extends MarkdownRenderChild {
  private handle: Handle | null = null;

  constructor(
    containerEl: HTMLElement,
    private readonly draw: (target: HTMLElement) => Handle,
    private readonly children: Set<BlockChild>,
  ) {
    super(containerEl);
  }

  onload() {
    this.handle = this.draw(this.containerEl);
    this.children.add(this);
  }

  redraw() {
    this.handle?.destroy();
    this.containerEl.empty();
    this.handle = this.draw(this.containerEl);
  }

  onunload() {
    this.children.delete(this);
    this.handle?.destroy();
    this.handle = null;
  }
}

class StarterModal extends SuggestModal<Starter> {
  constructor(app: App, private readonly choose: (starter: Starter) => void) {
    super(app);
    this.setPlaceholder("想让读者做什么？用一句话描述就行");
  }

  getSuggestions(query: string) {
    const all: Starter[] = [{ id: "blank", label: "空白意图块", text: "" }, ...starters];
    const needle = query.trim();
    return needle ? all.filter((item) => item.label.includes(needle) || item.text.includes(needle)) : all;
  }

  renderSuggestion(item: Starter, el: HTMLElement) {
    el.createEl("div", { text: item.label });
    if (item.text) el.createEl("small", { text: item.text, cls: "garden-starter-text" });
  }

  onChooseSuggestion(item: Starter) {
    this.choose(item);
  }
}

class CatalogModal extends Modal {
  private handle: Handle | null = null;

  constructor(app: App, private readonly start: (fence: string) => void) {
    super(app);
  }

  onOpen() {
    this.modalEl.addClass("garden-catalog-modal");
    this.handle = renderCatalog(this.contentEl, {
      theme: theme(),
      recipes: __GARDEN_RECIPES__,
      onStart: (fence) => {
        this.close();
        this.start(fence);
      },
    });
  }

  onClose() {
    this.handle?.destroy();
    this.handle = null;
    this.contentEl.empty();
  }
}

export default class GardenUiPlugin extends Plugin {
  private readonly children = new Set<BlockChild>();

  async onload() {
    this.registerMarkdownCodeBlockProcessor("ui", (source, el, ctx) => {
      const fenceLine = (ctx.getSectionInfo(el)?.lineStart ?? 0) + 1;
      ctx.addChild(
        new BlockChild(
          el,
          (target) =>
            render(target, source, {
              theme: theme(),
              isolateEvents: true,
              fenceLine,
              readFile: (src) => this.readSidecar(ctx.sourcePath, src),
              resolveAsset: (src) => this.assetUrl(ctx.sourcePath, src),
            }),
          this.children,
        ),
      );
    });

    this.registerMarkdownCodeBlockProcessor("intent", (source, el, ctx) => {
      ctx.addChild(
        new BlockChild(
          el,
          (target) =>
            renderIntent(target, source, {
              id: this.intentId(el, ctx),
              theme: theme(),
              isolateEvents: true,
              onCopyPrompt: () => void this.copyPrompt(ctx.sourcePath),
            }),
          this.children,
        ),
      );
    });

    this.addCommand({
      id: "insert-intent",
      name: "插入意图块",
      editorCallback: (editor) => new StarterModal(this.app, (starter) => insertIntent(editor, starter.text)).open(),
    });
    this.addCommand({
      id: "copy-compile-prompt",
      name: "复制编译提示词",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) void this.copyPrompt(file.path);
        return true;
      },
    });
    this.addCommand({ id: "open-catalog", name: "查看组件清单", callback: () => this.openCatalog() });

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        menu.addItem((item) =>
          item
            .setTitle("插入意图块")
            .setIcon("sparkles")
            .onClick(() => new StarterModal(this.app, (starter) => insertIntent(editor, starter.text)).open()),
        );
      }),
    );
    this.registerEvent(this.app.workspace.on("css-change", () => this.children.forEach((child) => child.redraw())));

    // Diagram blocks use the Mermaid that Obsidian already ships.
    try {
      const globals = globalThis as { mermaid?: unknown };
      globals.mermaid ??= await loadMermaid();
    } catch {
      // Diagram falls back to showing its source.
    }
  }

  onunload() {
    this.children.clear();
  }

  private intentId(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const info = ctx.getSectionInfo(el);
    if (!info) return null;
    const opening = info.text.split("\n")[info.lineStart] ?? "";
    return opening.replace(/^\s*(`{3,}|~{3,})\s*intent\s*/u, "").split(/\s+/u)[0] || null;
  }

  private async readSidecar(sourcePath: string, src: string) {
    const resolved = resolveSidecarPath(sourcePath, src);
    if (!("path" in resolved) || !resolved.path) return undefined;
    try {
      return await this.app.vault.adapter.read(normalizePath(resolved.path));
    } catch {
      return undefined;
    }
  }

  private assetUrl(sourcePath: string, src: string) {
    const resolved = resolveSidecarPath(sourcePath, src);
    if (!("path" in resolved) || !resolved.path) return src;
    return this.app.vault.adapter.getResourcePath(normalizePath(resolved.path));
  }

  private async copyPrompt(sourcePath: string) {
    const prompt = `编译这篇：${sourcePath}`;
    await navigator.clipboard.writeText(prompt);
    new Notice(`已复制：${prompt}`);
  }

  private openCatalog() {
    new CatalogModal(this.app, (fence) => {
      const editor = this.app.workspace.activeEditor?.editor;
      if (editor) {
        insertFence(editor, `${fence}\n`, 1);
        return;
      }
      void navigator.clipboard.writeText(fence).then(() => new Notice("没有打开的稿件，围栏已复制到剪贴板。"));
    }).open();
  }
}
