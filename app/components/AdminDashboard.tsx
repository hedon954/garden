"use client";

import Link from "next/link";
import { formatAuthorDate } from "../../scripts/site-date.mjs";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowSquareOut,
  ArrowUpRight,
  CheckCircle,
  Copy,
  PaperPlaneTilt,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { ContentEntry, MediaItem } from "../lib/content";

type ManagedThought = ContentEntry & {
  id: string;
  status: "draft" | "published";
};

type CatalogEntry = {
  kind: "post" | "column";
  column?: string;
  slug: string;
  path: string;
  title: string;
  section: string;
  pinned?: boolean;
};

type AttachmentDraft = Partial<MediaItem> & {
  type: MediaItem["type"];
  src: string;
};

const emptyAttachment = (): AttachmentDraft => ({ type: "image", src: "" });

function MediaFields({
  attachments,
  onChange,
  onUpload,
  uploading,
}: {
  attachments: AttachmentDraft[];
  onChange: (next: AttachmentDraft[]) => void;
  onUpload: (index: number, file: File) => void;
  uploading: boolean;
}) {
  return (
    <section className="admin-attachments">
      <div className="admin-field-heading">
        <div>
          <span>附件</span>
          <small>一条随想里可以混放图片、音频、视频和链接。</small>
        </div>
        <button type="button" className="admin-quiet-button" onClick={() => onChange([...attachments, emptyAttachment()])}>
          <Plus size={14} /> 添加附件
        </button>
      </div>
      {attachments.map((item, index) => (
        <div className="admin-attachment-row" key={index}>
          <select
            aria-label={`附件 ${index + 1} 类型`}
            value={item.type}
            onChange={(event) => {
              const next = [...attachments];
              next[index] = { ...next[index], type: event.target.value as MediaItem["type"] };
              onChange(next);
            }}
          >
            <option value="image">图片</option>
            <option value="audio">音频</option>
            <option value="video">视频</option>
            <option value="link">链接</option>
          </select>
          <input
            value={item.src}
            onChange={(event) => {
              const next = [...attachments];
              next[index] = { ...next[index], src: event.target.value };
              onChange(next);
            }}
            placeholder={item.type === "link" ? "https://…" : "https://… 或上传到 OSS"}
            aria-label={`附件 ${index + 1} 地址`}
          />
          {item.type !== "link" && (
            <input
              type="file"
              accept={item.type === "image" ? "image/*" : item.type === "audio" ? "audio/*" : "video/*"}
              aria-label={`上传附件 ${index + 1}`}
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(index, file);
                event.currentTarget.value = "";
              }}
            />
          )}
          <input
            value={item.title ?? ""}
            onChange={(event) => {
              const next = [...attachments];
              next[index] = { ...next[index], title: event.target.value };
              onChange(next);
            }}
            placeholder="标题 / 说明（可选）"
            aria-label={`附件 ${index + 1} 标题`}
          />
          <button
            type="button"
            className="admin-icon-button"
            aria-label={`删除附件 ${index + 1}`}
            onClick={() => onChange(attachments.filter((_, attachmentIndex) => attachmentIndex !== index))}
          >
            <Trash size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}

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
  initialThoughts,
  staticThoughtCount,
  catalog,
  publicSiteUrl,
  contentWarning,
  ui,
}: {
  userName: string;
  initialThoughts: ManagedThought[];
  staticThoughtCount: number;
  catalog: CatalogEntry[];
  publicSiteUrl: string;
  contentWarning: string;
  ui: UiOverview;
}) {
  const [thoughts, setThoughts] = useState(initialThoughts);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [distributionStatus, setDistributionStatus] = useState<Record<string, string>>({});
  const [catalogEntries, setCatalogEntries] = useState(catalog);
  const [pinningPath, setPinningPath] = useState<string | null>(null);
  const publishedCount = useMemo(
    () => thoughts.filter((thought) => thought.status === "published").length,
    [thoughts],
  );

  async function uploadMedia(index: number, file: File) {
    setNotice("");
    setUploadingCount((count) => count + 1);
    try {
      const policyResponse = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
      });
      const policy = (await policyResponse.json()) as {
        endpoint?: string; key?: string; policy?: string; signature?: string; accessKeyId?: string; publicUrl?: string; error?: string;
      };
      if (!policyResponse.ok || !policy.endpoint || !policy.key || !policy.policy || !policy.signature || !policy.accessKeyId || !policy.publicUrl) {
        throw new Error(policy.error ?? "无法获取 OSS 上传许可。");
      }
      const form = new FormData();
      form.set("key", policy.key);
      form.set("OSSAccessKeyId", policy.accessKeyId);
      form.set("policy", policy.policy);
      form.set("Signature", policy.signature);
      form.set("success_action_status", "201");
      form.set("Content-Type", file.type);
      form.set("file", file);
      const uploadResponse = await fetch(policy.endpoint, { method: "POST", body: form });
      if (!uploadResponse.ok) throw new Error("OSS 未接受附件上传，请检查 Bucket CORS 和写入策略。");
      setAttachments((current) => current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, src: policy.publicUrl!, mime: file.type } : item,
      ));
      setNotice("附件已上传到阿里云 OSS；发布随想后会使用该公开媒体地址。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "上传失败，请稍后重试。");
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1));
    }
  }

  async function publishThought(status: "draft" | "published") {
    setNotice("");
    setIsSaving(true);
    const media = attachments.filter((item) => item.src.trim()).map((item) => ({
      ...item,
      src: item.src.trim(),
      ...(item.title?.trim() ? { title: item.title.trim() } : {}),
    }));
    try {
      const response = await fetch("/api/admin/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          media,
          status,
        }),
      });
      const result = (await response.json()) as { thought?: ManagedThought; error?: string };
      if (!response.ok || !result.thought) throw new Error(result.error ?? "保存失败。");
      setThoughts((current) => [result.thought!, ...current]);
      setTitle("");
      setContent("");
      setTags("");
      setAttachments([]);
      setNotice(status === "published" ? "随想已提交到 GitHub，Pages 将自动重新发布。" : "草稿已提交到 GitHub，仅后台可见。"
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateThought(id: string, status: "draft" | "published") {
    const response = await fetch(`/api/admin/thoughts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setNotice("状态更新失败，请稍后重试。");
      return;
    }
    setThoughts((current) =>
      current.map((thought) =>
        thought.id === id
          ? { ...thought, status, date: status === "published" ? formatAuthorDate() : thought.date }
          : thought,
      ),
    );
  }

  async function deleteThought(id: string) {
    if (!window.confirm("确定删除这条后台随想吗？此操作无法恢复。")) return;
    const response = await fetch(`/api/admin/thoughts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setNotice("删除失败，请稍后重试。");
      return;
    }
    setThoughts((current) => current.filter((thought) => thought.id !== id));
  }

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
        <h1>写一条随想。</h1>
        <p>长文仍在编辑器里改。这里写随想、上传附件、置顶，以及发到其他网站。</p>
        <p className="admin-quiet-count">
          {publishedCount + staticThoughtCount} 条公开随想
          {" · "}
          {catalogEntries.filter((entry) => entry.kind === "post").length} 篇博文
          {" · "}
          {catalogEntries.filter((entry) => entry.kind === "column").length} 篇专栏
        </p>
      </section>

      <IntelligentUiCard ui={ui} />

      {notice && <p className="admin-notice"><CheckCircle size={16} /> {notice}</p>}
      {contentWarning && <p className="admin-notice"><CheckCircle size={16} /> {contentWarning}</p>}

      <section className="admin-grid">
        <div className="admin-panel admin-compose-panel">
          <div className="admin-panel-heading">
            <h2>写一条</h2>
          </div>
          <label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="标题" /></label>
          <label>正文<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下来。可以用 Markdown。" rows={8} /></label>
          <label>标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="用逗号分开，例如：夜晚, 散步" /></label>
          <MediaFields attachments={attachments} onChange={setAttachments} onUpload={uploadMedia} uploading={uploadingCount > 0} />
          <div className="admin-actions">
            <button type="button" className="admin-secondary-button" disabled={isSaving || uploadingCount > 0} onClick={() => publishThought("draft")}>保存草稿</button>
            <button type="button" className="admin-primary-button" disabled={isSaving || uploadingCount > 0} onClick={() => publishThought("published")}><PaperPlaneTilt size={16} /> {uploadingCount > 0 ? "正在上传附件" : isSaving ? "正在保存" : "发布到博客"}</button>
          </div>
        </div>

        <div className="admin-panel admin-thoughts-panel">
          <div className="admin-panel-heading">
            <h2>草稿和已发布</h2>
          </div>
          <div className="admin-thought-list">
            {thoughts.length === 0 ? <p className="admin-empty">还没有在这里写过随想。</p> : thoughts.map((thought) => (
              <article key={thought.id}>
                <div><span className={`admin-status ${thought.status}`}>{thought.status === "published" ? "已发布" : "草稿"}</span><h3>{thought.title}</h3><p>{thought.content.slice(0, 76)}{thought.content.length > 76 ? "…" : ""}</p></div>
                <div className="admin-item-actions">
                  {thought.status === "published" && <a href={`${publicSiteUrl}/thoughts/${thought.slug}`} target="_blank" rel="noreferrer" aria-label={`查看 ${thought.title}`}><ArrowUpRight size={17} /></a>}
                  <button type="button" onClick={() => updateThought(thought.id, thought.status === "published" ? "draft" : "published")}>{thought.status === "published" ? "撤回" : "发布"}</button>
                  <button type="button" aria-label={`删除 ${thought.title}`} onClick={() => deleteThought(thought.id)}><Trash size={16} /></button>
                </div>
              </article>
            ))}</div>
        </div>
      </section>

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
