const adminJobs = [
  {
    title: "写随想",
    description: "保存草稿，或直接发布。文件写回 content/thoughts/，没有另一份数据库。",
  },
  {
    title: "上传附件",
    description: "图片、音频和视频可以传到对象存储。文章里只留下地址。",
  },
  {
    title: "置顶",
    description: "让一篇博文出现在首页前面。正文还是在编辑器里改。",
  },
  {
    title: "发到别处",
    description: "可以发到 X，或同步到 CSDN、知乎、掘金。没配接口时，复制标题和链接。",
  },
  {
    title: "改文章里的交互",
    description: "写作台把一句话收成可交互的块。组件页能看到每一种块长什么样。",
  },
];

const adminFlow = [
  ["用 GitHub 登录", "只有名单里的账号能进来。"],
  ["做一件事", "写随想、上传、置顶，或发到别处。"],
  ["写回仓库", "后台把改动提交到你的内容仓库。"],
  ["网站更新", "main 变了之后，页面会重新发布。"],
];

export function GardenAdminGuide() {
  return (
    <section className="garden-admin" id="admin" aria-labelledby="garden-admin-title">
      <header className="garden-section-heading">
        <div>
          <h2 id="garden-admin-title">后台</h2>
        </div>
        <p>
          长文继续在编辑器里写。后台只做需要登录的事：随想、附件、置顶、转发，以及文章里的交互。
        </p>
      </header>

      <figure className="garden-admin-preview">
        {/* vinext 的本地静态导出不提供 Next 图片优化端点，截图直接由 public 目录提供。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/garden/admin-studio.png"
          alt="Garden 后台：上面写一条随想，下面是草稿和已发布"
          width={920}
          height={1033}
          loading="lazy"
        />
        <figcaption>
          <strong>后台首页</strong>
          <span>上面写一条随想。下面是草稿，以及可以置顶或转发的文章。</span>
        </figcaption>
      </figure>

      <div className="garden-admin-capabilities">
        {adminJobs.map((job) => (
          <article key={job.title}>
            <h3>{job.title}</h3>
            <p>{job.description}</p>
          </article>
        ))}
      </div>

      <div className="garden-admin-boundary">
        <strong>它不是整套编辑器</strong>
        <p>
          长文仍用 Typora 或其他 Markdown 编辑器。专栏顺序仍在
          <code> content/columns.yaml </code>
          里排。
        </p>
      </div>

      <ol className="garden-admin-flow" aria-label="从登录到网站更新">
        {adminFlow.map(([title, description], index) => (
          <li key={title}>
            <span>{index + 1}</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </li>
        ))}
      </ol>

      <div className="garden-admin-enable">
        <div>
          <h3>想用后台，再单独部署一份</h3>
          <ol>
            <li>把同一份 Garden 部署到 Node、Docker 或 Cloudflare Workers。</li>
            <li>配好 GitHub 登录、允许的账号，以及只能改内容仓库的令牌。</li>
            <li>要上传附件或转发到其他网站时，再配存储和各平台接口。</li>
          </ol>
        </div>
        <pre aria-label="后台需要的环境变量">
          <code>{`ADMIN_URL=https://admin.example.com
CONTENT_REPOSITORY=owner/repository
CONTENT_BRANCH=main
ADMIN_GITHUB_LOGINS=your-github-login

# 令牌只放在后台服务里
CONTENT_GITHUB_TOKEN=github_pat_xxx
GITHUB_OAUTH_CLIENT_ID=Ov23li_xxx`}</code>
        </pre>
      </div>
    </section>
  );
}
