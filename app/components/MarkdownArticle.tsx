"use client";

import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

export function MarkdownArticle({ content }: { content: string }) {
  useEffect(() => {
    let active = true;
    const renderDiagrams = async () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(".markdown-body .language-mermaid"),
      );
      if (!nodes.length || !active) return;
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.dataset.theme === "dark" ? "dark" : "neutral",
        fontFamily: "var(--font-mono)",
        securityLevel: "strict",
      });
      nodes.forEach((node) => {
        const parent = node.parentElement;
        if (!parent) return;
        const diagram = document.createElement("div");
        diagram.className = "mermaid";
        diagram.textContent = node.textContent;
        parent.replaceWith(diagram);
      });
      await mermaid.run({ querySelector: ".markdown-body .mermaid" });
    };
    void renderDiagrams();
    return () => {
      active = false;
    };
  }, [content]);

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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
