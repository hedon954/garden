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
