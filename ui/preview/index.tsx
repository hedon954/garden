import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CATALOG_VERSION } from "../core/catalog.mjs";
import { compileUiBlock } from "../core/compile.mjs";
import { scanFences } from "../core/fence.mjs";
import {parseGardenBlock} from "../garden/parse.mjs";
import {GardenBlock} from "../../app/components/garden/GardenBlock";
import {UiLangProvider} from "../../app/components/UiLang";
import { renderStatic } from "../core/static.mjs";
import { collectDataSources } from "../core/transform.mjs";

import { CatalogPage, type RecipeSource } from "../react/CatalogPage";
import { RuntimeLangProvider, IntentCard, UiErrorCard, type Diagnostic } from "../react/index";

export type PreviewOptions = {
  theme?: "light" | "dark";
  lang?: "zh" | "en";
  mode?: "interactive" | "static";
  onCopyPrompt?:()=>void;
  /** Reads a path relative to the Markdown file, for Data files. */
  readFile?: (relativePath: string) => Promise<string | undefined> | string | undefined;
  /** Same-name-directory path as written, mapped to a URL the host can display. */
  resolveAsset?: (relativePath: string) => string;
  /** Keep clicks and keys on controls from reaching the editor, which would otherwise jump into the source. */
  isolateEvents?: boolean;
  /** File line of the opening fence, so errors cite the line numbers the editor shows. */
  fenceLine?: number;
};

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
  const sources = collectDataSources(`\`\`\`garden compose\n${body}\n\`\`\``);
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
  const block=parseGardenBlock("garden compose",body);
  const theme=options.theme??"light";
  if(loading)return <div className="garden-ui-preview" data-theme={theme}><p className="garden-ui-preview-note">正在读取数据文件…</p></div>;
  if(!block||block.error){
    if(block?.error?.code==="compose-uncompiled")return <div className="garden-ui-preview" data-theme={theme}><IntentCard text={body} onCopyPrompt={options.onCopyPrompt}/></div>;
    return <div className="garden-ui-preview" data-theme={theme}><UiErrorCard caption="Compose" diagnostics={[{code:block?.error?.code??"compose-invalid",message:block?.error?.message??"无效的 Compose",line:options.fenceLine??1,severity:"error"}]}/></div>;
  }
  let ready:Record<string,unknown>={...block};
  if(block.mode==="play"){
    const {payload,check}=compileUiBlock(block.uiSource??"",{readData:(src:string)=>files.data[src],skipData:!options.readFile,resolveAsset:options.resolveAsset??null,markdownPath:null});
    if(!payload)return <div className="garden-ui-preview" data-theme={theme}><UiErrorCard caption="Compose" diagnostics={check.diagnostics as Diagnostic[]}/></div>;
    if(options.mode==="static")return <div className="garden-ui-preview" data-theme={theme}><div className="markdown-body prose" dangerouslySetInnerHTML={{__html:renderStatic(payload,"html")}}/></div>;
    ready={...ready,payload};
  }
  return <div className="garden-ui-preview" data-theme={theme}><UiLangProvider lang={options.lang}><div className="markdown-body prose"><GardenBlock dataPayload={encodeURIComponent(JSON.stringify(ready))}/></div></UiLangProvider></div>;

}

function mount(element: HTMLElement, draw: (root: ReturnType<typeof createRoot>) => void) {
  const root = createRoot(element);
  draw(root);
  return root;
}

export function render(element: HTMLElement, source: string, options: PreviewOptions = {}) {
  let current = { source, options };
  const release = options.isolateEvents ? isolate(element) : null;
  const root = mount(element, (target) => target.render(<RuntimeLangProvider lang={current.options.lang??"zh"}><Preview source={current.source} options={current.options} /></RuntimeLangProvider>));
  return {
    update(nextSource: string, nextOptions: PreviewOptions = current.options) {
      current = { source: nextSource, options: nextOptions };
      root.render(<RuntimeLangProvider lang={current.options.lang??"zh"}><Preview source={current.source} options={current.options} /></RuntimeLangProvider>);
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
export { composeFence, STARTERS as starters } from "../core/starters.mjs";
