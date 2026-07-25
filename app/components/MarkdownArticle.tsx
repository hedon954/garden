"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useState,
  type HTMLAttributes,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

let mermaidRenderQueue: Promise<unknown> = Promise.resolve();

function renderMermaid(source: string, id: string) {
  const task = mermaidRenderQueue.then(async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      fontFamily: "var(--font-mono)",
      securityLevel: "strict",
      suppressErrorRendering: true,
    });
    return mermaid.render(id, source);
  });
  mermaidRenderQueue = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

function MermaidDiagram({ source }: { source: string }) {
  const reactId = useId();
  const [view, setView] = useState<"render" | "code">("render");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const panelId = `mermaid-panel-${reactId.replaceAll(":", "")}`;

  useEffect(() => {
    let active = true;
    const draw = async () => {
      setError(false);
      try {
        const id = `mermaid-${reactId.replaceAll(":", "")}`;
        const result = await renderMermaid(source, id);
        if (active) setSvg(result.svg);
      } catch {
        if (active) setError(true);
      }
    };
    void draw();
    return () => {
      active = false;
    };
  }, [reactId, source]);

  return (
    <figure
      className="mermaid-block language-mermaid"
      data-mermaid-theme="neutral"
    >
      <figcaption className="mermaid-toolbar">
        <span>Mermaid</span>
        <span
          className="mermaid-view-switcher"
          role="tablist"
          aria-label="切换 Mermaid 显示方式"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "render"}
            aria-controls={panelId}
            onClick={() => setView("render")}
          >
            渲染
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "code"}
            aria-controls={panelId}
            onClick={() => setView("code")}
          >
            Code
          </button>
        </span>
      </figcaption>
      {view === "render" ? (
        <div
          className="mermaid-canvas"
          id={panelId}
          role="tabpanel"
          aria-live="polite"
        >
          {svg ? (
            <div
              className="mermaid-svg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : null}
          {!svg && !error ? (
            <span className="mermaid-loading">正在绘制图表…</span>
          ) : null}
          {error ? (
            <span className="mermaid-error">图表渲染失败，请检查语法。</span>
          ) : null}
        </div>
      ) : (
        <pre
          className="mermaid-code"
          id={panelId}
          role="tabpanel"
          data-language="MERMAID"
        >
          <code>{source}</code>
        </pre>
      )}
    </figure>
  );
}

function CodeBlock({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { node?: unknown }) {
  if (className?.includes("language-mermaid")) {
    return <MermaidDiagram source={String(children).trim()} />;
  }

  const codeProps = { ...props };
  delete codeProps.node;

  return (
    <code className={className} {...codeProps}>
      {children}
    </code>
  );
}

export function MarkdownArticle({ content }: { content: string }) {

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeKatex,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
          rehypeHighlight,
        ]}
        components={{
          a: ({ href, children, ...props }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...props}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
          img: ({ alt, ...props }) => (
            // Native images keep Typora-authored relative paths intact.
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" alt={alt ?? ""} {...props} />
          ),
          code: CodeBlock,
          pre: ({ children, ...props }) => {
            const child = Children.only(children);
            const className = isValidElement<{ className?: string }>(child)
              ? child.props.className
              : undefined;
            const language = className?.match(/language-([\w-]+)/)?.[1];
            const preProps = { ...props };
            delete preProps.node;

            if (className?.includes("language-mermaid")) {
              return <>{children}</>;
            }

            return (
              <pre {...preProps} data-language={language?.toUpperCase()}>
                {children}
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
