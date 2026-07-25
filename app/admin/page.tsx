import Link from "next/link";
import { ArrowSquareOut, GithubLogo, LockKey } from "@phosphor-icons/react/ssr";
import { AdminDashboard } from "../components/AdminDashboard";
import { getAdminUser, isGitHubOAuthConfigured } from "../lib/admin-auth";
import { columns, posts, thoughts } from "../lib/content";
import { toPublicThought, listManagedThoughts } from "../lib/managed-thoughts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "内容管理",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; account?: string }>;
}) {
  const [user, query] = await Promise.all([getAdminUser(), searchParams]);
  if (!user) {
    const oauthReady = isGitHubOAuthConfigured();
    return (
      <main className="admin-access-page">
        <div className="admin-access-card">
          <LockKey size={28} weight="duotone" />
          <p className="eyebrow">HEDON LOG / ADMIN</p>
          <h1>用 GitHub 身份进入内容管理后台。</h1>
          <p>
            {query.auth === "denied"
              ? `登录账号 @${query.account ?? "未知"} 没有后台权限。`
              : oauthReady
                ? "登录后会检查你的 GitHub 用户名是否在允许名单中。"
                : "GitHub OAuth 尚未配置；请先设置后台所需的环境变量。"}
          </p>
          <div className="admin-access-actions">
            {oauthReady && (
              <Link className="admin-github-login" href="/api/auth/github">
                <GithubLogo size={18} weight="fill" /> 使用 GitHub 登录
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

  const managed = await listManagedThoughts(true);
  const initialThoughts = managed.map((row) => ({
    ...toPublicThought(row),
    id: row.id,
    status: row.status,
  }));
  const catalog = [
    ...posts.map((post) => ({
      kind: "post" as const,
      slug: post.slug,
      title: post.title,
      topic: post.topic ?? "博文",
    })),
    ...columns.map((entry) => ({
      kind: "column" as const,
      column: entry.column,
      slug: entry.slug,
      title: entry.title,
      topic: entry.columnTitle ?? "专栏",
    })),
  ];

  return (
    <AdminDashboard
      userName={`@${user.login}`}
      initialThoughts={initialThoughts}
      staticThoughtCount={thoughts.length}
      catalog={catalog}
    />
  );
}
