import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CATALOG_VERSION, COMPONENT_NAMES } from "../core/catalog.mjs";
import { compileUiBlock } from "../core/compile.mjs";
import { scanFences, splitUiBody } from "../core/fence.mjs";
import { parseUiBody } from "../core/parse.mjs";
import { renderStatic } from "../core/static.mjs";
import { collectDataSources } from "../core/transform.mjs";
import { suggestComponent } from "../core/validate.mjs";
import { CatalogPage, type RecipeSource } from "../react/CatalogPage";
import { IntentCard, UiErrorCard, UiFigure, type Diagnostic, type UiPayload } from "../react/index";

export type PreviewOptions = {
  theme?: "light" | "dark";
  mode?: "interactive" | "static";
  /** Reads a path relative to the Markdown file, for Data files. */
  readFile?: (relativePath: string) => Promise<string | undefined> | string | undefined;
  /** Same-name-directory path as written, mapped to a URL the host can display. */
  resolveAsset?: (relativePath: string) => string;
  /** Keep clicks and keys on controls from reaching the editor, which would otherwise jump into the source. */
  isolateEvents?: boolean;
  /** File line of the opening fence, so errors cite the line numbers the editor shows. */
  fenceLine?: number;
};

type ParsedNode = { t: string; n?: string; c?: ParsedNode[] };

/** A name with no close catalog match is likely newer than this plugin rather than a typo. */
function hasNewerComponent(body: string) {
  const { bodyText, error } = splitUiBody(body);
  if (error) return false;
  const { root } = parseUiBody(bodyText) as { root: ParsedNode | null };
  const known = new Set<string>(COMPONENT_NAMES);
  const unknown: string[] = [];
  const walk = (node: ParsedNode) => {
    if (node.t === "el" && node.n && !known.has(node.n)) unknown.push(node.n);
    node.c?.forEach(walk);
  };
  if (root) walk(root);
  return unknown.some((name) => !suggestComponent(name));
}

const CONTROLS = "input, button, select, textarea, a, [role='button'], [role='slider'], [role='tab'], [role='checkbox'], [tabindex]";
const ISOLATED_EVENTS = ["pointerdown", "mousedown", "mouseup", "click", "keydown", "keyup", "keypress", "input", "beforeinput"];

function isolate(element: HTMLElement) {
  const stop = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(CONTROLS)) event.stopPropagation();
  };
  for (const type of ISOLATED_EVENTS) element.addEventListener(type, stop);
  return () => {
    for (const type of ISOLATED_EVENTS) element.removeEventListener(type, stop);
  };
}

/** Accepts either a whole fence or just its body, as editors hand over either. */
function bodyOf(source: string) {
  const trimmed = source.replace(/^\s+/u, "");
  if (/^(`{3,}|~{3,})/u.test(trimmed)) {
    const fence = scanFences(trimmed)[0];
    if (fence) return fence.body;
  }
  return source;
}

function Preview({ source, options }: { source: string; options: PreviewOptions }) {
  const body = bodyOf(source);
  const sources = collectDataSources(`\`\`\`ui\n${body}\n\`\`\``);
  const sourcesKey = sources.join("\n");
  const [files, setFiles] = useState<{ key: string; data: Record<string, string> }>({ key: "", data: {} });

  useEffect(() => {
    if (!sourcesKey || !options.readFile) return;
    let active = true;
    const read = options.readFile;
    Promise.all(sourcesKey.split("\n").map(async (src) => [src, await read(src)] as const)).then((entries) => {
      if (!active) return;
      const data: Record<string, string> = {};
      for (const [src, text] of entries) if (typeof text === "string") data[src] = text;
      setFiles({ key: sourcesKey, data });
    });
    return () => {
      active = false;
    };
  }, [sourcesKey, options.readFile]);

  const loading = Boolean(sourcesKey && options.readFile && files.key !== sourcesKey);
  const { payload, check } = compileUiBlock(body, {
    lineOffset: options.fenceLine ?? 1,
    readData: (src: string) => files.data[src],
    skipData: !options.readFile,
    markdownPath: null,
    resolveAsset: null,
  });
  const theme = options.theme ?? "light";
  if (loading) return <div className="garden-ui-preview" data-theme={theme}><p className="garden-ui-preview-note">正在读取数据文件…</p></div>;
  if (!payload) {
    const diagnostics = (check.diagnostics as Diagnostic[]).filter((item) => item.severity === "error");
    const newer = diagnostics.some((item) => item.code === "ui-component") && hasNewerComponent(body);
    const header = (check as { header?: { id?: unknown; caption?: unknown } | null }).header;
    return (
      <div className="garden-ui-preview" data-theme={theme}>
        {newer ? <p className="garden-ui-preview-note">块里有这个插件不认识的组件，预览需要更新 Garden 插件。</p> : null}
        <UiErrorCard
          caption={typeof header?.caption === "string" ? header.caption : ""}
          diagnostics={diagnostics}
          id={typeof header?.id === "string" ? header.id : null}
        />
      </div>
    );
  }
  const typed = payload as UiPayload;
  if (options.resolveAsset) {
    const rewrite = (node: UiPayload["root"]): UiPayload["root"] => {
      if (node.t === "el" && node.n === "Image" && node.p?.src?.k === "lit") {
        return { ...node, p: { ...node.p, src: { k: "lit", v: options.resolveAsset?.(String(node.p.src.v)) } } };
      }
      return node.c ? { ...node, c: node.c.map(rewrite) } : node;
    };
    typed.root = rewrite(typed.root);
  }
  const stale = (check.diagnostics as Diagnostic[]).some((item) => item.code === "ui-stale");
  return (
    <div className="garden-ui-preview" data-theme={theme}>
      {stale ? <p className="garden-ui-preview-note">原话改过了，还没重编译。</p> : null}
      {options.mode === "static" ? (
        <figure className="garden-ui" lang="en-US">
          <div className="garden-ui-body garden-ui-static" dangerouslySetInnerHTML={{ __html: renderStatic(typed, "html") }} />
          <figcaption>{typed.caption}</figcaption>
        </figure>
      ) : (
        <UiFigure payload={typed} />
      )}
    </div>
  );
}

function mount(element: HTMLElement, draw: (root: ReturnType<typeof createRoot>) => void) {
  const root = createRoot(element);
  draw(root);
  return root;
}

export function render(element: HTMLElement, source: string, options: PreviewOptions = {}) {
  let current = { source, options };
  const release = options.isolateEvents ? isolate(element) : null;
  const root = mount(element, (target) => target.render(<Preview source={current.source} options={current.options} />));
  return {
    update(nextSource: string, nextOptions: PreviewOptions = current.options) {
      current = { source: nextSource, options: nextOptions };
      root.render(<Preview source={current.source} options={current.options} />);
    },
    destroy() {
      release?.();
      root.unmount();
    },
  };
}

type IntentOptions = { id?: string | null; theme?: "light" | "dark"; onCopyPrompt?: () => void; isolateEvents?: boolean };

export function renderIntent(element: HTMLElement, text: string, options: IntentOptions = {}) {
  const release = options.isolateEvents ? isolate(element) : null;
  const draw = (nextText: string, next: IntentOptions) => (
    <div className="garden-ui-preview" data-theme={next.theme ?? "light"}>
      <IntentCard text={bodyOf(nextText).trim()} id={next.id} onCopyPrompt={next.onCopyPrompt} />
    </div>
  );
  let current = options;
  const root = mount(element, (target) => target.render(draw(text, current)));
  return {
    update(nextText: string, nextOptions: IntentOptions = current) {
      current = nextOptions;
      root.render(draw(nextText, current));
    },
    destroy() {
      release?.();
      root.unmount();
    },
  };
}

export function renderCatalog(element: HTMLElement, options: { recipes?: RecipeSource[]; theme?: "light" | "dark"; onStart?: (fence: string) => void } = {}) {
  if (options.theme) element.setAttribute("data-theme", options.theme);
  const root = mount(element, (target) => target.render(<CatalogPage recipes={options.recipes ?? []} onStart={options.onStart} />));
  return { destroy: () => root.unmount() };
}

export const catalogVersion = CATALOG_VERSION;
export { intentFence, STARTERS as starters } from "../core/starters.mjs";
