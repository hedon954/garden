export type GardenDocNavItem = {
  path: string;
  title: string;
  description?: string;
  section?: string;
  order?: number;
  navTitle?: string;
};

export type HandbookLang = "zh" | "en";

export type HandbookSectionMeta = {
  id: string;
  title: string;
  /** English sidebar group heading; falls back to the Chinese one until translated. */
  titleEn?: string;
};

/** Where each language of the handbook lives. English mirrors the Chinese paths. */
export const handbookBase = (lang: HandbookLang) => (lang === "en" ? "/garden/en" : "/garden");
export const handbookPath = (lang: HandbookLang, docPath = "") =>
  docPath && docPath !== "index" ? `${handbookBase(lang)}/${docPath}` : handbookBase(lang);
export const sectionTitle = (section: HandbookSectionMeta | undefined, lang: HandbookLang) =>
  section ? (lang === "en" ? section.titleEn ?? section.title : section.title) : undefined;
/** The handbook remembers the reader's choice under this localStorage key. */
export const HANDBOOK_LANG_KEY = "garden-handbook-lang";

/** Handbook chrome labels. Page text lives in docs/handbook and docs/handbook/en. */
export const HANDBOOK_UI = {
  zh: {
    name: "Garden 使用说明",
    overview: "总览",
    overviewHint: "总览与快速入口",
    guide: "指南",
    pager: "说明书上下篇导航",
    prev: "上一篇",
    next: "下一篇",
    backToOverview: "返回总览",
    overviewDocTitle: "Garden 使用说明首页",
    toc: "本页目录",
    sidebar: "Garden 使用说明目录",
    chapters: "章节导航",
    closeSidebar: "关闭说明目录",
    openSidebar: "打开说明目录",
    sidebarShort: "说明目录",
    mobileBar: "说明书目录栏",
  },
  en: {
    name: "Garden Handbook",
    overview: "Overview",
    overviewHint: "Overview and quick links",
    guide: "Guide",
    pager: "Handbook pages",
    prev: "Previous",
    next: "Next",
    backToOverview: "Back to overview",
    overviewDocTitle: "Garden Handbook home",
    toc: "On this page",
    sidebar: "Garden Handbook contents",
    chapters: "Chapters",
    closeSidebar: "Close contents",
    openSidebar: "Open contents",
    sidebarShort: "Contents",
    mobileBar: "Handbook contents bar",
  },
} as const;

export const HANDBOOK_SECTIONS: HandbookSectionMeta[] = [
  { id: "getting-started", title: "快速上手", titleEn: "Getting Started" },
  { id: "writing-and-reading", title: "写作与排版", titleEn: "Writing & Layout" },
  { id: "components", title: "内置组件", titleEn: "Built-in Components" },
  { id: "workflow", title: "检查与补全", titleEn: "Checks & Shortcuts" },
  { id: "reference", title: "组件参考", titleEn: "Component reference" },
];

/** Component reference pages: one per component, all fields and error codes. */
export const REFERENCE_SECTION = "reference";
export const isReferencePath = (docPath: string) => docPath === REFERENCE_SECTION || docPath.startsWith(`${REFERENCE_SECTION}/`);

export const COMPONENT_BADGE: Record<string, string> = {
  "components/card": "card",
  "components/stat": "stat",
  "components/compare": "compare",
  "components/timeline": "timeline",
  "components/chart": "chart",
  "components/figure": "figure",
  "components/html": "html",
  "components/interactive": "interactive",
  "components/file": "file",
  "components/relations": "relations",
  "components/list": "list",
  "components/choice": "choice",
  "reference/card": "card",
  "reference/stat": "stat",
  "reference/compare": "compare",
  "reference/timeline": "timeline",
  "reference/chart": "chart",
  "reference/figure": "figure",
  "reference/html": "html",
  "reference/interactive": "interactive",
  "reference/file": "file",
  "reference/relations": "relations",
  "reference/list": "list",
  "reference/choice": "choice",
};

export const NAV_SHORT_TITLE: Record<string, string> = {
  start: "快速开始",
  "ai-writing": "用 AI 写作",
  config: "站点与专栏配置",
  deploy: "发布到 GitHub Pages",
  writing: "写文章与随想",
  design: "阅读排版是怎么工作的",
  components: "组件总览",
  "components/card": "知识卡片",
  "components/stat": "数字指标",
  "components/compare": "并排对比",
  "components/timeline": "时间线",
  "components/chart": "条形图表",
  "components/figure": "分区结构图",
  "components/html": "嵌入网页片段",
  "components/interactive": "可调公式与参数",
  "components/file": "文件下载与预览",
  "components/relations": "关系图",
  "components/list": "图标列表",
  "components/choice": "选择卡",
  workflow: "语法检查与快捷输入",
  reference: "总览",
};

export function groupHandbookDocs<T extends GardenDocNavItem>(docs: T[]) {
  const bySection = new Map<string, T[]>();
  for (const section of HANDBOOK_SECTIONS) {
    bySection.set(section.id, []);
  }
  for (const doc of docs) {
    const key = doc.section && bySection.has(doc.section) ? doc.section : "getting-started";
    bySection.get(key)!.push(doc);
  }
  for (const list of bySection.values()) {
    list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.path.localeCompare(b.path));
  }
  return HANDBOOK_SECTIONS.map((section) => ({
    ...section,
    items: bySection.get(section.id) ?? [],
  })).filter((section) => section.items.length > 0);
}

export function orderedHandbookDocs<T extends GardenDocNavItem>(docs: T[]): T[] {
  return groupHandbookDocs(docs).flatMap((section) => section.items);
}

export function toHandbookNavItems(docs: GardenDocNavItem[]): GardenDocNavItem[] {
  return orderedHandbookDocs(docs).map((doc) => ({
    path: doc.path,
    title: doc.title,
    description: doc.description,
    section: doc.section,
    order: doc.order,
    ...(doc.navTitle ? { navTitle: doc.navTitle } : {}),
  }));
}
