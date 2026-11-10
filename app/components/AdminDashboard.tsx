"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Copy,
} from "@phosphor-icons/react";

type CatalogEntry = {
  kind: "post" | "column";
  column?: string;
  slug: string;
  path: string;
  title: string;
  section: string;
  pinned?: boolean;
};

type UiOverview = {
  modelName: string | null;
  remaining: number;
  engineVersion: string;
  catalogVersion: number;
};

type BlockCounts = { uncompiled: number; stale: number; error: number; ok: number };

function IntelligentUiCard({ ui }: { ui: UiOverview }) {
  const [counts, setCounts] = useState<BlockCounts | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/ui/blocks")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("blocks"))))
      .then((body: { counts: BlockCounts }) => {
        if (active) setCounts(body.counts);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="admin-panel admin-ui-card">
      <div className="admin-panel-heading">
        <h2>文章里的交互</h2>
        <Link href="/admin/ui">打开写作台</Link>
      </div>
      <p className="ui-studio-meta">
        {ui.modelName ? ui.modelName : "还没接上模型"}
        {" · "}
        {counts
          ? <Link href="/admin/ui/blocks">{`未编译 ${counts.uncompiled} · 过期 ${counts.stale} · 有错 ${counts.error} · 正常 ${counts.ok}`}</Link>
          : failed ? "没读到文章里的块" : "正在查看文章…"}
        {" · "}
        <Link href="/admin/ui/catalog">看组件</Link>
      </p>
    </section>
  );
}

export function AdminDashboard({
  userName,
  catalog,
  publicSiteUrl,
  contentWarning,
  ui,
}: {
  userName: string;
  catalog: CatalogEntry[];
  publicSiteUrl: string;
  contentWarning: string;
  ui: UiOverview;
}) {
  const [notice, setNotice] = useState("");
  const [distributionStatus, setDistributionStatus] = useState<Record<string, string>>({});
  const [catalogEntries, setCatalogEntries] = useState(catalog);
  const [pinningPath, setPinningPath] = useState<string | null>(null);
  async function distribute(entry: CatalogEntry, platform: "x" | "csdn" | "zhihu" | "juejin") {
    const key = `${entry.kind}:${entry.column ?? ""}:${entry.path}:${platform}`;
    setDistributionStatus((current) => ({ ...current, [key]: "正在发送…" }));
    try {
      const response = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: entry.kind, column: entry.column, path: entry.path, platform }),
      });
      const result = (await response.json()) as { job?: { status: string; externalUrl?: string | null; error?: string | null }; error?: string };
      if (!response.ok || !result.job) throw new Error(result.error ?? "分发失败。");
      const text = result.job.status === "published"
        ? "已发布"
        : result.job.status === "needs_credentials"
          ? `等待凭据：${result.job.error}`
          : result.job.error ?? "分发失败";
      setDistributionStatus((current) => ({ ...current, [key]: text }));
    } catch (error) {
      setDistributionStatus((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "分发失败。",
      }));
    }
  }

  async function copyPackage(entry: CatalogEntry) {
    const path = entry.kind === "post" ? `/blog/${entry.path}` : `/columns/${entry.column}/${entry.path}`;
    await navigator.clipboard.writeText(`${entry.title}\n${entry.section}\n${publicSiteUrl}${path}`);
    setNotice("标题、栏目与公开链接已复制，可直接粘贴到任意发布平台。"
    );
  }

  async function updatePinned(entry: CatalogEntry) {
    if (entry.kind !== "post") return;
    setNotice("");
    setPinningPath(entry.path);
    try {
      const response = await fetch("/api/admin/posts/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: entry.path, pinned: !entry.pinned }),
      });
      const result = (await response.json()) as { post?: { pinned: boolean }; error?: string };
      if (!response.ok || !result.post) throw new Error(result.error ?? "置顶状态更新失败。");
      setCatalogEntries((current) => current.map((item) =>
        item.kind === "post" && item.path === entry.path ? { ...item, pinned: result.post!.pinned } : item,
      ));
      setNotice(result.post.pinned
        ? "博文已置顶，GitHub Pages 将自动重新发布首页。"
        : "已取消博文置顶，GitHub Pages 将自动重新发布首页。",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "置顶状态更新失败。");
    } finally {
      setPinningPath(null);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin">Garden<span>后台</span></Link>
        <div>
          <span>{userName}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="admin-signout">退出</button>
          </form>
          <a href={publicSiteUrl} target="_blank" rel="noreferrer">
            查看公开博客 <ArrowSquareOut size={15} />
          </a>
        </div>
      </header>

      <section className="admin-hero">
        <h1>管理文章。</h1>
        <p>正文仍在编辑器里改。这里置顶文章、管理交互，以及发到其他网站。</p>
        <p className="admin-quiet-count">
          {catalogEntries.filter((entry) => entry.kind === "post").length} 篇博文
          {" · "}
          {catalogEntries.filter((entry) => entry.kind === "column").length} 篇专栏
        </p>
      </section>

      <IntelligentUiCard ui={ui} />

      {notice && <p className="admin-notice"><CheckCircle size={16} /> {notice}</p>}
      {contentWarning && <p className="admin-notice"><CheckCircle size={16} /> {contentWarning}</p>}

      <section className="admin-panel admin-distribution-panel">
        <div className="admin-panel-heading">
          <h2>置顶，或发到别处</h2>
        </div>
        <p className="admin-distribution-note">正文仍在仓库里改。这里可以置顶，发到 X，或同步到 CSDN、知乎、掘金。没配接口时，复制标题和链接。</p>
        <div className="admin-catalog">
          {catalogEntries.map((entry) => (
            <article key={`${entry.kind}-${entry.column ?? ""}-${entry.path}`}>
              <div><span>{entry.kind === "post" ? `博文${entry.pinned ? " · 已置顶" : ""}` : "专栏"} · {entry.section}</span><h3>{entry.title}</h3></div>
              <div className="admin-distribution-actions">
                {entry.kind === "post" && (
                  <button type="button" disabled={pinningPath === entry.path} onClick={() => updatePinned(entry)}>
                    {pinningPath === entry.path ? "正在更新" : entry.pinned ? "取消置顶" : "置顶首页"}
                  </button>
                )}
                <button type="button" onClick={() => copyPackage(entry)}><Copy size={14} /> 复制</button>
                {(["x", "csdn", "zhihu", "juejin"] as const).map((platform) => {
                  const key = `${entry.kind}:${entry.column ?? ""}:${entry.path}:${platform}`;
                  return <button type="button" key={platform} onClick={() => distribute(entry, platform)}>{platform === "x" ? "X" : platform === "csdn" ? "CSDN" : platform === "zhihu" ? "知乎" : "掘金"}{distributionStatus[key] && <small>{distributionStatus[key]}</small>}</button>;
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
