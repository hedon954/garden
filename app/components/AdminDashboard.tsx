"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowSquareOut,
  ArrowUpRight,
  CheckCircle,
  Copy,
  DotsThree,
  FileText,
  LinkSimple,
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
  title: string;
  topic: string;
};

type AttachmentDraft = Partial<MediaItem> & {
  type: MediaItem["type"];
  src: string;
};

const emptyAttachment = (): AttachmentDraft => ({ type: "image", src: "" });

function MediaFields({
  attachments,
  onChange,
}: {
  attachments: AttachmentDraft[];
  onChange: (next: AttachmentDraft[]) => void;
}) {
  return (
    <section className="admin-attachments">
      <div className="admin-field-heading">
        <div>
          <span>附件</span>
          <small>支持一条随想中混合多个图片、音频、视频与链接。</small>
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
            placeholder="https://…"
            aria-label={`附件 ${index + 1} 地址`}
          />
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

export function AdminDashboard({
  userName,
  initialThoughts,
  staticThoughtCount,
  catalog,
}: {
  userName: string;
  initialThoughts: ManagedThought[];
  staticThoughtCount: number;
  catalog: CatalogEntry[];
}) {
  const [thoughts, setThoughts] = useState(initialThoughts);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [distributionStatus, setDistributionStatus] = useState<Record<string, string>>({});
  const publishedCount = useMemo(
    () => thoughts.filter((thought) => thought.status === "published").length,
    [thoughts],
  );

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
      setNotice(status === "published" ? "随想已发布到公开博客。" : "草稿已保存，仅在后台可见。"
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
          ? { ...thought, status, date: status === "published" ? new Date().toISOString() : thought.date }
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
    const key = `${entry.kind}:${entry.slug}:${platform}`;
    setDistributionStatus((current) => ({ ...current, [key]: "正在发送…" }));
    try {
      const response = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: entry.kind, column: entry.column, slug: entry.slug, platform }),
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
    const path = entry.kind === "post" ? `/blog/${entry.slug}` : `/columns/${entry.column}/${entry.slug}`;
    await navigator.clipboard.writeText(`${entry.title}\n${entry.topic}\n${window.location.origin}${path}`);
    setNotice("标题、栏目与公开链接已复制，可直接粘贴到任意发布平台。"
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin">HEDON <span>STUDIO</span></Link>
        <div>
          <span>{userName}</span>
          <Link href="/" target="_blank">
            查看公开博客 <ArrowSquareOut size={15} />
          </Link>
        </div>
      </header>

      <section className="admin-hero">
        <div>
          <p className="eyebrow">CONTENT OPERATIONS</p>
          <h1>写作留在本地，发布与分发留在这里。</h1>
          <p>博文和专栏仍由 Typora 与 Git 管理；这里负责随想、发布状态和跨平台分发。</p>
        </div>
        <dl className="admin-metrics">
          <div><dt>公开随想</dt><dd>{publishedCount + staticThoughtCount}</dd></div>
          <div><dt>本地博文</dt><dd>{catalog.filter((entry) => entry.kind === "post").length}</dd></div>
          <div><dt>专栏篇目</dt><dd>{catalog.filter((entry) => entry.kind === "column").length}</dd></div>
        </dl>
      </section>

      {notice && <p className="admin-notice"><CheckCircle size={16} /> {notice}</p>}

      <section className="admin-grid">
        <div className="admin-panel admin-compose-panel">
          <div className="admin-panel-heading">
            <div><span>发布随想</span><h2>一条记录，可以有多种媒介。</h2></div>
            <PaperPlaneTilt size={22} />
          </div>
          <label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="给这条记录一个标题" /></label>
          <label>正文（Markdown）<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下此刻想留下的文字…" rows={8} /></label>
          <label>标签（用逗号分隔）<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="例如：产品, 夜晚, 摄影" /></label>
          <MediaFields attachments={attachments} onChange={setAttachments} />
          <div className="admin-actions">
            <button type="button" className="admin-secondary-button" disabled={isSaving} onClick={() => publishThought("draft")}>保存草稿</button>
            <button type="button" className="admin-primary-button" disabled={isSaving} onClick={() => publishThought("published")}><PaperPlaneTilt size={16} /> {isSaving ? "正在保存" : "发布到博客"}</button>
          </div>
        </div>

        <div className="admin-panel admin-thoughts-panel">
          <div className="admin-panel-heading">
            <div><span>后台随想</span><h2>已发布与草稿</h2></div>
            <DotsThree size={23} />
          </div>
          <div className="admin-thought-list">
            {thoughts.length === 0 ? <p className="admin-empty">还没有从后台创建的随想。</p> : thoughts.map((thought) => (
              <article key={thought.id}>
                <div><span className={`admin-status ${thought.status}`}>{thought.status === "published" ? "已发布" : "草稿"}</span><h3>{thought.title}</h3><p>{thought.content.slice(0, 76)}{thought.content.length > 76 ? "…" : ""}</p></div>
                <div className="admin-item-actions">
                  {thought.status === "published" && <Link href={`/thoughts/${thought.slug}`} target="_blank" aria-label={`查看 ${thought.title}`}><ArrowUpRight size={17} /></Link>}
                  <button type="button" onClick={() => updateThought(thought.id, thought.status === "published" ? "draft" : "published")}>{thought.status === "published" ? "撤回" : "发布"}</button>
                  <button type="button" aria-label={`删除 ${thought.title}`} onClick={() => deleteThought(thought.id)}><Trash size={16} /></button>
                </div>
              </article>
            ))}</div>
        </div>
      </section>

      <section className="admin-panel admin-distribution-panel">
        <div className="admin-panel-heading">
          <div><span>博文与专栏分发</span><h2>后台不改正文，只生成发布动作。</h2></div>
          <FileText size={22} />
        </div>
        <p className="admin-distribution-note"><LinkSimple size={16} /> CSDN、知乎、掘金采用你配置的同步服务；X 在填写用户访问令牌后可直接发布。没有配置时仍可一键复制分发包。</p>
        <div className="admin-catalog">
          {catalog.map((entry) => (
            <article key={`${entry.kind}-${entry.slug}`}>
              <div><span>{entry.kind === "post" ? "博文" : "专栏"} · {entry.topic}</span><h3>{entry.title}</h3></div>
              <div className="admin-distribution-actions">
                <button type="button" onClick={() => copyPackage(entry)}><Copy size={14} /> 复制</button>
                {(["x", "csdn", "zhihu", "juejin"] as const).map((platform) => {
                  const key = `${entry.kind}:${entry.slug}:${platform}`;
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
