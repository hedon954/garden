import Link from "next/link";
import { ArrowSquareOut, LockKey } from "@phosphor-icons/react/ssr";
import { AdminDashboard } from "../components/AdminDashboard";
import { isAdmin } from "../lib/admin-auth";
import { columns, posts, thoughts } from "../lib/content";
import { toPublicThought, listManagedThoughts } from "../lib/managed-thoughts";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "内容管理",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (!isAdmin(user)) {
    return (
      <main className="admin-access-page">
        <div className="admin-access-card">
          <LockKey size={28} weight="duotone" />
          <p className="eyebrow">HEDON LOG / ADMIN</p>
          <h1>这个管理平台只向站点所有者开放。</h1>
          <p>
            当前账号没有发布权限。请将需要使用后台的 ChatGPT 邮箱写入
            <code>ADMIN_EMAILS</code> 后重新进入。
          </p>
          <Link href="/">
            返回公开博客 <ArrowSquareOut size={15} />
          </Link>
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
      userName={user.displayName}
      initialThoughts={initialThoughts}
      staticThoughtCount={thoughts.length}
      catalog={catalog}
    />
  );
}
