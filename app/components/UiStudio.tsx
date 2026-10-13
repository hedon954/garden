"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, keymap, lineNumbers, type DecorationSet } from "@codemirror/view";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { compileUiBlock } from "../../ui/core/compile.mjs";
import { fenceHash, findBlocks, idOf, intentHash, normalizeNewlines, scanFences, setCompiled, splitUiBody } from "../../ui/core/fence.mjs";
import { renderStatic } from "../../ui/core/static.mjs";
import { collectDataSources } from "../../ui/core/transform.mjs";
import { UiFigure, type Diagnostic, type UiPayload } from "../../ui/react";
import { parseRecipe, type RecipeSource } from "../../ui/react/recipes";

import { STUDIO_START_KEY, STUDIO_STORAGE_KEY as STORAGE_KEY } from "./ui-studio-keys";

type Origin = { post: string; target: { id?: string; intentHash?: string }; base: string };
type HistoryItem = { mode: "create" | "revise"; instruction: string; at: string; note?: string | null; tokens?: number; rounds?: number };
type Usage = { prompt_tokens: number; completion_tokens: number; total_tokens: number };
type FileBlocks = { path: string; title: string | null; draft: boolean; blocks: Array<{ lang: string; id: string | null; status: string; startLine: number; caption: string | null; intent: string | null; hash: string }> };

const setErrorLines = StateEffect.define<number[]>();
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    let next = value.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setErrorLines)) continue;
      const builder = new RangeSetBuilder<Decoration>();
      const doc = transaction.state.doc;
      for (const line of [...new Set(effect.value)].sort((a, b) => a - b)) {
        if (line >= 1 && line <= doc.lines) builder.add(doc.line(line).from, doc.line(line).from, Decoration.line({ class: "cm-garden-error-line" }));
      }
      next = builder.finish();
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const subscribeNothing = () => () => {};

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function stamp(text: string) {
  const fence = scanFences(text).find((item) => item.lang === "ui");
  if (!fence) return text;
  const { header } = splitUiBody(fence.body);
  if (typeof header?.intent !== "string") return text;
  return `${text.slice(0, fence.start)}${setCompiled(fence.raw, intentHash(header.intent))}${text.slice(fence.end)}`;
}

function loadSaved() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as { text?: string; instruction?: string; history?: HistoryItem[] } | null;
    const start = window.localStorage.getItem(STUDIO_START_KEY);
    if (start) window.localStorage.removeItem(STUDIO_START_KEY);
    return { text: start ?? saved?.text ?? "", instruction: start ? "" : saved?.instruction ?? "", history: saved?.history ?? [] };
  } catch {
    return { text: "", instruction: "", history: [] as HistoryItem[] };
  }
}

type StudioProps = { configured: boolean; modelName: string | null; remaining: number; recipes: RecipeSource[] };

export function UiStudio(props: StudioProps) {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!mounted) return <section className="admin-panel ui-studio-loading">正在打开写作台…</section>;
  return <Studio {...props} />;
}

function Studio({ configured, modelName, remaining: initialRemaining, recipes }: StudioProps) {
  const [initial] = useState(loadSaved);
  const [text, setText] = useState(initial.text);
  const [instruction, setInstruction] = useState(initial.instruction);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(initial.history);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [dataFiles, setDataFiles] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ usage: Usage; rounds: number } | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [view, setView] = useState<"interactive" | "static">("interactive");
  const [stage, setStage] = useState<"preview" | "source">("preview");
  const [files, setFiles] = useState<FileBlocks[] | null>(null);
  const [pickedFile, setPickedFile] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const parsedRecipes = useMemo(() => recipes.map(parseRecipe).filter((recipe) => recipe.fence), [recipes]);

  useEffect(() => {
    if (!editorRef.current) return;
    const editor = new EditorView({
      parent: editorRef.current,
      doc: initial.text,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        errorLineField,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setText(update.state.doc.toString());
        }),
      ],
    });
    viewRef.current = editor;
    return () => editor.destroy();
  }, [initial.text]);

  useEffect(() => {
    if (stage === "source") viewRef.current?.requestMeasure();
  }, [stage]);

  const replaceText = (next: string) => {
    const editor = viewRef.current;
    if (!editor) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: next } });
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ text, instruction, history: historyItems.slice(-30) }));
  }, [text, instruction, historyItems]);

  const debouncedText = useDebounced(text, 150);
  const compiled = useMemo(() => {
    const fence = scanFences(debouncedText).find((item) => item.lang === "ui");
    if (!fence) {
      return {
        payload: null as UiPayload | null,
        diagnostics: debouncedText.trim()
          ? [{ code: "ui-header", line: 1, message: "结构栏里要有一个 ```ui 围栏", severity: "error" } as Diagnostic]
          : [],
      };
    }
    const result = compileUiBlock(fence.body, {
      lineOffset: fence.startLine,
      markdownPath: origin?.post ?? null,
      readData: (src: string) => dataFiles[src],
      skipData: !origin,
    });
    return { payload: result.payload as UiPayload | null, diagnostics: result.check.diagnostics as Diagnostic[] };
  }, [debouncedText, origin, dataFiles]);

  const [lastGood, setLastGood] = useState<{ text: string; payload: UiPayload } | null>(null);
  if (compiled.payload && lastGood?.text !== debouncedText) setLastGood({ text: debouncedText, payload: compiled.payload });
  const shown = compiled.payload ?? lastGood?.payload ?? null;

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setErrorLines.of(compiled.diagnostics.filter((item) => item.severity === "error").map((item) => item.line)) });
  }, [compiled.diagnostics]);

  const jumpTo = (line: number) => {
    const editor = viewRef.current;
    if (!editor || line < 1 || line > editor.state.doc.lines) return;
    const position = editor.state.doc.line(line).from;
    editor.dispatch({ selection: { anchor: position }, scrollIntoView: true });
    editor.focus();
  };

  async function generate(mode: "create" | "revise") {
    if (!instruction.trim()) {
      setMessage({ tone: "error", text: "先在指令栏写一句话。" });
      return;
    }
    setBusy(true);
    setMessage(null);
    setNote(null);
    try {
      const response = await fetch("/api/admin/ui/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, instruction, fence: mode === "revise" ? text : undefined }),
      });
      const result = (await response.json()) as { fence?: string | null; note?: string | null; usage?: Usage; rounds?: number; remaining?: number; error?: string; raw?: string };
      if (typeof result.remaining === "number") setRemaining(result.remaining);
      if (!response.ok || !result.fence) {
        setMessage({ tone: "error", text: result.error ?? "生成失败。" });
        if (result.raw) setNote(`模型原文：${result.raw.slice(0, 400)}`);
        return;
      }
      replaceText(result.fence);
      setNote(result.note ?? null);
      if (result.usage) setUsage({ usage: result.usage, rounds: result.rounds ?? 0 });
      setHistoryItems((items) => [...items, { mode, instruction, at: new Date().toISOString(), note: result.note, tokens: result.usage?.total_tokens, rounds: result.rounds }]);
      setMessage({ tone: "info", text: mode === "create" ? "已生成初稿，可以接着用指令或手改调整。Cmd+Z 能撤回。" : "已按指令修改。Cmd+Z 能撤回。" });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "生成失败。" });
    } finally {
      setBusy(false);
    }
  }

  async function loadFiles() {
    if (files) return;
    const response = await fetch("/api/admin/ui/blocks");
    const result = (await response.json()) as { files?: FileBlocks[]; error?: string };
    if (!response.ok || !result.files) {
      setMessage({ tone: "error", text: result.error ?? "读取稿件失败。" });
      return;
    }
    setFiles(result.files);
  }

  async function openBlock(post: string, startLine: number) {
    setMessage(null);
    const response = await fetch(`/api/admin/posts/source?path=${encodeURIComponent(post)}`);
    const result = (await response.json()) as { content?: string; error?: string };
    if (!response.ok || typeof result.content !== "string") {
      setMessage({ tone: "error", text: result.error ?? "读取稿件失败。" });
      return;
    }
    const block = findBlocks(result.content).find((item) => item.startLine === startLine);
    if (!block) {
      setMessage({ tone: "error", text: "稿件已经变了，找不到这一块，刷新交互块列表再试。" });
      return;
    }
    const id = idOf(block);
    const base = fenceHash(block.raw);
    if (block.lang === "intent") {
      const intent = normalizeNewlines(block.body);
      setOrigin({ post, target: id ? { id } : { intentHash: intentHash(intent) }, base });
      setInstruction(intent);
      replaceText("");
      setMessage({ tone: "info", text: "已载入这段想法。按「生成」把它编译成 ui 块。" });
    } else {
      setOrigin({ post, target: id ? { id } : { intentHash: intentHash(splitUiBody(block.body).header?.intent ?? "") }, base });
      replaceText(block.raw);
      setMessage({ tone: "info", text: `已从 ${post} 打开 ${id ?? "这一块"}。改完用「复制写回命令」带回本地。` });
    }
    const sources = collectDataSources(block.raw);
    const loaded: Record<string, string> = {};
    for (const src of sources) {
      const asset = await fetch(`/api/admin/preview/asset?post=${encodeURIComponent(post)}&path=${encodeURIComponent(src)}`);
      if (asset.ok) loaded[src] = await asset.text();
    }
    setDataFiles(loaded);
  }

  const openRequested = useRef(false);
  const openFromUrl = useEffectEvent(() => {
    const params = new URLSearchParams(window.location.search);
    const post = params.get("post");
    const line = Number(params.get("line"));
    if (post && line) void openBlock(post, line);
  });
  useEffect(() => {
    if (openRequested.current) return;
    openRequested.current = true;
    openFromUrl();
  }, []);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setMessage({ tone: "info", text: `${label}已复制。` });
  };

  const stamped = stamp(text);
  const targetFlag = origin?.target.id ? `--id ${origin.target.id}` : origin?.target.intentHash ? `--intent-hash ${origin.target.intentHash}` : "";
  const applyCommand = origin
    ? `npx garden ui apply ${origin.post} ${targetFlag} --base ${origin.base} <<'GARDEN_UI'\n${stamped.trim()}\nGARDEN_UI\n`
    : "";
  const errors = compiled.diagnostics.filter((item) => item.severity === "error");
  const warnings = compiled.diagnostics.filter((item) => item.severity === "warning");
  const pickedBlocks = files?.find((file) => file.path === pickedFile)?.blocks ?? [];

  return (
    <div className="ui-studio">
      <aside className="ui-studio-rail">
        <textarea
          className="ui-studio-instruction"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="描述这一块要让读者做什么"
          rows={6}
        />
        <div className="ui-studio-actions">
          <button type="button" className="admin-primary-button" disabled={busy || !configured} onClick={() => generate("create")}>{busy ? "正在生成…" : "生成"}</button>
          <button type="button" className="admin-secondary-button" disabled={busy || !configured || !text.trim()} onClick={() => generate("revise")}>修改</button>
        </div>
        <p className="ui-studio-meta">{configured ? `${modelName} · 这一小时还能生成 ${remaining} 次` : "模型未连接，可以手写源码并预览。"}</p>
        {usage ? <p className="ui-studio-meta">上次 {usage.usage.total_tokens} token，修复 {usage.rounds} 轮。</p> : null}
        {note ? <p className="ui-studio-note">{note}</p> : null}
        {message ? <p className={`ui-studio-message ui-studio-message-${message.tone}`} role="status">{message.text}</p> : null}

        <div className="ui-studio-starts">
          <button
            type="button"
            className="admin-quiet-button"
            onClick={() => {
              replaceText("");
              setInstruction("");
              setOrigin(null);
              setDataFiles({});
              setHistoryItems([]);
              setMessage(null);
              setNote(null);
              setStage("preview");
            }}
          >
            新建
          </button>
          <label>
            配方
            <select
              value=""
              onChange={(event) => {
                const recipe = parsedRecipes.find((item) => item.file === event.target.value);
                if (!recipe?.fence) return;
                setOrigin(null);
                setDataFiles({});
                replaceText(recipe.fence);
                setStage("preview");
                setMessage({ tone: "info", text: `已载入「${recipe.title.replace(/^配方：/, "")}」。` });
              }}
            >
              <option value="">从配方打开</option>
              {parsedRecipes.map((recipe) => <option key={recipe.file} value={recipe.file}>{recipe.title.replace(/^配方：/, "")}</option>)}
            </select>
          </label>
          <label>
            稿件
            <select value={pickedFile} onFocus={() => void loadFiles()} onChange={(event) => setPickedFile(event.target.value)}>
              <option value="">{files ? "从稿件打开" : "载入稿件"}</option>
              {(files ?? []).map((file) => <option key={file.path} value={file.path}>{file.title ?? file.path}{file.draft ? "（草稿）" : ""}</option>)}
            </select>
          </label>
          {pickedBlocks.length ? (
            <label>
              这一篇
              <select value="" onChange={(event) => void openBlock(pickedFile, Number(event.target.value))}>
                <option value="">选一块</option>
                {pickedBlocks.filter((block) => block.lang !== "widget").map((block) => (
                  <option key={block.startLine} value={block.startLine}>
                    {`${block.lang === "intent" ? "想法" : "ui"} · ${block.id ?? `第 ${block.startLine} 行`} · ${block.status}`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {historyItems.length ? (
          <div className="ui-studio-history">
            <h3>这次</h3>
            <ol>
              {historyItems.slice(-8).map((item, index) => (
                <li key={index}>
                  <button type="button" onClick={() => setInstruction(item.instruction)}>{item.instruction.slice(0, 42)}</button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </aside>

      <section className="ui-studio-stage">
        <div className="ui-studio-bar">
          <div className="ui-studio-switch" role="tablist" aria-label="工作台">
            <button type="button" role="tab" aria-selected={stage === "preview"} onClick={() => setStage("preview")}>预览</button>
            <button type="button" role="tab" aria-selected={stage === "source"} onClick={() => setStage("source")}>源码</button>
          </div>
          {stage === "preview" ? (
            <div className="ui-studio-switch" role="group" aria-label="预览设置">
              <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>浅色</button>
              <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>深色</button>
              <button type="button" aria-pressed={width === "desktop"} onClick={() => setWidth("desktop")}>桌面</button>
              <button type="button" aria-pressed={width === "mobile"} onClick={() => setWidth("mobile")}>手机</button>
              <button type="button" aria-pressed={view === "interactive"} onClick={() => setView("interactive")}>交互</button>
              <button type="button" aria-pressed={view === "static"} onClick={() => setView("static")}>静态</button>
            </div>
          ) : (
            <div className="ui-studio-actions">
              <button type="button" className="admin-secondary-button" disabled={!text.trim()} onClick={() => copy(stamped.trim(), "围栏")}>复制</button>
              {origin ? <button type="button" className="admin-primary-button" disabled={!text.trim() || errors.length > 0} onClick={() => copy(applyCommand, "写回命令")}>写回</button> : null}
            </div>
          )}
        </div>

        <div className="ui-studio-preview" data-theme={theme} data-width={width} hidden={stage !== "preview"}>
          {shown ? (
            view === "interactive" ? (
              <UiFigure payload={shown} />
            ) : (
              <figure className="garden-ui" lang="en-US">
                <div className="garden-ui-body garden-ui-static" dangerouslySetInnerHTML={{ __html: renderStatic(shown, "html") }} />
                <figcaption>{shown.caption}</figcaption>
              </figure>
            )
          ) : (
            <p className="ui-studio-empty">左边写你想让读者看到的东西，或从配方开始。</p>
          )}
        </div>

        <div className="ui-studio-source" hidden={stage !== "source"}>
          <div ref={editorRef} className="ui-studio-editor" />
          {errors.length || warnings.length ? (
            <ul className="ui-studio-diagnostics">
              {[...errors, ...warnings].map((item, index) => (
                <li key={index} data-severity={item.severity}>
                  <button type="button" onClick={() => jumpTo(item.line)}>
                    <code>{item.code}</code> 第 {item.line} 行 {item.message}
                  </button>
                </li>
              ))}
            </ul>
          ) : text.trim() ? <p className="ui-studio-meta">检查通过。</p> : null}
          {origin ? <p className="ui-studio-meta">写回会替换 {origin.post} 里的这一块。本地那一块改过时，命令会拒绝覆盖。</p> : null}
        </div>
      </section>
    </div>
  );
}
