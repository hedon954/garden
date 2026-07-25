"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOut,
  Heart,
  LinkSimple,
  Quotes,
  Repeat,
} from "@phosphor-icons/react";

type WebmentionEntry = {
  author?: {
    name?: string;
    url?: string;
    photo?: string;
  };
  url?: string;
  published?: string;
  "wm-received"?: string;
  "wm-property"?: string;
  "wm-private"?: boolean;
  content?: {
    text?: string;
  };
};

type WebmentionFeed = {
  children?: WebmentionEntry[];
};

const reactionProperties = new Set(["like-of", "repost-of", "bookmark-of"]);

export function Webmentions({
  target,
  endpoint,
}: {
  target: string;
  endpoint?: string;
}) {
  const [entries, setEntries] = useState<WebmentionEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    const url = new URL(endpoint);
    url.searchParams.set("target", target);

    fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Webmentions unavailable");
        return response.json() as Promise<WebmentionFeed>;
      })
      .then((feed) => {
        setEntries(
          (feed.children ?? []).filter(
            (entry) => !entry["wm-private"] && entry.url,
          ),
        );
        setFailed(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [endpoint, target]);

  const reactions = useMemo(
    () =>
      entries.filter((entry) =>
        reactionProperties.has(entry["wm-property"] ?? ""),
      ),
    [entries],
  );
  const responses = useMemo(
    () =>
      entries.filter(
        (entry) => !reactionProperties.has(entry["wm-property"] ?? ""),
      ),
    [entries],
  );

  return (
    <section className="webmentions" aria-labelledby="webmentions-heading">
      <div className="webmention-title">
        <LinkSimple size={21} />
        <div>
          <h2 id="webmentions-heading">来自开放网络的回应</h2>
          <p>引用、喜欢、转发和站外回复会通过 Webmention 回到这里。</p>
        </div>
      </div>

      {!endpoint && (
        <div className="integration-notice">
          <Quotes size={20} weight="fill" />
          <p>接收与展示代码已经就绪，注册正式域名后即可开始收集回应。</p>
        </div>
      )}

      {endpoint && loading && (
        <p className="integration-status" role="status">
          正在读取开放网络回应…
        </p>
      )}

      {endpoint && failed && (
        <p className="integration-status" role="status">
          暂时无法读取回应，稍后会自动恢复。
        </p>
      )}

      {endpoint && !loading && !failed && entries.length === 0 && (
        <div className="integration-notice">
          <Quotes size={20} weight="fill" />
          <p>还没有站外回应。任何链接到这篇文章的网站都可以向它发送 Webmention。</p>
        </div>
      )}

      {reactions.length > 0 && (
        <div className="webmention-reactions">
          <span>
            <Heart size={16} weight="fill" />
            <Repeat size={16} />
            {reactions.length} 个喜欢、转发或收藏
          </span>
          <div className="webmention-facepile" aria-label="回应者">
            {reactions.slice(0, 16).map((entry, index) => (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={entry.author?.name ?? "查看站外回应"}
                key={`${entry.url}-${index}`}
              >
                {entry.author?.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.author.photo}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{(entry.author?.name ?? "?").slice(0, 1)}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {responses.length > 0 && (
        <div className="webmention-list">
          {responses.map((entry, index) => {
            const received = entry.published ?? entry["wm-received"];
            return (
              <article key={`${entry.url}-${index}`}>
                <header>
                  <strong>{entry.author?.name ?? "开放网络访客"}</strong>
                  {received && (
                    <time dateTime={received}>
                      {new Intl.DateTimeFormat("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date(received))}
                    </time>
                  )}
                </header>
                {entry.content?.text && <p>{entry.content.text}</p>}
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看原文
                  <ArrowSquareOut size={14} />
                </a>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
