import Link from "next/link";
import { ArrowSquareOut, GithubLogo } from "@phosphor-icons/react/ssr";
import { AdminDashboard } from "../components/AdminDashboard";
import { getAdminUser, isGitHubLoginAvailable } from "../lib/admin-auth";
import { columns, posts, thoughts } from "../lib/content";
import { isContentRepositoryConfigured, listRepositoryThoughts } from "../lib/github-content";
import { getSiteUrl } from "../lib/site";
import { siteConfig } from "../site.config";
import { modelConfig, remainingDrafts } from "../lib/ui-model";
import { CATALOG_VERSION } from "../../ui/core/catalog.mjs";
import packageJson from "../../package.json";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

export const metadata = {
  title: "内容管理",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; account?: string }>;
}) {
  if (process.env.STATIC_EXPORT === "1") {
    const adminUrl = process.env.ADMIN_URL;
    return (
      <main className="admin-access-page">
        <div className="admin-access-card">
          <h1>后台在另一个地址。</h1>
          <p>这个页面是公开博客。写随想、上传和转发，去后台。</p>
          <div className="admin-access-actions">
            {adminUrl ? (
              <a className="admin-github-login" href={adminUrl}>
                打开后台 <ArrowSquareOut size={15} />
              </a>
            ) : (
              <p>还没有填写后台地址。</p>
            )}
            <Link href="/">返回公开博客</Link>
          </div>
        </div>
      </main>
    );
  }

  const [user, query, publicSiteUrl] = await Promise.all([getAdminUser(), searchParams, getSiteUrl()]);
  if (!user) {
    const oauthReady = isGitHubLoginAvailable();
    return (
      <main className="admin-access-page">
        <div className="admin-access-card">
          <h1>登录后台</h1>
          <p>
            {query.auth === "denied"
              ? `@${query.account ?? "这个账号"} 不在允许名单里。`
              : oauthReady
                ? `用 GitHub 登录。只有 ${siteConfig.name} 允许的账号能进来。`
                : process.env.GARDEN_DEV === "1"
                  ? "这台机器还没登录 GitHub。在终端运行 gh auth login，然后重新启动。"
                  : "还没配好 GitHub 登录。先填后台的环境变量。"}
          </p>
          <div className="admin-access-actions">
            {oauthReady && (
              <Link className="admin-github-login" href="/api/auth/github">
                <GithubLogo size={18} weight="fill" /> 用 GitHub 登录
              </Link>
            )}
            <Link href="/">
              返回公开博客 <ArrowSquareOut size={15} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let initialThoughts: Awaited<ReturnType<typeof listRepositoryThoughts>> = [];
  let contentWarning = "";
  if (!isContentRepositoryConfigured()) {
    contentWarning = "尚未配置内容仓库写入权限；请设置 CONTENT_REPOSITORY 和 CONTENT_GITHUB_TOKEN。";
  } else {
    try {
      initialThoughts = await listRepositoryThoughts();
    } catch (error) {
      contentWarning = error instanceof Error ? error.message : "无法读取 GitHub 内容仓库。";
    }
  }
  const catalog = [
    ...posts.map((post) => ({
      kind: "post" as const,
      slug: post.slug,
      path: post.path,
      title: post.title,
      section: "文章",
      pinned: Boolean(post.pinned),
    })),
    ...columns.map((entry) => ({
      kind: "column" as const,
      column: entry.column,
      slug: entry.slug,
      path: entry.path,
      title: entry.title,
      section: entry.columnTitle ?? "专栏",
    })),
  ];

  return (
    <AdminDashboard
      userName={`@${user.login}`}
      initialThoughts={initialThoughts}
      staticThoughtCount={thoughts.length}
      catalog={catalog}
      publicSiteUrl={publicSiteUrl}
      contentWarning={contentWarning}
      ui={{
        modelName: modelConfig()?.model ?? null,
        remaining: remainingDrafts(user.login),
        engineVersion: packageJson.version,
        catalogVersion: CATALOG_VERSION,
      }}
    />
  );
}
