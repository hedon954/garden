"use client";

import { useEffect, useRef } from "react";

export type GiscusConfig = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
};

function currentGiscusTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function GiscusComments({
  slug,
  config,
}: {
  slug: string;
  config: GiscusConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.replaceChildren();

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.repo = config.repo;
    script.dataset.repoId = config.repoId;
    script.dataset.category = config.category;
    script.dataset.categoryId = config.categoryId;
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
  }, [config, slug]);

  return <div className="giscus-container" ref={containerRef} />;
}
