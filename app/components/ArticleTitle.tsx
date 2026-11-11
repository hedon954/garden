"use client";

import { useLayoutEffect, useRef } from "react";
import { splitTitle, titleLineScale } from "../../ui/garden/title.mjs";
import { mountArticleTitle } from "../../ui/garden/article-title-fit.mjs";
import fitRuntime from "../../ui/garden/feature-title-fit.mjs?raw";
import articleRuntime from "../../ui/garden/article-title-fit.mjs?raw";

// Preserve one authored runtime across SSR/browser builds; function.toString()
// would be changed independently by server and client optimizers.
const ARTICLE_TITLE_BOOT = `(()=>{${fitRuntime.replace(/^export /gm, "")}
${articleRuntime.replace(/^import\s+[^;]+;\s*/u, "").replace(/^export /gm, "")}
mountArticleTitle(document.currentScript.parentElement);})();`;

export function ArticleTitle({ title, className = "" }: { title: string; className?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const split = splitTitle(title);
  useLayoutEffect(() => mountArticleTitle(heading.current?.parentElement), [title]);
  if (!split.split) {
    return <h1 className={`p-name${className ? ` ${className}` : ""}`}>{title}</h1>;
  }
  const scale = titleLineScale(split.lines);
  return (
    <>
      <h1
        id="at"
        ref={heading}
        data-article-title=""
        className={`p-name h1-br${className ? ` ${className}` : ""}`}
        style={{ ["--l" as string]: scale }}
      >
        <span className="h1-line">{split.lines[0]}</span>
        <span className="vh">{split.separator}</span>
        <span className="h1-line">{split.lines[1]}</span>
      </h1>
      <style data-article-title-rules="">{""}</style>
      <script data-article-title-boot="" dangerouslySetInnerHTML={{ __html: ARTICLE_TITLE_BOOT }} />
    </>
  );
}
