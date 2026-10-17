import { markdownPlugins } from "../lib/markdown-plugins";
import {
  Children,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import { MermaidDiagram } from "./MermaidDiagram";
import { MarkdownImage } from "./MarkdownImage";
import { CodeCopy } from "./garden/chrome";
import { CodeDiff } from "./garden/chrome";
import { GardenBlock } from "./garden/GardenBlock";

const BLOCK_LANGUAGES = ["language-mermaid"];
const isBlockLanguage = (className?: string) =>
  Boolean(className) && BLOCK_LANGUAGES.some((language) => className?.split(/\s+/u).includes(language));

function codeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { type?: string; value?: string; children?: unknown[] };
  if (typeof record.value === "string" && record.type === "text") return record.value;
  return (record.children ?? []).map((child) => codeText(child)).join("");
}

function CodeBlock({
  className,
  children,
  node,
  ...props
}: HTMLAttributes<HTMLElement> & { node?: unknown }) {
  if (className?.includes("language-mermaid")) {
    return <MermaidDiagram source={codeText(node) || String(children ?? "").trim()} />;
  }

  const codeProps = { ...props };

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

const headingText = (children: ReactNode) => {
  const parts: string[] = [];
  const walk = (node: ReactNode) => {
    if (typeof node === "string" || typeof node === "number") parts.push(String(node));
    else if (Array.isArray(node)) node.forEach(walk);
    else if (isValidElement<{ children?: React.ReactNode }>(node)) walk(node.props.children);
  };
  walk(children);
  return parts.join("");
};

export function MarkdownArticle({ content }: { content: string }) {
  const numbers = { h2: 0, h3: 0 };
  const gardenComponents = {
    "garden-block": (props: { dataPayload?: string; "data-payload"?: string }) => (
      <GardenBlock dataPayload={props.dataPayload ?? props["data-payload"]} />
    ),
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
    <div className="markdown-body prose">
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
            const external = Boolean(href && /^(https?:)?\/\//iu.test(href));
            return (
              <a
                href={href}
                {...props}
                {...(external
                  ? { className: "ext", target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
          img: MarkdownImage,
          table: ({ children, ...props }) => (
            <div className="table-wrap" role="region" aria-label="表格，可横向滚动" tabIndex={0}>
              <table {...props}>{children}</table>
            </div>
          ),
          h2: ({ children, ...props }) => {
            numbers.h2 += 1;
            numbers.h3 = 0;
            const numbered = /^\d/u.test(headingText(children).trim());
            return <h2 {...props}>{numbered ? null : <span className="sec-no">{numbers.h2}</span>}{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            numbers.h3 += 1;
            const numbered = /^\d/u.test(headingText(children).trim());
            const label = numbers.h2 ? `${numbers.h2}.${numbers.h3}` : String(numbers.h3);
            return <h3 {...props}>{numbered ? null : <span className="sec-no">{label}</span>}{children}</h3>;
          },
          code: CodeBlock,
          ...gardenComponents,
          pre: ({ children, ...props }) => {
            const child = Children.toArray(children)[0];
            const className = isValidElement<{ className?: string }>(child)
              ? child.props.className
              : undefined;
            const language = className?.match(/language-([\w-]+)/)?.[1];
            const preProps = { ...props };
            delete preProps.node;

            if (isBlockLanguage(className)) {
              return <>{children}</>;
            }

            return (
              <CodeCopy>
                <pre className="code" {...preProps} data-language={language?.toUpperCase()}>
                  {children}
                </pre>
              </CodeCopy>
            );
          },
        }}
      >
        {normalizeCallouts(content)}
      </ReactMarkdown>
    </div>
  );
}
