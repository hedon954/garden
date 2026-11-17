"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { ArrowCounterClockwise, Desktop, DeviceMobile, Play } from "@phosphor-icons/react";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import { CodeCopy, CodeDiff } from "../../app/components/garden/chrome";
import { GardenBlock } from "../../app/components/garden/GardenBlock";
import { GardenFile } from "../../app/components/garden/GardenFile";
import { FaviconProvider, SourceMark } from "../../app/components/garden/patterns";
import { GardenPlayer } from "../../app/components/GardenPlayer";
import { MarkdownImage } from "../../app/components/MarkdownImage";
import { MermaidDiagram } from "../../app/components/MermaidDiagram";
import { UiLangProvider } from "../../app/components/UiLang";
import { markdownPlugins } from "../../app/lib/markdown-plugins";
import { rehypeGardenBlocks } from "../../app/lib/rehype-garden-blocks.mjs";
import { remarkA2 } from "../../app/lib/remark-a2.mjs";
import { readGardenPayload } from "../../app/lib/remark-garden.mjs";
import { remarkLinkCard } from "../../app/lib/remark-link-card.mjs";
import { parseCompose } from "../../ui/compose/index.mjs";
import { looksLikePlayCompose } from "../../ui/compose/dil.mjs";
import { mapNativeScenes } from "../../ui/compose/scenes.mjs";
import { transformUiContent } from "../../ui/core/transform.mjs";
import { cardDate } from "../../ui/garden/card-refresh.mjs";
import { codeLanguageLabel, fenceLanguage } from "../../ui/garden/code-language.mjs";
import {
  fileIcon,
  fileName,
  formatLabel,
  isRemoteSrc,
  maskHtmlComments,
  previewKind,
  readFileProps,
} from "../../ui/garden/file-block.mjs";
import { parseGardenInfo, scanFences } from "../../ui/garden/parse.mjs";
import { resolvePlayer } from "../../ui/garden/player.mjs";
import { rehypeKeepPunctuation } from "../../ui/garden/rehype-keep-punctuation.mjs";

export type PlaygroundPreset = {
  id: string;
  label: string;
  code: string;
};

export type PlaygroundSpec = {
  title?: string;
  description?: string;
  presets?: PlaygroundPreset[];
  code?: string;
  /** Pre-resolved sample files so editing `<file>` / `<files>` in the browser works with real drawers. */
  sampleFiles?: Record<string, { url: string; size: number; preview?: string; previewSrc?: string }>;
  /** Pre-exported SVG markup for `.excalidraw` sample paths in the browser. */
  excalidrawSvgs?: Record<string, string>;
};

export type ClientLinkAssets = {
  favicons: Record<string, string>;
  cards: Record<
    string,
    {
      title: string;
      description?: string;
      siteName?: string;
      author?: string;
      publishedTime?: string;
      image?: string;
    }
  >;
};

const noSubscribe = () => () => {};

function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./iu, "").toLowerCase();
  } catch {
    return "";
  }
}

const DEFAULT_SAMPLE_FILES: Record<string, { url: string; size: number; preview?: string; previewSrc?: string }> = {
  "./samples/sill-planner.html": {
    url: "/garden/media/garden-docs/assets/samples/sill-planner.html",
    size: 2480,
    preview: "html",
  },
  "../assets/samples/sill-planner.html": {
    url: "/garden/media/garden-docs/assets/samples/sill-planner.html",
    size: 2480,
    preview: "html",
  },
  "./samples/seed-guide.pdf": {
    url: "/garden/media/garden-docs/assets/samples/seed-guide.pdf",
    size: 16240,
    preview: "pdf",
  },
  "../assets/samples/seed-guide.pdf": {
    url: "/garden/media/garden-docs/assets/samples/seed-guide.pdf",
    size: 16240,
    preview: "pdf",
  },
  "./samples/checklist.md": {
    url: "/garden/media/garden-docs/assets/samples/checklist.md",
    size: 680,
    preview: "md",
    previewSrc: "/garden/media/garden-docs/assets/samples/checklist.md.preview.html",
  },
  "../assets/samples/checklist.md": {
    url: "/garden/media/garden-docs/assets/samples/checklist.md",
    size: 680,
    preview: "md",
    previewSrc: "/garden/media/garden-docs/assets/samples/checklist.md.preview.html",
  },
  "./samples/starter-kit.zip": {
    url: "/garden/media/garden-docs/assets/samples/starter-kit.zip",
    size: 1840,
    preview: "",
  },
  "../assets/samples/starter-kit.zip": {
    url: "/garden/media/garden-docs/assets/samples/starter-kit.zip",
    size: 1840,
    preview: "",
  },
};

function resolveClientComposeFiles(
  content: string,
  lang: "zh" | "en",
  sampleMap: Record<string, { url: string; size: number; preview?: string; previewSrc?: string }>,
): string {
  const fences = scanFences(maskHtmlComments(content)).filter(
    (fence) => parseGardenInfo(fence.info)?.name === "compose" && !fence.unclosed,
  );
  if (!fences.length) return content;
  const lines = content.split("\n");

  for (const fence of [...fences].reverse()) {
    const scenes: Array<ReturnType<typeof parseCompose>> = [];
    if (looksLikePlayCompose(fence.body)) {
      mapNativeScenes(fence.body, (source: string) => {
        scenes.push(parseCompose(source));
        return source;
      });
    } else {
      scenes.push(parseCompose(fence.body));
    }
    if (!scenes.every((s) => s.ok)) continue;
    type ComposeNode = { type?: string; name?: string; props: Record<string, unknown>; written: string; children?: ComposeNode[] };
    const fileNodes: ComposeNode[] = [];
    const walk = (nodes: ComposeNode[]) => {
      for (const node of nodes) {
        if (node.type === "feature" && node.name === "file") fileNodes.push(node);
        if (node.children) walk(node.children);
      }
    };
    walk(scenes.flatMap((s) => (s.doc?.nodes ?? []) as ComposeNode[]));
    if (!fileNodes.length) continue;

    let body = fence.body;
    for (const node of fileNodes) {
      if (node.props.resolved) continue;
      const read = readFileProps(node.props);
      if (read.errors.length) continue;
      const resolvedFiles = read.files.map((item: { src: string; title?: string; note?: string }) => {
        const src = item.src;
        const name = fileName(src);
        const baseEntry = {
          name,
          title: item.title || name,
          ...(item.note ? { note: item.note } : {}),
          format: formatLabel(src, lang),
          icon: fileIcon(src),
        };
        if (isRemoteSrc(src)) {
          return { ...baseEntry, url: src, remote: true, preview: "" };
        }
        const known = sampleMap[src];
        if (known) {
          return {
            ...baseEntry,
            url: known.url,
            size: known.size,
            remote: false,
            preview: known.preview ?? previewKind(src, { remote: false }),
            ...(known.previewSrc ? { previewSrc: known.previewSrc } : {}),
          };
        }
        const normalizedUrl = src.startsWith("/") ? src : `/garden/media/garden-docs/assets/samples/${name}`;
        return {
          ...baseEntry,
          url: normalizedUrl,
          remote: false,
          preview: previewKind(src, { remote: false }),
        };
      });
      const resolved = {
        layout: read.layout,
        ...(read.title ? { title: read.title } : {}),
        files: resolvedFiles,
        source: node.written,
      };
      const replacement = `<file resolved="${encodeURIComponent(JSON.stringify(resolved))}"/>`;
      body = body.replace(node.written, replacement);
    }
    const indent = " ".repeat(fence.indent);
    lines.splice(
      fence.line - 1,
      fence.endLine - fence.line + 1,
      `${indent}${fence.marker}${fence.info}`,
      body.trimEnd(),
      `${indent}${fence.marker}`,
    );
  }
  return lines.join("\n");
}

function replaceClientImagesAndExcalidraw(
  markdown: string,
  excalidrawSvgs: Record<string, string>,
): string {
  return markdown.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/gu,
    (full, altRaw: string, urlRaw: string, titleRaw?: string) => {
      const clean = urlRaw.trim();
      if (/\.excalidraw$/iu.test(clean)) {
        const domSvg = typeof document !== "undefined" ? document.querySelector("svg.excalidraw")?.outerHTML : undefined;
        const svg = excalidrawSvgs[clean] ?? Object.values(excalidrawSvgs)[0] ?? domSvg;
        if (!svg) return full;
        const caption = (titleRaw || altRaw || "").trim();
        const escapedCap = caption
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
        return `<figure class="fig"><div class="fig-card">${svg}</div>${escapedCap ? `<figcaption>${escapedCap}</figcaption>` : ""}</figure>`;
      }
      if (clean.startsWith("../assets/") || clean.startsWith("./samples/") || clean.startsWith("./assets/")) {
        const tail = clean.replace(/^(?:\.\.\/assets\/|\.\/assets\/)/u, "assets/").replace(/^\.\/samples\//u, "assets/samples/");
        const mapped = `/garden/media/garden-docs/${tail}`;
        return `![${altRaw}](${mapped}${titleRaw ? ` "${titleRaw}"` : ""})`;
      }
      return full;
    },
  ).replace(
    /<(audio|video|source)\b([^>]*?)\bsrc=["'](\.\.\/assets\/[^"']+)["']/giu,
    (_m, tag: string, before: string, rel: string) => {
      const mapped = `/garden/media/garden-docs/${rel.replace(/^\.\.\/assets\//u, "assets/")}`;
      return `<${tag}${before}src="${mapped}"`;
    },
  );
}

function headingText(children: ReactNode): string {
  const parts: string[] = [];
  const walk = (node: ReactNode) => {
    if (typeof node === "string" || typeof node === "number") parts.push(String(node));
    else if (Array.isArray(node)) node.forEach(walk);
    else if (isValidElement<{ children?: ReactNode }>(node)) walk(node.props.children);
  };
  walk(children);
  return parts.join("");
}

function PlaygroundLinkCard({
  href,
  text,
  standalone = true,
  linkAssets,
}: {
  href: string;
  text?: string;
  standalone?: boolean;
  linkAssets?: ClientLinkAssets;
}) {
  const meta = linkAssets?.cards?.[href];
  const host = hostOf(href) || href;
  const icon = linkAssets?.favicons?.[host];
  const title = meta?.title || text || href;
  const date = cardDate(meta?.publishedTime);
  const preview = standalone ? {} : { tabIndex: -1, "aria-hidden": true as const };
  return (
    <div className="link-cards" data-card-url={href}>
      <a className="link-card" href={href} target="_blank" rel="noopener noreferrer" {...preview}>
        <span className="lc-body">
          <span className="lc-site">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {icon ? <img className="fav" src={icon} alt="" width={14} height={14} loading="lazy" decoding="async" /> : null}
            <span className="lc-sitename" data-field="siteName">{meta?.siteName || host}</span>
            {meta?.siteName && meta.siteName.toLowerCase() !== host ? <span className="lc-host">{host}</span> : null}
            <span className="lc-arrow" aria-hidden="true" />
          </span>
          <span className="lc-title" data-field="title">{title}</span>
          {meta?.description ? <span className="lc-desc" data-field="description">{meta.description}</span> : null}
          {meta?.author || date ? (
            <span className="lc-meta">
              {meta?.author ? <span data-field="author">{meta.author}</span> : null}
              {date ? <time data-field="publishedTime" dateTime={meta?.publishedTime}>{date}</time> : null}
            </span>
          ) : null}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {meta?.image ? <img className="lc-thumb" src={meta.image} alt="" width={168} height={88} loading="lazy" decoding="async" /> : null}
      </a>
    </div>
  );
}

const PG_COPY = {
  zh: {
    defaultTitle: "交互演练场：修改代码并实时更新渲染",
    codePane: "Markdown / Compose 源码",
    previewPane: "真实渲染效果",
    updateBtn: "更新渲染",
    resetBtn: "重置",
    synced: "当前效果已与上方代码同步",
    dirty: "代码已修改，点击「更新渲染」或按 ⌘/Ctrl + Enter 查看新效果",
    web: "Web 端",
    mobile: "移动端",
    webSize: "桌面阅读列 · 740px",
    mobileSize: "手机视口 · 375px",
  },
  en: {
    defaultTitle: "Interactive Playground: Edit & Update Live Render",
    codePane: "Markdown / Compose Source",
    previewPane: "Live Rendered Output",
    updateBtn: "Update Render",
    resetBtn: "Reset",
    synced: "Output is in sync with source",
    dirty: "Modified — click Update Render or press ⌘/Ctrl + Enter",
    web: "Web",
    mobile: "Mobile",
    webSize: "Reading column · 740px",
    mobileSize: "Phone viewport · 375px",
  },
} as const;

export function DocLivePlayground({
  specJson,
  lang = "zh",
  linkAssets,
}: {
  specJson: string;
  lang?: "zh" | "en";
  linkAssets?: ClientLinkAssets;
}) {
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const spec = useMemo<PlaygroundSpec | null>(() => {
    try {
      return JSON.parse(specJson) as PlaygroundSpec;
    } catch {
      return null;
    }
  }, [specJson]);

  const presets = useMemo<PlaygroundPreset[]>(() => {
    if (!spec) return [];
    if (spec.presets?.length) return spec.presets;
    if (spec.code) return [{ id: "default", label: "默认示例", code: spec.code }];
    return [];
  }, [spec]);

  const [activePresetId, setActivePresetId] = useState<string>(() => presets[0]?.id ?? "default");
  const activePreset = presets.find((item) => item.id === activePresetId) ?? presets[0];
  const [draftCode, setDraftCode] = useState<string>(() => activePreset?.code ?? "");
  const [appliedCode, setAppliedCode] = useState<string>(() => activePreset?.code ?? "");
  const [previewDevice, setPreviewDevice] = useState<"web" | "mobile">("web");

  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const draftCodeRef = useRef(draftCode);
  draftCodeRef.current = draftCode;

  const applyUpdate = useCallback(() => {
    setAppliedCode(draftCodeRef.current);
  }, []);

  useEffect(() => {
    if (!mounted || !editorHostRef.current) return;
    const state = EditorState.create({
      doc: draftCodeRef.current,
      extensions: [
        lineNumbers(),
        history(),
        EditorView.lineWrapping,
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              setAppliedCode(draftCodeRef.current);
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const next = update.state.doc.toString();
            draftCodeRef.current = next;
            setDraftCode(next);
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: editorHostRef.current });
    editorViewRef.current = view;
    return () => {
      editorViewRef.current = null;
      view.destroy();
    };
  }, [mounted]);

  const setEditorContent = useCallback((next: string) => {
    draftCodeRef.current = next;
    setDraftCode(next);
    setAppliedCode(next);
    const view = editorViewRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
      });
    }
  }, []);

  const selectPreset = (preset: PlaygroundPreset) => {
    setActivePresetId(preset.id);
    setEditorContent(preset.code);
  };

  const resetCurrent = () => {
    if (activePreset) setEditorContent(activePreset.code);
  };

  const compiledContent = useMemo(() => {
    const sampleMap = { ...DEFAULT_SAMPLE_FILES, ...(spec?.sampleFiles ?? {}) };
    const withMedia = replaceClientImagesAndExcalidraw(appliedCode, spec?.excalidrawSvgs ?? {});
    const withFiles = resolveClientComposeFiles(withMedia, lang, sampleMap);
    const { content } = transformUiContent(withFiles, { mode: "preview", skipData: true });
    return content;
  }, [appliedCode, lang, spec?.excalidrawSvgs, spec?.sampleFiles]);

  if (!spec || !presets.length) return null;
  const copy = PG_COPY[lang];
  const isDirty = draftCode !== appliedCode;

  const customComponents = {
    "garden-linkcard": (props: Record<string, string | undefined>) => (
      <PlaygroundLinkCard
        href={props.dataUrl ?? props["data-url"] ?? ""}
        text={props.dataText ?? props["data-text"]}
        standalone={(props.dataStandalone ?? props["data-standalone"]) === "true"}
        linkAssets={linkAssets}
      />
    ),
    "garden-block": (props: { dataPayload?: string; "data-payload"?: string }) => {
      const payload = props.dataPayload ?? props["data-payload"];
      const block = readGardenPayload(payload);
      if (block?.name === "file" && !block.error) {
        return <GardenFile props={(block.props ?? {}) as Record<string, unknown>} lang={lang} />;
      }
      return <GardenBlock dataPayload={payload} />;
    },
    "garden-codediff": (props: {
      children?: ReactNode;
      dataDiff?: string;
      dataNew?: string;
      "data-diff"?: string;
      "data-new"?: string;
    }) => (
      <CodeDiff
        code={props.children}
        diff={decodeURIComponent(props.dataDiff ?? props["data-diff"] ?? "")}
        next={decodeURIComponent(props.dataNew ?? props["data-new"] ?? "")}
      />
    ),
  };

  return (
    <section className="doc-playground" aria-label={spec.title || copy.defaultTitle}>
      <header className="doc-pg-head">
        <div className="doc-pg-head-main">
          <h3>{spec.title || copy.defaultTitle}</h3>
          {spec.description ? <p>{spec.description}</p> : null}
        </div>
        {presets.length > 1 ? (
          <div className="doc-pg-presets" role="tablist" aria-label="示例预设">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="tab"
                aria-selected={preset.id === activePreset?.id}
                onClick={() => selectPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="doc-pg-split">
        <div className="doc-pg-col doc-pg-col--code">
          <div className="doc-pg-col-bar">
            <span className="doc-pg-col-label">{copy.codePane}</span>
            <div className="doc-pg-actions">
              <button
                type="button"
                className="doc-pg-btn doc-pg-btn--ghost"
                onClick={resetCurrent}
                disabled={draftCode === activePreset?.code}
              >
                <ArrowCounterClockwise size={13} aria-hidden="true" />
                <span>{copy.resetBtn}</span>
              </button>
              <button
                type="button"
                className={`doc-pg-btn doc-pg-btn--primary${isDirty ? " is-dirty" : ""}`}
                onClick={applyUpdate}
              >
                <Play size={13} weight="fill" aria-hidden="true" />
                <span>{copy.updateBtn}</span>
              </button>
            </div>
          </div>

          <div className="doc-pg-editor-wrap">
            {mounted ? (
              <div ref={editorHostRef} className="doc-pg-cm" />
            ) : (
              <pre className="doc-pg-ssr-code"><code>{draftCode}</code></pre>
            )}
          </div>

          <div className={`doc-pg-status${isDirty ? " is-dirty" : ""}`} role="status">
            {isDirty ? copy.dirty : copy.synced}
          </div>
        </div>

        <div className="doc-pg-col doc-pg-col--preview">
          <div className="doc-pg-col-bar">
            <span className="doc-pg-col-label">{copy.previewPane}</span>
            <div className="doc-pg-device-toggle" role="group" aria-label="预览视口">
              <button
                type="button"
                aria-pressed={previewDevice === "web"}
                onClick={() => setPreviewDevice("web")}
              >
                <Desktop size={13} aria-hidden="true" />
                <span>{copy.web}</span>
              </button>
              <button
                type="button"
                aria-pressed={previewDevice === "mobile"}
                onClick={() => setPreviewDevice("mobile")}
              >
                <DeviceMobile size={13} aria-hidden="true" />
                <span>{copy.mobile}</span>
              </button>
            </div>
          </div>

          <div className={`doc-pg-stage doc-pg-stage--${previewDevice}`}>
            <p className="doc-pg-size">{previewDevice === "mobile" ? copy.mobileSize : copy.webSize}</p>
            <div className={previewDevice === "mobile" ? "doc-device-viewport doc-device-viewport--mobile" : "doc-device-viewport doc-device-viewport--web"}>
              <UiLangProvider lang={lang}>
                <FaviconProvider favicons={linkAssets?.favicons}>
                  <div className="markdown-body prose doc-pg-prose">
                    <ReactMarkdown
                      remarkPlugins={[...markdownPlugins, remarkLinkCard, [remarkA2, { lang }]]}
                      rehypePlugins={[
                        rehypeRaw,
                        rehypeGardenBlocks,
                        rehypeKatex,
                        rehypeKeepPunctuation,
                        rehypeSlug,
                        rehypeHighlight,
                      ]}
                      components={{
                        p: ({ children, ...props }) => {
                          const domProps = { ...props };
                          Reflect.deleteProperty(domProps, "node");
                          const nodes = Children.toArray(children).filter((n) => !(typeof n === "string" && !n.trim()));
                          const only = nodes.length === 1 && isValidElement<{ href?: string; children?: ReactNode }>(nodes[0]) ? nodes[0] : null;
                          const href = only?.props.href;
                          const text = only ? headingText(only.props.children).trim() : "";
                          if (href && text === href && /^https?:\/\//iu.test(href)) {
                            if (resolvePlayer(href).ok) return <GardenPlayer href={href} />;
                            return <PlaygroundLinkCard href={href} linkAssets={linkAssets} />;
                          }
                          return <p {...domProps}>{children}</p>;
                        },
                        a: ({ href, children, ...props }) => {
                          const domProps = { ...props };
                          Reflect.deleteProperty(domProps, "node");
                          const external = Boolean(href && /^https?:\/\//iu.test(href));
                          const host = href ? hostOf(href) : "";
                          const fav = host ? linkAssets?.favicons?.[host] : undefined;
                          return (
                            <a
                              href={href}
                              {...domProps}
                              {...(external
                                ? {
                                    className: domProps.className ? `ext ${domProps.className}` : "ext",
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                  }
                                : {})}
                            >
                              {external && href && /\bg-src-chip\b/u.test(String(domProps.className ?? "")) ? (
                                <>
                                  <SourceMark href={href} />
                                  <span>{children}</span>
                                </>
                              ) : external && fav ? (
                                <>
                                  <span className="fav-keep">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img className="fav" src={fav} alt="" width={14} height={14} loading="lazy" decoding="async" aria-hidden="true" />
                                  </span>
                                  {children}
                                </>
                              ) : (
                                children
                              )}
                            </a>
                          );
                        },
                        img: (props) => <MarkdownImage {...props} />,
                        code: ({ className, children, ...props }: HTMLAttributes<HTMLElement> & { node?: unknown }) => {
                          const codeProps = { ...props };
                          Reflect.deleteProperty(codeProps, "node");
                          if (className?.includes("language-mermaid")) {
                            return <MermaidDiagram source={String(children ?? "").trim()} />;
                          }
                          return <code className={className} {...codeProps}>{children}</code>;
                        },
                        pre: ({ children, ...props }) => {
                          const child = Children.toArray(children)[0];
                          const className = isValidElement<{ className?: string }>(child) ? child.props.className : undefined;
                          if (className?.includes("language-mermaid")) return <>{children}</>;
                          const language = fenceLanguage(className);
                          const preProps = { ...props };
                          Reflect.deleteProperty(preProps, "node");
                          return (
                            <CodeCopy>
                              <pre className="code" {...preProps} data-language={codeLanguageLabel(language) || undefined}>
                                {children}
                              </pre>
                            </CodeCopy>
                          );
                        },
                        ...customComponents,
                      }}
                    >
                      {compiledContent}
                    </ReactMarkdown>
                  </div>
                </FaviconProvider>
              </UiLangProvider>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
