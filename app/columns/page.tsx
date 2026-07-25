import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { columns } from "../lib/content";

export const metadata = {
  title: "主题专栏",
  description: "按主题组织的系列文章与持续更新的阅读路径。",
};

export default function ColumnsPage() {
  const first = columns[0];
  return (
    <main className="page-shell index-page">
      <header className="page-intro">
        <p className="eyebrow">COLUMNS / 专栏</p>
        <h1>把一个主题，写到足够深入。</h1>
        <p>
          专栏不是标签集合，而是一条有顺序的阅读路径。左侧章节导航会在阅读时始终陪着你。
        </p>
      </header>

      <Link
        href={`/columns/${first.column}/${first.slug}`}
        className="column-feature"
      >
        <div className="column-feature-copy">
          <span>连载中 · {columns.length} 篇 · 独立开发</span>
          <h2>{first.columnTitle}</h2>
          <p>
            从最小闭环、可靠状态到带着证据发布：记录一个人把产品从想法变成日常工具的过程。
          </p>
          <strong>
            从第一篇开始
            <ArrowRight size={17} />
          </strong>
        </div>
        <div className="column-feature-index">
          <span>主题专栏</span>
          <strong>01</strong>
          <small>BUILDING IN PUBLIC</small>
        </div>
      </Link>
    </main>
  );
}
