import matter from "gray-matter";
import Link from "next/link";
import { parse as parseYaml } from "yaml";
import { collectDataSources, transformUiContent } from "../../../../ui/core/transform.mjs";
import { AdminUiShell, isStaticExport, requireAdminPage, StaticAdminNotice } from "../../../components/AdminUiShell";
import { MarkdownArticle } from "../../../components/MarkdownArticle";
import { repositoryContentPath } from "../../../lib/repository-path.mjs";
import { readMarkdown, readText } from "../../../lib/ui-content";
import { ui } from "../../../lib/i18n";
import { rewriteArticleMedia } from "../../../../ui/garden/article-assets.mjs";
import { resolveSidecarPath } from "../../../../ui/core/fence.mjs";
import { STATIC_PLACEHOLDER, staticParams } from "../../../../ui/garden/static-params.mjs";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";
export const dynamicParams = process.env.STATIC_EXPORT !== "1";
export const metadata = { title: ui().adminTitlePreview, robots: { index: false, follow: false } };

/** Draft preview is served by the admin worker. The public static export has no paths here. */
export function generateStaticParams() {
  return staticParams([], { path: [STATIC_PLACEHOLDER] });
}

const isRelative = (value: string) => !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/iu.test(value);

/** Same-name-directory files go through the authenticated, sandboxed proxy. */
function proxyAssets(content: string, post: string) {
  const proxy = (relative: string) => `/api/admin/preview/asset?post=${encodeURIComponent(post)}&path=${encodeURIComponent(relative)}`;
  return rewriteArticleMedia(content, (url: string) => isRelative(url) ? proxy(url) : url);

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
  const dataFiles: Record<string, string | undefined> = {};
  for (const src of collectDataSources(parsed.content)) {
    const target = resolveSidecarPath(post, src);
    dataFiles[src] = target.path ? await readText(target.path).catch(() => undefined) : undefined;
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
        {typeof data.description === "string" && data.description.trim() ? <p className="ui-studio-meta">{data.description}</p> : null}
        <article className="article-body">
          <MarkdownArticle content={proxyAssets(content, post)} numbering={data.numbering === false ? false : undefined} />
        </article>
      </section>
    </AdminUiShell>
  );
}
