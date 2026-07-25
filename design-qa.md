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

final result: passed
