import { ArrowRight, ArrowUpRight, GithubLogo } from "@phosphor-icons/react/ssr";
import { GardenAdminGuide } from "../components/GardenAdminGuide";
import { GardenContentGuide } from "../components/GardenContentGuide";
import { PageIntro } from "../components/PageIntro";
import { TableOfContents } from "../components/TableOfContents";
import { siteConfig } from "../site.config";

export const metadata = {
  title: `Garden · ${siteConfig.pages.garden.title}`,
  description:
    "一个以 Markdown 为内容源、通过 GitHub Pages 发布的个人博客框架，支持博文、随想、专栏、搜索、RSS 与多媒体。",
};

const systemCapabilities = [
  {
    title: "Markdown 与多媒体",
    description:
      "兼容 Typora 常用写法，支持 GFM、代码高亮、数学公式、Mermaid、原生 HTML，以及图片、音频和视频。",
  },
  {
    title: "阅读与内容发现",
    description:
      "自动生成文章目录、阅读时长、字数、前后篇导航、主题归档和全文搜索，搜索结果会高亮命中内容。",
  },
  {
    title: "发布与订阅",
    description:
      "推送到 main 后由 GitHub Actions 构建并发布到 GitHub Pages，同时生成 RSS、sitemap、robots 和 Open Graph 元数据。",
  },
  {
    title: "开放集成",
    description:
      "需要时可以接入 Giscus 评论、Webmention、无 Cookie 统计和对象存储；不配置这些服务也能正常写作和发布。",
  },
];

const responsibilityBoundaries = [
  {
    number: "01",
    title: "Garden 框架",
    description:
      "公开模板和上游代码，负责内容模型、页面生成与发布工作流。使用模板后，不需要在这里保存个人文章。",
  },
  {
    number: "02",
    title: "源码仓库",
    description:
      "文章、随想、专栏、配置和草稿的唯一真源。你直接编辑这里，管理后台也只向这里提交内容。",
  },
  {
    number: "03",
    title: "公开博客",
    description:
      "GitHub Actions 从源码生成静态文件，再交给 GitHub Pages。双仓模式下，公开产物仓库只保存生成结果，不手工修改。",
  },
  {
    number: "04",
    title: "可选服务",
    description:
      "管理后台补充随想发布和媒体上传；Giscus 评论可以使用独立公开仓库。它们都不会替代源码仓库。",
  },
];

const gardenHeadings = [
  { depth: 2, text: "仓库和服务怎么分工", id: "garden-responsibilities-title" },
  { depth: 2, text: "博文、随想和专栏", id: "garden-guide-title" },
  { depth: 3, text: "写一篇文章", id: "write-post" },
  { depth: 3, text: "发布一条随想", id: "write-thought" },
  { depth: 3, text: "创建一个专栏", id: "make-column" },
  { depth: 2, text: "系统能力", id: "garden-system-title" },
  { depth: 2, text: "管理后台", id: "garden-admin-title" },
  { depth: 2, text: "安装与配置", id: "garden-setup-title" },
];

export default function GardenPage() {
  return (
    <main className="page-shell garden-page">
      <div className="garden-page-toc">
        <TableOfContents headings={gardenHeadings} label="本页目录" />
      </div>

      <PageIntro
        eyebrow="GARDEN / 博客框架"
        title={siteConfig.pages.garden.title}
        subtitle={siteConfig.pages.garden.subtitle}
      >
        <p className="garden-lede">
          Garden 是公开的博客框架，不是你的内容仓库。使用模板后，你只在自己的源码仓库里维护
          Markdown；推送后，GitHub Actions 会把它生成并发布为公开博客。
        </p>
        <div className="garden-actions">
          <a
            className="garden-primary-link"
            href="https://github.com/hedon954/garden"
            target="_blank"
            rel="noreferrer"
          >
            <GithubLogo size={18} weight="fill" />
            在 GitHub 查看源码
            <ArrowUpRight size={16} />
          </a>
          <a
            className="inline-cta"
            href="#setup"
          >
            查看安装与配置
            <ArrowRight size={16} />
          </a>
        </div>
      </PageIntro>

      <section
        className="garden-responsibilities"
        id="responsibilities"
        aria-labelledby="garden-responsibilities-title"
      >
        <header className="garden-section-heading">
          <div>
            <p className="eyebrow">FLOW / 职责划分</p>
            <h2 id="garden-responsibilities-title">你只需要维护源码仓库</h2>
          </div>
          <p>
            日常写作从源码仓库开始，也在源码仓库结束。框架提供能力，Actions 负责构建，Pages
            只负责展示；管理后台和评论都是可选补充。
          </p>
        </header>

        <div className="garden-responsibility-flow" aria-label="Garden 发布链路">
          <strong>Garden 模板</strong>
          <ArrowRight size={16} aria-hidden="true" />
          <strong>你的源码仓库</strong>
          <ArrowRight size={16} aria-hidden="true" />
          <strong>GitHub Actions</strong>
          <ArrowRight size={16} aria-hidden="true" />
          <strong>公开博客</strong>
        </div>

        <div className="garden-responsibility-grid">
          {responsibilityBoundaries.map((boundary) => (
            <article key={boundary.number}>
              <span>{boundary.number}</span>
              <h3>{boundary.title}</h3>
              <p>{boundary.description}</p>
            </article>
          ))}
        </div>
      </section>

      <GardenContentGuide />

      <section className="garden-system" aria-labelledby="garden-system-title">
        <header>
          <p className="eyebrow">SYSTEM / 系统能力</p>
          <h2 id="garden-system-title">Markdown、搜索与自动发布</h2>
          <p>
            写作者只维护 Markdown、附件和专栏配置。页面生成、搜索索引和订阅文件由构建脚本统一处理。
          </p>
        </header>
        <div className="garden-system-grid">
          {systemCapabilities.map((capability, index) => (
            <article key={capability.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <GardenAdminGuide />

      <section className="garden-setup" id="setup" aria-labelledby="garden-setup-title">
        <header className="garden-section-heading">
          <div>
            <p className="eyebrow">SETUP / 安装与配置</p>
            <h2 id="garden-setup-title">从模板到公开博客</h2>
          </div>
          <p>
            公开博客不需要数据库和服务器。创建仓库、替换配置与内容，再推送到 main，GitHub Actions 就会完成构建和发布。
          </p>
        </header>

        <div className="garden-setup-grid">
          <article>
            <span>01</span>
            <h3>创建自己的仓库</h3>
            <p>
              使用 GitHub 的 <strong>Use this template</strong>，推荐将仓库命名为
              <code> &lt;owner&gt;.github.io</code>。源码可以直接公开，也可以在 GitHub Free 下放进私有仓库，再把生成文件发布到公开 Pages 仓库。
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>在本地启动</h3>
            <pre>
              <code>make dev</code>
            </pre>
            <p>第一次运行会自动安装依赖并创建本地配置，随后启动预览。浏览器打开终端显示的地址即可。</p>
          </article>
          <article>
            <span>03</span>
            <h3>替换配置与内容</h3>
            <dl>
              <div>
                <dt>site.config.yaml</dt>
                <dd>站点名称、作者资料和各页面标题</dd>
              </div>
              <div>
                <dt>content/posts/</dt>
                <dd>长文章与附件</dd>
              </div>
              <div>
                <dt>content/thoughts/</dt>
                <dd>随想 Markdown</dd>
              </div>
              <div>
                <dt>content/columns.yaml</dt>
                <dd>专栏资料与文章顺序</dd>
              </div>
            </dl>
          </article>
          <article>
            <span>04</span>
            <h3>提交并发布</h3>
            <pre>
              <code>make update</code>
            </pre>
            <p>
              命令会先完成检查，再提交并推送源码仓库。main 分支更新后，Actions 自动生成页面、搜索索引、RSS 和 sitemap。
            </p>
          </article>
        </div>

        <div className="garden-setup-notes">
          <div>
            <strong>两种部署方式</strong>
            <p>
              公开源码使用单仓即可；需要隐藏草稿时，把源码放进私有仓库，并配置 <code>PAGES_REPOSITORY</code>
              指向公开产物仓库。两种方式都只运行 <code>make update</code>。
            </p>
          </div>
          <div>
            <strong>草稿预览</strong>
            <p>
              本地使用 <code>CONTENT_INCLUDE_DRAFTS=1 make dev</code>，即可预览草稿和未来定时文章。
            </p>
          </div>
          <div>
            <strong>可选服务</strong>
            <p>评论、Webmention、统计和管理后台按需配置；任何密钥都只放在部署平台的 Secret 中。</p>
          </div>
        </div>

        <div className="garden-setup-finish">
          <div>
            <p className="eyebrow">START / 开始使用</p>
            <h3>先把公开博客跑起来，再决定是否接入后台。</h3>
          </div>
          <a
            className="garden-primary-link"
            href="https://github.com/hedon954/garden"
            target="_blank"
            rel="noreferrer"
          >
            <GithubLogo size={18} weight="fill" />
            使用 Garden 模板
            <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </main>
  );
}
