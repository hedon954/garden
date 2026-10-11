import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminUser } from "../lib/admin-auth";

const SECTIONS = [
  { href: "/admin", label: "总览" },
  { href: "/admin/ui", label: "组件工作台" },
  { href: "/admin/ui/catalog", label: "组件清单" },
  { href: "/admin/ui/blocks", label: "交互块" },
  { href: "/admin/ui/evals", label: "模型自检" },
];

export const isStaticExport = () => process.env.STATIC_EXPORT === "1";

export async function requireAdminPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin");
  return user;
}

export function StaticAdminNotice() {
  return (
    <main className="admin-access-page">
      <div className="admin-access-card">
        <h1>内容后台独立运行。</h1>
        <p>公开博客由 GitHub Pages 静态托管；这一页只在独立后台里可用。</p>
        <Link href="/">返回公开博客</Link>
      </div>
    </main>
  );
}

export function AdminUiShell({ active, userName, children }: { active: string; userName: string; children: ReactNode }) {
  return (
    <main className="admin-shell admin-ui-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin">HEDON <span>STUDIO</span></Link>
        <div>
          <span>{userName}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="admin-signout">退出</button>
          </form>
        </div>
      </header>
      <nav className="admin-ui-nav" aria-label="后台分区">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} aria-current={section.href === active ? "page" : undefined}>
            {section.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
