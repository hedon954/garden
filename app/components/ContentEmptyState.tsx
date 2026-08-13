import Link from "next/link";
import { ArrowRight, Article, Books, Quotes } from "@phosphor-icons/react/ssr";

const emptyContent = {
  posts: {
    icon: Article,
    eyebrow: "NO POSTS YET / 暂无博文",
    title: "这里还没有博文。",
    description: "第一篇长文发布后，会从这里开始形成可检索、可归档的写作记录。",
    actionHref: "/",
    actionLabel: "返回首页",
  },
  thoughts: {
    icon: Quotes,
    eyebrow: "NO THOUGHTS YET / 暂无随想",
    title: "随想还没有开始。",
    description: "短句、照片、声音和临时冒出的念头，之后都会沿着时间线落在这里。",
    actionHref: "/blog",
    actionLabel: "先读博文",
  },
  columns: {
    icon: Books,
    eyebrow: "NO COLUMNS YET / 暂无专栏",
    title: "专栏正在形成。",
    description: "当同一主题积累出清晰的阅读顺序，这里会出现第一条连续的阅读路径。",
    actionHref: "/blog",
    actionLabel: "浏览全部博文",
  },
} as const;

export function ContentEmptyState({ kind }: { kind: keyof typeof emptyContent }) {
  const content = emptyContent[kind];
  const Icon = content.icon;

  return (
    <section className="content-empty-state" aria-labelledby={`${kind}-empty-title`}>
      <div className="content-empty-mark" aria-hidden="true">
        <Icon size={30} weight="light" />
      </div>
      <div>
        <p className="eyebrow">{content.eyebrow}</p>
        <h2 id={`${kind}-empty-title`}>{content.title}</h2>
        <p>{content.description}</p>
      </div>
      <Link href={content.actionHref}>
        {content.actionLabel}
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}
