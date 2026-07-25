"use client";

import { useEffect, useRef } from "react";
import { ChatCircle, GithubLogo } from "@phosphor-icons/react";

const config = {
  repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
  repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
  category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
  categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
};

const configured = Object.values(config).every(Boolean);

function currentGiscusTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function Comments({ slug }: { slug: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!configured || !containerRef.current) return;
    const container = containerRef.current;
    container.replaceChildren();

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.repo = config.repo!;
    script.dataset.repoId = config.repoId!;
    script.dataset.category = config.category!;
    script.dataset.categoryId = config.categoryId!;
    script.dataset.mapping = "pathname";
    script.dataset.strict = "1";
    script.dataset.reactionsEnabled = "1";
    script.dataset.emitMetadata = "0";
    script.dataset.inputPosition = "bottom";
    script.dataset.theme = currentGiscusTheme();
    script.dataset.lang = "zh-CN";
    script.dataset.loading = "lazy";
    container.append(script);

    const observer = new MutationObserver(() => {
      const frame = container.querySelector<HTMLIFrameElement>(".giscus-frame");
      frame?.contentWindow?.postMessage(
        {
          giscus: {
            setConfig: { theme: currentGiscusTheme() },
          },
        },
        "https://giscus.app",
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      container.replaceChildren();
    };
  }, [slug]);

  return (
    <section className="comments" aria-labelledby={`comments-heading-${slug}`}>
      <div className="comments-heading">
        <ChatCircle size={23} />
        <div>
          <h2 id={`comments-heading-${slug}`}>评论</h2>
          <p>
            {configured
              ? "评论由 GitHub Discussions 保存和管理。"
              : "评论接入已准备好，补充 GitHub Discussions 配置后即可开放。"}
          </p>
        </div>
      </div>

      {configured ? (
        <div className="giscus-container" ref={containerRef} />
      ) : (
        <div className="integration-notice">
          <GithubLogo size={20} weight="fill" />
          <p>
            需要一个公开 GitHub 仓库，并为它启用 Discussions、安装 Giscus
            App、选择评论分类。
          </p>
        </div>
      )}
    </section>
  );
}
