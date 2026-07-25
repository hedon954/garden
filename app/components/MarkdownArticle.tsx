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

const mermaidThemes = [
  { value: "default", label: "经典" },
  { value: "neutral", label: "中性" },
  { value: "forest", label: "森林" },
  { value: "dark", label: "深色" },
] as const;

type MermaidTheme = (typeof mermaidThemes)[number]["value"];

let mermaidRenderQueue: Promise<unknown> = Promise.resolve();

function renderMermaid(source: string, id: string, theme: MermaidTheme) {
  const task = mermaidRenderQueue.then(async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme,
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
  const [theme, setTheme] = useState<MermaidTheme>("neutral");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const draw = async () => {
      setError(false);
      try {
        const id = `mermaid-${reactId.replaceAll(":", "")}-${theme}`;
        const result = await renderMermaid(source, id, theme);
        if (active) setSvg(result.svg);
      } catch {
        if (active) setError(true);
      }
    };
    void draw();
    return () => {
      active = false;
    };
  }, [reactId, source, theme]);

  return (
    <figure
      className="mermaid-block language-mermaid"
      data-mermaid-theme={theme}
    >
      <figcaption className="mermaid-toolbar">
        <span>Mermaid 主题</span>
        <span className="mermaid-theme-picker" role="group" aria-label="选择 Mermaid 主题">
          {mermaidThemes.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={theme === item.value}
              onClick={() => setTheme(item.value)}
            >
              {item.label}
            </button>
          ))}
        </span>
      </figcaption>
      <div className="mermaid-canvas" aria-live="polite">
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
