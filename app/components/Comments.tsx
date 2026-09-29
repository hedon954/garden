import { ChatCircle, GithubLogo } from "@phosphor-icons/react/ssr";
import { readGiscusConfig } from "../lib/giscus-config";
import { GiscusComments } from "./GiscusComments";

export function Comments({ slug }: { slug: string }) {
  const config = readGiscusConfig();

  return (
    <section className="comments" aria-labelledby={`comments-heading-${slug}`}>
      <div className="comments-heading">
        <ChatCircle size={23} />
        <div>
          <h2 id={`comments-heading-${slug}`}>评论</h2>
          <p>
            {config
              ? "评论由 GitHub Discussions 保存和管理。"
              : "评论还没开放。配好下面四项后，这里才会出现评论框。"}
          </p>
        </div>
      </div>

      {config ? (
        <GiscusComments slug={slug} config={config} />
      ) : (
        <div className="integration-notice">
          <GithubLogo size={20} weight="fill" />
          <p>
            打开{" "}
            <a href="https://giscus.app/zh-CN" target="_blank" rel="noreferrer">
              Giscus
            </a>
            ，安装到一个已开启 Discussions 的公开仓库，把仓库、仓库 ID、分类、分类 ID
            写入 <code>.env.local</code> 和 GitHub Actions Variables：
            <code>GISCUS_REPO</code>、<code>GISCUS_REPO_ID</code>、
            <code>GISCUS_CATEGORY</code>、<code>GISCUS_CATEGORY_ID</code>。
          </p>
        </div>
      )}
    </section>
  );
}
