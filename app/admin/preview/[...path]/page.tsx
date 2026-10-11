import matter from "gray-matter";
import Link from "next/link";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { scanFences } from "../../../../ui/core/fence.mjs";
import { collectDataSources, transformUiContent } from "../../../../ui/core/transform.mjs";
import { AdminUiShell, isStaticExport, requireAdminPage, StaticAdminNotice } from "../../../components/AdminUiShell";
import { MarkdownArticle } from "../../../components/MarkdownArticle";
import { repositoryContentPath } from "../../../lib/repository-path.mjs";
import { readMarkdown, readText } from "../../../lib/ui-content";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";
export const metadata = { title: "草稿预览", robots: { index: false, follow: false } };

const isRelative = (value: string) => !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/iu.test(value);

/** Same-name-directory files go through the authenticated, sandboxed proxy. */
function proxyAssets(content: string, post: string) {
  const proxy = (relative: string) => `/api/admin/preview/asset?post=${encodeURIComponent(post)}&path=${encodeURIComponent(relative)}`;
  let output = content.replace(/(!\[[^\]]*\]\()<?([^)\s>]+)>?/gu, (match, prefix: string, src: string) =>
    isRelative(src) ? `${prefix}${proxy(src)}` : match,
  );
  for (const fence of [...scanFences(output)].reverse()) {
    if (fence.lang !== "widget") continue;
    try {
      const data = parseYaml(fence.body) as Record<string, unknown> | null;
      if (!data || typeof data.src !== "string" || !isRelative(data.src)) continue;
      const next = `${fence.marker}widget\n${stringifyYaml({ ...data, src: proxy(data.src) }).trimEnd()}\n${fence.marker}`;
      output = `${output.slice(0, fence.start)}${next}${output.slice(fence.end)}`;
    } catch {
      continue;
    }
  }
  return output;
}

export default async function DraftPreviewPage({ params }: { params: Promise<{ path: string[] }> }) {
  if (isStaticExport()) return <StaticAdminNotice />;
  const user = await requireAdminPage();
  const { path: segments } = await params;
  let post: string;
  try {
    post = repositoryContentPath(`${segments.map((segment) => decodeURIComponent(segment)).join("/")}.md`);
  } catch {
    return (
      <AdminUiShell active="" userName={`@${user.login}`}>
        <section className="admin-panel"><p>稿件路径不合法。</p></section>
      </AdminUiShell>
    );
  }
  const file = await readMarkdown(post).catch(() => null);
  if (!file) {
    return (
      <AdminUiShell active="" userName={`@${user.login}`}>
        <section className="admin-panel"><p>找不到 {post}。</p></section>
      </AdminUiShell>
    );
  }
  const parsed = matter(file.source, { engines: { yaml: { parse: (input: string) => parseYaml(input) ?? {} } } });
  const data = parsed.data as Record<string, unknown>;
  const directory = post.slice(0, post.lastIndexOf("/"));
  const dataFiles: Record<string, string | undefined> = {};
  for (const src of collectDataSources(parsed.content)) {
    const target = `${directory}/${src.replace(/^\.\//u, "")}`;
    dataFiles[src] = await readText(target).catch(() => undefined);
  }
  const { content } = transformUiContent(parsed.content.trim(), {
    mode: "preview",
    markdownPath: post,
    readData: (src: string) => dataFiles[src],
    resolveAsset: (_sidecarPath: string, written: string) =>
      `/api/admin/preview/asset?post=${encodeURIComponent(post)}&path=${encodeURIComponent(written)}`,
  });
  const draft = data.draft === true;
  return (
    <AdminUiShell active="" userName={`@${user.login}`}>
      <section className="admin-panel ui-admin-preview">
        <p className="ui-studio-meta">
          草稿预览 · {post}{draft ? " · 草稿" : ""} · <Link href="/admin/ui/blocks">回到交互块</Link>
        </p>
        <h1 className="ui-admin-preview-title">{typeof data.title === "string" ? data.title : post}</h1>
        {typeof data.description === "string" ? <p className="ui-studio-meta">{data.description}</p> : null}
        <article className="article-body">
          <MarkdownArticle content={proxyAssets(content, post)} />
        </article>
      </section>
    </AdminUiShell>
  );
}
