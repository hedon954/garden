import { ChatCircle, GithubLogo } from "@phosphor-icons/react/ssr";
import {
  GiscusComments,
  type GiscusConfig,
} from "./GiscusComments";

function giscusConfig(): GiscusConfig | undefined {
  const config = {
    repo:
      process.env.GISCUS_REPO ?? process.env.NEXT_PUBLIC_GISCUS_REPO,
    repoId:
      process.env.GISCUS_REPO_ID ?? process.env.NEXT_PUBLIC_GISCUS_REPO_ID,
    category:
      process.env.GISCUS_CATEGORY ??
      process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
    categoryId:
      process.env.GISCUS_CATEGORY_ID ??
      process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
  };
  return Object.values(config).every(Boolean)
    ? (config as GiscusConfig)
    : undefined;
}

export function Comments({ slug }: { slug: string }) {
  const config = giscusConfig();

  return (
    <section className="comments" aria-labelledby={`comments-heading-${slug}`}>
      <div className="comments-heading">
        <ChatCircle size={23} />
        <div>
          <h2 id={`comments-heading-${slug}`}>评论</h2>
          <p>
            {config
              ? "评论由 GitHub Discussions 保存和管理。"
              : "评论接入已准备好，补充 GitHub Discussions 配置后即可开放。"}
          </p>
        </div>
      </div>

      {config ? (
        <GiscusComments slug={slug} config={config} />
      ) : (
        <div className="integration-notice">
          <GithubLogo size={20} weight="fill" />
          <p>
            需要一个公开 GitHub 仓库，并为它启用 Discussions、安装 Giscus
            App、选择评论分类。
          </p>
        </div>
      )}
    </section>
  );
}
