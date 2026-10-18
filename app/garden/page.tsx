import { ArrowRight, ArrowUpRight, GithubLogo } from "@phosphor-icons/react/ssr";
import { GardenAdminGuide } from "../components/GardenAdminGuide";
import { GardenContentGuide } from "../components/GardenContentGuide";
import { GardenMediaGuide } from "../components/GardenMediaGuide";
import { PageIntro } from "../components/PageIntro";
import { siteConfig } from "../site.config";

export const metadata = {
  title: "Garden",
  description: "用 Markdown 写文章。推送之后，页面、搜索和 RSS 一起更新。",
};

const jumps = [
  ["#write-post", "写文章"],
  ["#write-thought", "随想"],
  ["#make-column", "专栏"],
  ["#setup", "跑起来"],
  ["#media", "视频和链接"],
  ["#admin", "后台"],
];

const setupSteps = [
  {
    title: "创建站点",
    body: (
      <>
        运行 <code>npx hd-garden init my-blog</code>。目录里留下 <code>content/</code> 和 <code>site.config.yaml</code>。仓库名叫 <code>&lt;owner&gt;.github.io</code> 时，地址最直接。
      </>
    ),
  },
  {
    title: "在本地看",
    command: "make dev",
    body: "第一次会安装依赖。然后打开终端里的地址。",
  },
  {
    title: "换成你的内容",
    files: [
      ["site.config.yaml", "站名、作者、各页标题"],
      ["content/posts/", "长文和附件"],
      ["content/thoughts/", "随想"],
      ["content/columns.yaml", "专栏和阅读顺序"],
    ],
  },
  {
    title: "发布",
    command: "make update",
    body: "先检查，再提交并推送。main 更新后，网站、搜索和 RSS 会一起更新。",
  },
];

export default function GardenPage() {
  return (
    <main className="page-shell garden-page">
      <PageIntro title={siteConfig.pages.garden.title} subtitle={siteConfig.pages.garden.subtitle}>
        <p className="garden-lede">
          文章放在你自己的仓库里。你改文件，网站跟着更新。
        </p>
        <div className="garden-actions">
          <a
            className="garden-primary-link"
            href="https://github.com/hedon954/garden"
            target="_blank"
            rel="noreferrer"
          >
            <GithubLogo size={18} weight="fill" />
            查看源码
            <ArrowUpRight size={16} />
          </a>
          <a className="inline-cta" href="#setup">
            在本地跑起来
            <ArrowRight size={16} />
          </a>
        </div>
      </PageIntro>

      <nav className="garden-jumps" aria-label="本页">
        {jumps.map(([href, label]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>

      <GardenContentGuide />

      <section className="garden-setup" id="setup" aria-labelledby="garden-setup-title">
        <header className="garden-section-heading">
          <h2 id="garden-setup-title">跑起来</h2>
          <p>不需要数据库。换上你的名字和第一篇文章，推送即可。</p>
        </header>

        <ol className="garden-steps">
          {setupSteps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                {"command" in step && step.command ? <pre><code>{step.command}</code></pre> : null}
                {"files" in step && step.files ? (
                  <dl>
                    {step.files.map(([name, note]) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd>{note}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {"body" in step && step.body ? <p>{step.body}</p> : null}
              </div>
            </li>
          ))}
        </ol>

        <div className="garden-setup-notes">
          <p>
            <strong>仓库可以是私有的。</strong>
            公开仓库一种就够。想把草稿留在私有仓库时，用 <code>PAGES_REPOSITORY</code> 指向公开的页面仓库。两种都是 <code>make update</code>。
          </p>
          <p>
            <strong>先看草稿。</strong>
            <code>CONTENT_INCLUDE_DRAFTS=1 make dev</code> 会把草稿和还没到时间的文章也显示出来。
          </p>
          <p>
            <strong>密钥不进仓库。</strong>
            评论、统计和后台的密钥放在部署平台。
          </p>
        </div>
      </section>

      <GardenMediaGuide />

      <section className="garden-after" aria-labelledby="garden-after-title">
        <header className="garden-section-heading">
          <h2 id="garden-after-title">推送之后</h2>
        </header>
        <p className="garden-after-lead">推送之后，网站公开更新。</p>
        <div className="garden-after-copy">
          <p>文章在你自己的仓库里。读者打开的是已经发布的页面。</p>
          <p>一次更新会带上正文、目录、前后篇、搜索、RSS 和 sitemap。后台和评论都可以以后再加。</p>
        </div>
      </section>

      <GardenAdminGuide />
    </main>
  );
}
