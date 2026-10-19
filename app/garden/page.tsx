import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  CodeBlock as CodeBlockIcon,
  CompassTool,
  FileText,
  GithubLogo,
  Rows,
  Sparkle,
  TerminalWindow,
} from "@phosphor-icons/react/ssr";
import { GardenMediaGuide } from "../components/GardenMediaGuide";
import { GardenDocsNav } from "../components/GardenDocsNav";
import { MarkdownArticle } from "../components/MarkdownArticle";
import { gardenDocs } from "../lib/content";
import {
  groupHandbookDocs,
  toHandbookNavItems,
} from "../lib/garden-docs-meta";
import { pageAlternates } from "../lib/page-alternates";
import { siteHref } from "../lib/site-href";

export const metadata = {
  title: "Garden 使用说明",
  description:
    "用 Markdown 写技术文章、随想与专栏。自动处理长标题断行、宽图宽表展开、代码修改对比与 9 个内置组件。",
  alternates: pageAlternates("/garden"),
};

const LIVE_SPECIMEN_SOURCE = `### 页分裂的写入开销对比

当数据页快写满时，<u>把冷数据留在原页、只搬移热点后缀</u>可以明显减少单次事务写入的日志量。

\`\`\`rust
fn split_leaf(page: &mut LeafPage, pivot: usize) -> LeafPage {
    page.drain_from(page.len() / 2)
}
\`\`\`

\`\`\`diff
 fn split_leaf(page: &mut LeafPage, pivot: usize) -> LeafPage {
-    page.drain_from(page.len() / 2)
+    let cut = page.optimal_prefix_cut(pivot);
+    page.drain_from(cut)
 }
\`\`\`

\`\`\`garden stat
items:
  - label: 单事务日志写入
    value: "4.8"
    unit: KB
    caption: 比对半切分少 38%
  - label: P99 延迟
    value: "1.42"
    unit: ms
    caption: 减少 0.74 ms 刷盘等待
  - label: 数据页填充率
    value: "84.5"
    unit: "%"
    caption: 顺序插入不再停在半满
\`\`\`

\`\`\`garden compare
items:
  - title: 固定对半切分
    text: 直接从中间槽位折半拷贝；顺序写入时旧页停在半满。
    适合场景: 主键随机分布的写入
  - title: 按后缀位置切分
    text: 选最短分割键切分；父节点索引变小，顺序追加时旧页可写满。
    适合场景: 按时间顺序写入的表
\`\`\``;

const READING_FEATURES = [
  {
    tag: "740 / 1040 / 1340px",
    label: "自动宽窄",
    title: "正文好读，宽图宽表不憋屈",
    detail:
      "普通段落固定在 740px（每行大约 40 个汉字），看久了不容易串行；遇到高清截图自动放宽到 1040px，遇到多列大表格自动放宽到 1340px。放宽后如果碰到右侧目录，目录会自动往右让开。",
    href: "/garden/design",
  },
  {
    tag: "主题丨副题",
    label: "标题断行",
    title: "长标题自动断成匀称的两行",
    detail:
      "标题太长时，可以在想换行的地方写一个全角竖线「丨」；不写也会自动在冒号、破折号或中间位置拆成两行，并按字数微调字号，不会出现最后一行只剩一两个字的情况。",
    href: "/garden/design",
  },
  {
    tag: "代码 + diff",
    label: "代码对比",
    title: "代码块自带「对比 / 改后」切换",
    detail:
      "先放一段完整代码，紧接着再放一段 diff 围栏，页面会自动把它们合成一个带「对比」和「改后」按钮的代码框。点右上角复制时，永远复制干净的完整代码，不会把加减号一起拷走。",
    href: "/garden/writing",
  },
  {
    tag: "**粗体** 与 <u>",
    label: "中文排版",
    title: "中文标点旁的加粗不失效，重点句可划荧光笔",
    detail:
      "Markdown 里紧挨着中文括号、引号写 **加粗** 经常显示出一串星号，Garden 会自动修好。需要标出关键结论时，用 <u>重点文字</u> 就能画出不挡字的暖黄荧光笔底色。",
    href: "/garden/writing",
  },
  {
    tag: "{card} 与图标",
    label: "外部链接",
    title: "外链自动带站点小图标，也能转成链接卡片",
    detail:
      "正文里的外部链接会自动加上网站图标，并且图标和第一个字绑在一起，不会单独留在行尾。把链接单独放一行，或者在末尾写 {card}，就会生成带标题、简介和预览图的卡片。",
    href: "/garden/writing",
  },
  {
    tag: "浅色 / 深色",
    label: "配图保护",
    title: "图片加载不闪跳，深色模式下黑线图依然看得清",
    detail:
      "打包时会自动读取每张本地图片的宽高，网页打开时文字不会被慢加载的图片顶得乱跳。切到深色模式后，透明背景的黑线流程图会自动垫一层浅色纸底，不用准备两套图。",
    href: "/garden/design",
  },
];

const COMPONENT_CATALOG = [
  {
    name: "stat",
    label: "数字指标",
    fence: "```garden stat",
    keys: "label · value · unit · caption · items",
    summary: "把分散在段落里的几组关键数字、耗时或百分比并排摆出来，一眼看清变化。",
    href: "/garden/components/stat",
  },
  {
    name: "compare",
    label: "并排对比",
    fence: "```garden compare",
    keys: "items · title · text · 自定义属性",
    summary: "把两种或三种做法左右并排放在一起，适合写改动前后对比或方案取舍。",
    href: "/garden/components/compare",
  },
  {
    name: "chart",
    label: "条形图表",
    fence: "```garden chart",
    keys: "title · x · series · data · unit · caption",
    summary: "用几行数据直接画出比例条形图，下方自带可展开的完整数字表格。",
    href: "/garden/components/chart",
  },
  {
    name: "figure",
    label: "分区结构图",
    fence: "```garden figure",
    keys: "svg · image · parts · caption",
    summary: "给架构图或流程图加上分区按钮，读者点哪个按钮，就高亮对应区域并显示说明。",
    href: "/garden/components/figure",
  },
  {
    name: "timeline",
    label: "时间线",
    fence: "```garden timeline",
    keys: "title · items[date / title / text / source]",
    summary: "按时间或步骤顺序串起故障排查过程、版本变化或关键节点。",
    href: "/garden/components/timeline",
  },
  {
    name: "card",
    label: "知识卡片",
    fence: "```garden card",
    keys: "title · url · meta · description · points",
    summary: "介绍一篇论文、一个开源项目或某个模块，支持在卡片下方列出带编号的要点。",
    href: "/garden/components/card",
  },
  {
    name: "interactive",
    label: "可调公式与参数",
    fence: "```garden interactive",
    keys: "caption · State · Let · Slider · Chart",
    summary: "放一两个滑杆让读者自己动手调参数（比如并发数、数据量），实时算出结果和曲线。",
    href: "/garden/components/interactive",
  },
  {
    name: "html",
    label: "嵌入网页片段",
    fence: "```garden html",
    keys: "src · code · title · height",
    summary: "嵌入自己写的 HTML/SVG 演示、选项卡、小测验，或者带脚本的画布动画。",
    href: "/garden/components/html",
  },
  {
    name: "file",
    label: "文件下载与预览",
    fence: "```garden file",
    keys: "src · title · note · files",
    summary: "放单个文件或一组附件供读者下载，自动标出文件大小，PDF、表格和文档还能直接在页内拉开预览。",
    href: "/garden/components/file",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "创建站点目录",
    command: "npx hd-garden init my-blog",
    detail:
      "生成干净的写作目录：里面只有配置文件 site.config.yaml、放文章的 content/ 和放图片的 public/。",
  },
  {
    step: "02",
    title: "本地边写边看",
    command: "make dev",
    detail:
      "在浏览器打开本地预览，保存文件后页面自动刷新。想把没写完的草稿也显示出来，运行 CONTENT_INCLUDE_DRAFTS=1 make dev。",
  },
  {
    step: "03",
    title: "新建文章与检查",
    command: 'make new SLUG=btree-split TITLE="B-Tree 分裂优化"',
    detail:
      "生成带日期和标题的 Markdown 文件。写完可以用 make check 检查有没有写错组件字段或失效的附件路径。",
  },
  {
    step: "04",
    title: "一键提交发布",
    command: "make update",
    detail:
      "自动做完语法检查、提交 Git 并推送到远端仓库，GitHub Actions 会接着把网站打包发布到线上。",
  },
];

export default function GardenPage() {
  const navItems = toHandbookNavItems(gardenDocs);
  const groups = groupHandbookDocs(navItems);
  const hasMediaGuide = Boolean(GardenMediaGuide);

  return (
    <main className="column-reading-page garden-doc-page garden-overview-page">
      <GardenDocsNav docs={navItems} currentPath="" />

      <div className="gdoc-overview-main">
        {/* Hero */}
        <header className="gdoc-hero">
          <div className="gdoc-eyebrow">
            <span>Garden 使用说明</span>
            <span aria-hidden="true">·</span>
            <span>用 Markdown 写技术博客</span>
          </div>
          <h1>你只管写 Markdown，排版交给 Garden。</h1>
          <p className="gdoc-hero-lede">
            所有文章、随想和专栏都是普通文本文件，存在你自己的 Git 仓库里。Garden
            帮你把长文排得舒服好读：长标题自动均衡断行，大图大表自动往两侧展开，还自带代码修改对比和 9 个常用的展示组件。
          </p>

          <div className="gdoc-hero-actions">
            <Link href={siteHref("/garden/start")} className="gdoc-btn-primary">
              <span>快速开始</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href={siteHref("/garden/components")} className="gdoc-btn-secondary">
              <CompassTool size={16} aria-hidden="true" />
              <span>查看 9 个内置组件</span>
            </Link>
            <a
              href="https://github.com/hedon954/garden"
              target="_blank"
              rel="noopener noreferrer"
              className="gdoc-btn-ghost"
            >
              <GithubLogo size={16} weight="fill" aria-hidden="true" />
              <span>GitHub 仓库</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>

          <div className="gdoc-hero-terminal" role="region" aria-label="快速初始化命令">
            <div className="gdoc-terminal-bar">
              <TerminalWindow size={15} aria-hidden="true" />
              <span>三行命令在本地跑起来</span>
              <code>Node.js 22+</code>
            </div>
            <pre>
              <code>{`npx hd-garden init my-blog && cd my-blog && make dev`}</code>
            </pre>
          </div>
        </header>

        {/* Section 1: Reading Layout */}
        <section className="gdoc-section" id="reading-ergonomics" aria-labelledby="gdoc-ergonomics-title">
          <div className="gdoc-sec-head">
            <div>
              <span className="gdoc-sec-kicker">01 · 阅读体验</span>
              <h2 id="gdoc-ergonomics-title">为什么技术长文在这里更好读</h2>
            </div>
            <Link href={siteHref("/garden/design")} className="gdoc-sec-link">
              了解排版细节 <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <p className="gdoc-sec-intro">
            写技术文章最常遇到一个矛盾：正文太宽眼睛容易累，正文太窄又放不下多列表格和架构图。Garden
            的做法是<strong>正文保持在舒服的 740px，遇到宽图和宽表格时自动向两边撑开</strong>。
          </p>

          {/* Visual Geometry Ruler */}
          <figure className="gdoc-geometry-card" aria-label="正文、宽图与宽表格的宽度示意">
            <div className="gdoc-geo-header">
              <span>三种内容宽度（电脑端自动适配）</span>
              <span>暖白纸色 #faf9f5 · 深灰墨色 #1b1a18</span>
            </div>
            <div className="gdoc-geo-stage">
              <div className="gdoc-geo-band is-table">
                <div className="gdoc-geo-band-meta">
                  <strong>多列大表格 · 最宽 1340px</strong>
                  <span>列数多时自动向左右两边拓宽，碰到右侧目录时目录会自动往右让开</span>
                </div>
              </div>
              <div className="gdoc-geo-band is-figure">
                <div className="gdoc-geo-band-meta">
                  <strong>高清配图与架构图 · 最宽 1040px</strong>
                  <span>高分屏截图按实际清晰尺寸展示，最多向左右各拓宽 150px</span>
                </div>
              </div>
              <div className="gdoc-geo-band is-prose">
                <div className="gdoc-geo-band-meta">
                  <strong>普通正文与代码块 · 740px</strong>
                  <span>17px 字号 · 1.75 倍行高 · 每行大约 40 个汉字，长时间读不累</span>
                </div>
              </div>
            </div>
            <figcaption className="gdoc-geo-foot">
              <span>左侧留白</span>
              <span>·</span>
              <span>中间 740px 正文区</span>
              <span>·</span>
              <span>右侧 200px 章节目录（手机端收起到右下角按钮）</span>
            </figcaption>
          </figure>

          <div className="gdoc-mechanics-grid">
            {READING_FEATURES.map((item) => (
              <article key={item.title} className="gdoc-mechanic-card">
                <div className="gdoc-mechanic-top">
                  <code className="gdoc-mechanic-tag">{item.tag}</code>
                  <span className="gdoc-mechanic-src">{item.label}</span>
                </div>
                <h3>
                  <Link href={siteHref(item.href)}>{item.title}</Link>
                </h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Section 2: Live Source -> Rendered Specimen */}
        <section className="gdoc-section" id="live-specimen" aria-labelledby="gdoc-specimen-title">
          <div className="gdoc-sec-head">
            <div>
              <span className="gdoc-sec-kicker">02 · 写法对比</span>
              <h2 id="gdoc-specimen-title">左边是你写的 Markdown，右边是读者看到的页面</h2>
            </div>
            <Link href={siteHref("/garden/writing")} className="gdoc-sec-link">
              查看完整写作语法 <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <p className="gdoc-sec-intro">
            不用在文章里写复杂的 HTML 标签。下面右边就是这段 Markdown 的真实渲染效果——你可以直接点代码框右上角的「对比 / 改后」试试：
          </p>

          <div className="gdoc-specimen-split">
            <div className="gdoc-specimen-source">
              <div className="gdoc-pane-bar">
                <CodeBlockIcon size={15} aria-hidden="true" />
                <span>你写的 Markdown</span>
                <code>content/posts/btree-split.md</code>
              </div>
              <pre>
                <code>{LIVE_SPECIMEN_SOURCE}</code>
              </pre>
            </div>

            <div className="gdoc-specimen-render">
              <div className="gdoc-pane-bar">
                <Sparkle size={15} aria-hidden="true" />
                <span>实际渲染出来的样子（可直接点按）</span>
                <code>740px 正文区</code>
              </div>
              <div className="gdoc-specimen-body e-content">
                <MarkdownArticle content={LIVE_SPECIMEN_SOURCE} />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: 9 Built-in Components */}
        <section className="gdoc-section" id="components-index" aria-labelledby="gdoc-components-title">
          <div className="gdoc-sec-head">
            <div>
              <span className="gdoc-sec-kicker">03 · 内置组件</span>
              <h2 id="gdoc-components-title">9 个拿来即用的展示组件</h2>
            </div>
            <Link href={siteHref("/garden/components")} className="gdoc-sec-link">
              怎么挑选组件 <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <p className="gdoc-sec-intro">
            平时写段落、列表和表格直接用普通 Markdown 就够了。当你想并排摆几个数字、左右对比两套方案、给架构图加点按说明或放个文件下载时，写一个{" "}
            <code>{"```garden <组件英文名>"}</code> 代码块即可：
          </p>

          <div className="gdoc-comp-grid">
            {COMPONENT_CATALOG.map((comp) => (
              <Link
                key={comp.name}
                href={siteHref(comp.href)}
                className="gdoc-comp-card"
              >
                <div className="gdoc-comp-card-top">
                  <code className="gdoc-comp-name">{comp.name}</code>
                  <span className="gdoc-comp-zh">{comp.label}</span>
                  <ArrowRight size={14} className="gdoc-comp-arrow" aria-hidden="true" />
                </div>
                <p className="gdoc-comp-desc">{comp.summary}</p>
                <div className="gdoc-comp-meta">
                  <code>{comp.keys}</code>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 4: Workflow, Directory Layout & Publishing Boundaries */}
        <section className="gdoc-section" id="setup" aria-labelledby="garden-setup-title">
          <div className="gdoc-sec-head">
            <div>
              <span className="gdoc-sec-kicker">04 · 日常使用</span>
              <h2 id="garden-setup-title">从新建站点到发布上线只需四个命令</h2>
            </div>
            <Link href={siteHref("/garden/start")} className="gdoc-sec-link">
              看详细步骤 <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <ol className="gdoc-steps-grid">
            {WORKFLOW_STEPS.map((item) => (
              <li key={item.step} className="gdoc-step-card">
                <div className="gdoc-step-head">
                  <span className="gdoc-step-num">{item.step}</span>
                  <h3>{item.title}</h3>
                </div>
                <pre>
                  <code>{item.command}</code>
                </pre>
                <p>{item.detail}</p>
              </li>
            ))}
          </ol>

          <div className="gdoc-boundary-split">
            <article className="gdoc-boundary-card" id="media">
              <div className="gdoc-boundary-head">
                <Rows size={17} aria-hidden="true" />
                <h3>视频、外部链接卡片与附件</h3>
              </div>
              <p>
                把 YouTube 或 Bilibili 链接单独放一行，会自动变成视频播放器；在普通网页链接后面加{" "}
                <code>&#123;card&#125;</code>（比如 <code>[标题](url)&#123;card&#125;</code>），会自动抓出网页标题和简介做成链接卡片；需要让读者下载或在线预览 PDF、表格、文档时，用{" "}
                <code>{"```garden file"}</code>。
              </p>
              {hasMediaGuide ? (
                <Link href={siteHref("/garden/writing")} className="gdoc-inline-link">
                  查看链接与图片写法 <ArrowRight size={13} aria-hidden="true" />
                </Link>
              ) : null}
            </article>

            <article className="gdoc-boundary-card" id="admin">
              <div className="gdoc-boundary-head">
                <FileText size={17} aria-hidden="true" />
                <h3 id="garden-admin-title">私密草稿仓库与网页端发随想</h3>
              </div>
              <p>
                可以直接用单个公开仓库发到 GitHub Pages；如果不希望别人看到还没写完的草稿，也可以把原稿放在私有仓库，只把生成的网页自动推到公开仓库。另外还带有一个可选的{" "}
                <code>/admin</code> 页面，配置好 GitHub 登录后，在手机上也能随手发条随想或传张图。
              </p>
              <div className="gdoc-boundary-links">
                <Link href={siteHref("/garden/deploy")} className="gdoc-inline-link">
                  查看 GitHub Pages 与私仓配置 <ArrowRight size={13} aria-hidden="true" />
                </Link>
                <Link href={siteHref("/garden/workflow")} className="gdoc-inline-link">
                  查看语法检查与快捷输入 <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* Section 5: Complete Handbook Map */}
        <section className="gdoc-section gdoc-toc-map" aria-labelledby="gdoc-map-title">
          <div className="gdoc-sec-head">
            <div>
              <span className="gdoc-sec-kicker">05 · 全部章节</span>
              <h2 id="gdoc-map-title">说明书目录（共 {navItems.length} 篇）</h2>
            </div>
          </div>
          <div className="gdoc-map-groups">
            {groups.map((group) => (
              <div key={group.id} className="gdoc-map-group">
                <div className="gdoc-map-group-head">
                  <CheckCircle size={15} aria-hidden="true" />
                  <h3>{group.title}</h3>
                  {group.note ? <span>{group.note}</span> : null}
                </div>
                <ol className="gdoc-map-list">
                  {group.items.map((item) => (
                    <li key={item.path}>
                      <Link href={siteHref(`/garden/${item.path}`)}>
                        <strong>{item.title}</strong>
                        {item.description ? <span>{item.description}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
