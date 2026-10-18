import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <header className="sh-head">
        <h1>找不到这一页</h1>
        <p className="sh-deck">地址可能写错了，或者这篇已经不在了。</p>
      </header>
      <p><Link href="/">返回首页</Link></p>
    </main>
  );
}
