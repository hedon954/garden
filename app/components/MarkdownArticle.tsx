import { markdownPlugins } from "../lib/markdown-plugins";
import {
  Children,
  isValidElement,
  type HTMLAttributes,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import { MermaidDiagram } from "./MermaidDiagram";
import { ExternalEmbed } from "./ExternalEmbed";

function CodeBlock({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { node?: unknown }) {
  if (className?.includes("language-mermaid")) {
    return <MermaidDiagram source={String(children).trim()} />;
  }
  if (className?.includes("language-embed")) {
    return <ExternalEmbed source={String(children).trim()} />;
  }

  const codeProps = { ...props };
  delete codeProps.node;

  return (
    <code className={className} {...codeProps}>
      {children}
    </code>
  );
}

const calloutKinds: Record<string, { tone: "info" | "success" | "warning" | "danger" }> = {
  NOTE: { tone: "info" }, INFO: { tone: "info" },
  TIP: { tone: "success" }, SUCCESS: { tone: "success" },
  IMPORTANT: { tone: "warning" }, WARNING: { tone: "warning" },
  CAUTION: { tone: "danger" }, DANGER: { tone: "danger" }, FAILURE: { tone: "danger" },
};

const automaticCalloutLabels = new Set([
  "提示", "说明", "建议", "成功", "重要",
  "告警", "警告", "警示", "危险", "失败",
]);

export function normalizeCallouts(markdown: string) {
  let fence: string | null = null;
  let pendingLegacyLabel = false;
  return markdown.split("\n").flatMap((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (marker) { if (!fence) fence = marker[0]; else if (marker[0] === fence) fence = null; return [line]; }
    if (fence) return [line];
    const legacyMarker = line.match(/garden-callout-marker--(info|success|warning|danger)/u)?.[1];
    if (legacyMarker) {
      pendingLegacyLabel = true;
      return [line];
    }
    if (pendingLegacyLabel && /^>\s*$/u.test(line)) return [line];
    if (pendingLegacyLabel) {
      pendingLegacyLabel = false;
      const label = line.match(/^>\s*\*\*(.+?)\*\*\s*$/u)?.[1].trim();
      if (label && automaticCalloutLabels.has(label)) return [];
    }
    const match = line.match(/^>\s*\[!([a-z]+)\]\s*(.*)$/iu);
    const callout = match ? calloutKinds[match[1].toUpperCase()] : undefined;
    if (!callout) return [line];
    const title = match?.[2].trim();
    const lines = [`> <span class="garden-callout-marker garden-callout-marker--${callout.tone}" aria-hidden="true"></span>`, ">"];
    if (title && !automaticCalloutLabels.has(title)) lines.push(`> **${title}**`, ">");
    return lines;
  }).join("\n");
}

export function MarkdownArticle({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={markdownPlugins}
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

            if (className?.includes("language-mermaid") || className?.includes("language-embed")) {
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
