# Design QA

## Comparison target

- Source visual truth: `/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-046e18fa-2fd6-4dba-962f-46b5535f594a.png`
- Browser-rendered implementation: `/Users/hedon/Documents/blog/implementation-home-final.png`
- Combined comparison evidence: `/Users/hedon/Documents/blog/design-comparison-home.png`
- Supporting captures:
  - `/Users/hedon/Documents/blog/implementation-article-final.png`
  - `/Users/hedon/Documents/blog/implementation-column-final.png`
  - `/Users/hedon/Documents/blog/implementation-mobile.png`
- State: light theme, home route; article and column routes in their default reading state.

## Viewport and normalization

- Source pixels: 1007 × 1202.
- Implementation desktop screenshot pixels and CSS viewport: 1280 × 720.
- Browser-reported device pixel ratio: 2; the in-app screenshot was normalized to CSS pixel dimensions.
- Mobile screenshot pixels and CSS viewport: 390 × 844.
- The source is an inspiration target rather than the same content/state. For the combined comparison, its top region was scaled to 1280 px wide and top-cropped to 720 px so the two visible above-the-fold regions could be judged at equal output dimensions. No pixel-level fidelity claim is made across the different copy and information architecture.

## Full-view comparison evidence

The combined comparison confirms the intended visual language is retained: warm near-white background, near-black ink, restrained crimson accents, monospaced editorial typography, large empty fields, compact navigation, underlined text links, simple dated lists, and almost no decorative elevation. The implementation intentionally adapts the header into a wider desktop navigation row and gives the opening statement more hierarchy because it must route to five product areas rather than reproduce the starter page.

## Focused-region evidence

- Header and opening block: spacing, restrained iconography, compact red navigation, and left alignment match the source's quiet editorial character.
- Ordinary article: the focused capture confirms a single reading column with a visible right-side article table of contents, Typora-style table, blockquote, code, footnote, heading anchors, and comfortable line length.
- Column article: the focused capture confirms the required left series navigation, center reading column, and independent right article table of contents.
- Mobile: the focused capture confirms the header becomes two rows without hiding navigation, list rows remain readable, and the opening hierarchy does not overflow.

## Required fidelity surfaces

- Fonts and typography: consistent monospaced Latin/UI treatment with readable CJK fallback; bold hierarchy is used sparingly; title, metadata, list, and body sizes remain distinct without introducing a second display language.
- Spacing and layout rhythm: the source's large top and section gaps are preserved. Reading pages use stable column widths; mobile gutters are 14 px per side and no persistent control is clipped.
- Colors and visual tokens: paper, ink, muted gray, divider, crimson accent, and selection colors are centralized as tokens and remain coherent in light and dark themes.
- Image quality and asset fidelity: the cactus mark comes from the selected Phosphor icon family; thought imagery uses full-resolution source photography with correct cropping; the generated social card matches the finished palette and contains the requested text without visible misspelling.
- Copy and content: all product-specific copy is coherent in Chinese. The home, post, thought, column, and about surfaces communicate distinct purposes without leaking implementation instructions, except for the deliberately explicit preview note in the local comment adapter.

## Interaction and runtime checks

- Tested fuzzy search from opening the dialog through a Chinese body-text query and verified one correct result.
- Tested article navigation, visible right-side table of contents, comment form submission, and persisted comment display.
- Tested column left series navigation and visible right-side table of contents.
- Tested GitHub profile fallback when the public API is rate-limited.
- Tested the RSS route and confirmed `application/rss+xml` output with article and column entries.
- Checked the clean validation tabs for browser console warnings and errors: none.

## Comparison history

1. First reading-page pass found a P2 layout risk: at the reference-width desktop breakpoint, the article and right TOC competed for horizontal space. The article track, TOC track, and gap were reduced; the revised capture shows a complete, readable TOC.
2. First column pass found a P2 responsive mismatch: the right TOC was hidden at 1008 px. The intermediate grid now uses three narrower tracks through 901 px; the revised capture shows both side navigations together.
3. Mobile pass found no remaining P0/P1/P2 issue. Header navigation, list rows, and content hierarchy remain readable at 390 × 844.

## Findings

No actionable P0, P1, or P2 mismatch remains for the requested "similar style" target and expanded product scope.

## Follow-up polish

- P3: once a final public domain is chosen, replace the placeholder metadata base and connect the production comment/Webmention providers.

## 2026-07-25 content and home-list revision

- Revision source: `/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-675d2c6b-0e5d-4035-ac63-64ff551b6c00.png`
- Revised browser capture: `/Users/hedon/Documents/blog/implementation-home-reference-state.png`
- Combined comparison: `/Users/hedon/Documents/blog/design-comparison-home-v2.png`
- The comparison uses the same 1065 × 837 viewport and the same scrolled home-list state.
- The `01`–`04` labels are absent. “置顶博文”“最近博文”“最近随想”“主题专栏” now share the same crimson heading treatment.
- Pinned and recent article rows now share the same 67 px row height, date/title/topic hierarchy, divider treatment, and arrow alignment.
- Supporting browser checks passed for: full-color GitHub avatar (`filter: none`), 12 px article TOC, four covered posts, two KaTeX display blocks, two rendered Mermaid SVGs, one mixed thought containing three images plus audio/video/link, and a 390 px layout without horizontal overflow.
- No browser console errors were recorded in the revised routes.
- No remaining P0, P1, or P2 issue was found.

## 2026-07-25 compact blog archive revision

- Revision source: `/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-608a54c0-f6ae-4c90-a6c9-b866bcd48389.png`
- Revised browser capture: `/Users/hedon/Documents/blog/implementation-blog-compact-state.png`
- Combined comparison: `/Users/hedon/Documents/blog/design-comparison-blog-compact.png`
- The comparison normalizes the source's 1288 × 862 screenshot to its 644 × 431 CSS viewport and captures the same filtered-list state.
- The old stacked card exposed roughly one article per viewport. The revised 92 px mobile rows expose four article entries in the same viewport while retaining a readable thumbnail, date, topic, title, summary, pin state, and navigation arrow.
- All five sample posts now have covers. At the narrow breakpoint thumbnails render at 96 × 68 px; at desktop they render at 128 × 84 px.
- Browser checks confirm that titles remain to the right of covers, all five rows have equal height, no horizontal overflow occurs at 644 px or 1200 px, and no console errors are present.
- No remaining P0, P1, or P2 issue was found.

## 2026-07-25 article cover hierarchy revision

- Revision source: `/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-3e7880b0-c18a-44b4-acd9-9263dab538f1.png`
- Revised browser capture: `/Users/hedon/Documents/blog/implementation-article-cover-top-matched.png`
- Combined comparison: `/Users/hedon/Documents/blog/design-comparison-article-cover-top.png`
- The comparison uses the same 1500 × 1069 viewport for both the source and implementation.
- The article sequence is now “返回博文 → 封面 → 主题、标题与元信息 → 正文”, so the cover establishes the article's visual entry before its text hierarchy.
- The right-side article table of contents begins alongside the title block rather than the cover, preserving a clear relationship between the title and its navigation.
- Browser measurements confirm the cover precedes the article header, the title and table of contents are vertically aligned, and no horizontal overflow is present.
- No remaining P0, P1, or P2 issue was found.

## 2026-07-25 search highlighting and Markdown showcase revision

- Search source visual truth: `/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-3b17473e-bcce-4564-9de0-67a9370f38a7.png`
- Search implementation capture: `/Users/hedon/Documents/blog/implementation-search-highlight.png`
- Combined search comparison: `/Users/hedon/Documents/blog/design-comparison-search-highlight.png`
- Supporting feature captures:
  - `/Users/hedon/Documents/blog/implementation-mermaid-themes.png`
  - `/Users/hedon/Documents/blog/implementation-code-highlights.png`
- The 724 × 331 source was normalized to the implementation's 723 × 330 CSS viewport at device scale factor 1. Both sides show the light-theme search dialog with the query “文章” and two results.
- Full-view comparison confirms the 640 px panel width, 33 px top inset, restrained border and shadow, compact result density, topic/title/summary hierarchy, and dimmed backdrop remain consistent with the source.
- Focused search evidence confirms exactly two visible `mark` elements for the two actual “文章” matches. A body-only match now replaces the generic description with a contextual excerpt so the reason for the result is visible.
- Typography, spacing, colors, iconography, and copy retain the Garden design tokens. The match treatment uses the existing selection token rather than introducing a competing accent.
- Mermaid now renders two live SVG diagrams. Each diagram independently switches among classic, neutral, forest, and dark themes; the verified forest-theme selection re-rendered without losing the second diagram.
- The Markdown article contains seven labeled highlighted code blocks covering TypeScript, Python, Rust, Go, SQL, Swift, and Diff. Keyword, type, string, comment, number, function, and metadata colors remain legible against the shared dark code surface.
- Desktop and 390 px mobile checks found no horizontal page overflow. Mobile search returned one contextual “Rust” result with one visible match mark.
- A fresh browser tab confirmed two Mermaid SVGs, seven highlighted code blocks, and no console errors after rendering completed.
- No remaining P0, P1, or P2 issue was found.

## 2026-07-25 Mermaid render and code revision

- Page-structure reference: `/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-6a177901-9e7e-4b78-b74a-ea3c07225c59.png`
- Previous component state: `/Users/hedon/Documents/blog/implementation-mermaid-themes.png`
- Revised render state: `/Users/hedon/Documents/blog/implementation-mermaid-render-mode.png`
- Revised code state: `/Users/hedon/Documents/blog/implementation-mermaid-code-mode.png`
- Previous-to-revised comparison: `/Users/hedon/Documents/blog/design-comparison-mermaid-view-switcher.png`
- Two-mode implementation evidence: `/Users/hedon/Documents/blog/implementation-mermaid-two-modes.png`
- Component captures use a 1200 × 900 CSS viewport at device scale factor 1 in the light theme. The focused state places the Mermaid section at the top of the viewport with the article TOC visible.
- The page-structure reference confirms that cover, title/body column, and right TOC remain separate hierarchy regions. This revision changes only the Mermaid component and introduces no page-level layout drift.
- The old four-theme picker is absent. Both diagrams are fixed to Mermaid's neutral theme and default to the rendered SVG view.
- Each diagram now exposes only two compact tabs, “图表” and “Code”. Switching the first diagram to Code reveals its exact fenced-source text while the second diagram remains rendered, confirming independent state.
- Typography, spacing, borders, and active states reuse the existing code-block and editorial tokens. The Code panel preserves the same component footprint and scrolls internally when its source is wider than the viewport.
- At 390 × 844, the component is 362 px wide, the two-tab switcher is 77 px wide, the page has no horizontal overflow, and Code remains independently scrollable.
- Browser checks confirmed two neutral-theme diagrams, two independent switchers, zero theme pickers, successful render-to-code-to-render transitions, and no console errors.
- No remaining P0, P1, or P2 issue was found.

final result: passed

## 2026-07-25 宽幅博文详情页修订

- 来源视觉：`/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-edc26c8e-259d-44bc-b448-9dc986b67945.png`
- 实现截图：`/tmp/hedon-article-layout-1485.png`
- 对比图：`/tmp/hedon-article-layout-comparison.png`
- 视口：1485 × 1177 CSS px，桌面浅色主题，文章 `/blog/markdown-lab`。
- 像素与密度：参考图 1485 × 1178 px；实现图 1485 × 1177 px；按 1× 密度逐像素宽度对齐。
- 运行检查：文章标题正常显示，主栏 1051 px、目录 270 px；浏览器控制台无错误。
- [P1 已修复] 详情页两侧留白过大，封面和正文被压缩在窄栏内。文章首屏与正文主栏改为流式宽栏，仅保留固定宽度的右侧目录；封面、标题和正文沿同一主栏对齐。
- 字体与层级、颜色令牌、封面比例和文章内容均沿用现有设计；标题在加宽后不再过早换行。
- 没有遗留可操作的 P0/P1/P2 视觉问题。

final result: passed

## 2026-07-25 博文详情三段式布局修订

- 来源视觉：`/var/folders/44/6xx0crn15lxg4fp3zhv2lf740000gn/T/codex-clipboard-c11a5a64-920e-4335-acc9-c8cf5e942547.png`
- 实现首屏：`/tmp/hedon-article-three-row-top.png`
- 正文与目录检查：`/tmp/hedon-article-three-row-body-toc.png`
- 合并对比：`/tmp/hedon-article-three-row-comparison.png`
- 视口：1485 × 1177 CSS px，桌面浅色主题，文章 `/blog/markdown-lab`。
- [P1 已修复] 封面不再嵌入正文主栏：它现在独占文章容器的第一整行；下方是独立的主题、标题、副标题与「发布于 / 阅读时长 / 字数」信息行；再下方正文与右侧目录以同一顶部基线开始。
- 外层桌面留白为两侧各 64 px，较上一版略增但不会重新压缩正文；目录固定为 250 px，正文保持可读的宽栏。
- 视觉对比与首屏检查确认：封面、标题信息、正文三层层级清晰；正文和目录均从同一阅读区开始；没有水平溢出或可操作的 P0/P1/P2 问题。

final result: passed
