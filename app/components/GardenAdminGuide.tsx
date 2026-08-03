const adminCapabilities = [
  {
    number: "01",
    title: "发布和管理随想",
    description:
      "新建随想、保存草稿、正式发布、撤回或删除。每次修改都会写回 content/thoughts/，不会另存一份数据库副本。",
  },
  {
    number: "02",
    title: "上传多媒体",
    description:
      "图片、音频和视频可以直接上传到阿里云 OSS，随想中只保存公开地址，避免把大文件塞进 Git 历史。",
  },
  {
    number: "03",
    title: "管理博文置顶",
    description:
      "后台可以切换博文的首页置顶状态，并查看博文所属专栏。正文仍然使用 Markdown 编辑，专栏顺序仍由 columns.yaml 管理。",
  },
  {
    number: "04",
    title: "分发到其他平台",
    description:
      "可以直接发布到 X，或调用自建服务同步到 CSDN、知乎和掘金；没有配置接口时，也能复制标题、栏目和公开链接。",
  },
];

const adminFlow = [
  ["GitHub 登录", "只允许白名单中的账号进入后台。"],
  ["执行内容操作", "发布随想、上传附件、置顶或分发博文。"],
  ["提交到内容仓库", "后台使用服务端令牌修改 Markdown。"],
  ["自动更新博客", "main 分支变更后由 Actions 重新发布。"],
];

export function GardenAdminGuide() {
  return (
    <section className="garden-admin" id="admin" aria-labelledby="garden-admin-title">
      <header className="garden-section-heading">
        <div>
          <p className="eyebrow">ADMIN / 管理后台</p>
          <h2 id="garden-admin-title">管理后台能做什么</h2>
        </div>
        <p>
          后台是一个可选的独立服务，处理需要登录和服务端密钥的工作。公开博客仍然是静态站点，内容仍然保存在 Git 仓库中。
        </p>
      </header>

      <figure className="garden-admin-preview">
        {/* vinext 的本地静态导出不提供 Next 图片优化端点，截图直接由 public 目录提供。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/garden/admin-studio.png"
          alt="Garden 内容管理后台，包含随想发布、草稿管理与博文分发"
          width={1440}
          height={1000}
          loading="lazy"
        />
        <figcaption>
          <strong>实际后台界面</strong>
          <span>随想编辑、已发布与草稿管理，以及博文置顶和分发都集中在同一个工作区。</span>
        </figcaption>
      </figure>

      <div className="garden-admin-capabilities">
        {adminCapabilities.map((capability) => (
          <article key={capability.number}>
            <span>{capability.number}</span>
            <h3>{capability.title}</h3>
            <p>{capability.description}</p>
          </article>
        ))}
      </div>

      <div className="garden-admin-boundary">
        <strong>后台的边界</strong>
        <p>
          它不是一套完整 CMS。长文章继续在 Typora 或其他 Markdown 编辑器中编写，专栏继续在
          <code> content/columns.yaml </code>
          中编排；后台主要补上随想发布、媒体上传、博文置顶和内容分发。
        </p>
      </div>

      <ol className="garden-admin-flow" aria-label="管理后台发布流程">
        {adminFlow.map(([title, description], index) => (
          <li key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </li>
        ))}
      </ol>

      <div className="garden-admin-enable">
        <div>
          <p className="eyebrow">ENABLE / 启用后台</p>
          <h3>单独部署，再连接内容仓库</h3>
          <ol>
            <li>把同一份 Garden 部署到 Node、Docker 或 Cloudflare Workers。</li>
            <li>配置 GitHub OAuth、允许登录的账号，以及仅能写入内容仓库的令牌。</li>
            <li>需要上传附件或跨平台分发时，再配置 OSS 和各平台接口。</li>
          </ol>
        </div>
        <pre aria-label="管理后台核心配置示例">
          <code>{`ADMIN_URL=https://admin.example.com
CONTENT_REPOSITORY=owner/repository
CONTENT_BRANCH=main
ADMIN_GITHUB_LOGINS=your-github-login

# 令牌与密钥只保存在后台服务中
CONTENT_GITHUB_TOKEN=github_pat_xxx
GITHUB_OAUTH_CLIENT_ID=Ov23li_xxx`}</code>
        </pre>
      </div>
    </section>
  );
}
