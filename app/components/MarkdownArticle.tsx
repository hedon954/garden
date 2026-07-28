import {
  Children,
  isValidElement,
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
import { MermaidDiagram } from "./MermaidDiagram";

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

const calloutKinds: Record<string, { tone: "info" | "success" | "warning" | "danger"; title: string }> = {
  NOTE: { tone: "info", title: "提示" }, INFO: { tone: "info", title: "说明" },
  TIP: { tone: "success", title: "建议" }, SUCCESS: { tone: "success", title: "成功" },
  IMPORTANT: { tone: "warning", title: "重要" }, WARNING: { tone: "warning", title: "警告" },
  CAUTION: { tone: "danger", title: "注意" }, DANGER: { tone: "danger", title: "危险" }, FAILURE: { tone: "danger", title: "失败" },
};

export function normalizeCallouts(markdown: string) {
  let fence: string | null = null;
  return markdown.split("\n").flatMap((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (marker) { if (!fence) fence = marker[0]; else if (marker[0] === fence) fence = null; return [line]; }
    if (fence) return [line];
    const match = line.match(/^>\s*\[!([a-z]+)\]\s*(.*)$/iu);
    const callout = match ? calloutKinds[match[1].toUpperCase()] : undefined;
    if (!callout) return [line];
    const title = match?.[2].trim() || callout.title;
    return [`> <span class="garden-callout-marker garden-callout-marker--${callout.tone}" aria-hidden="true"></span>`, ">", `> **${title}**`];
  }).join("\n");
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
        {normalizeCallouts(content)}
      </ReactMarkdown>
    </div>
  );
}
