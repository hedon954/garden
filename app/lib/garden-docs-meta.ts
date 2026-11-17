export type GardenDocNavItem = {
  path: string;
  title: string;
  description?: string;
  section?: string;
  order?: number;
  navTitle?: string;
  navIcon?: string;
};

export type HandbookLang = "zh" | "en";

export type HandbookSectionMeta = {
  id: string;
  overviewPath: string;
  title: string;
  /** English sidebar group heading; falls back to the Chinese one until translated. */
  titleEn?: string;
};

/**
 * In-app paths inside the standalone documentation site (`basePath = "/garden"`).
 * Next.js `<Link>` prepends `/garden` automatically, so `"/"` renders `/garden/`,
 * `"/guide/quick-start"` renders `/garden/guide/quick-start/`, and `"/en"` renders `/garden/en/`.
 */
export const handbookBase = (lang: HandbookLang) => (lang === "en" ? "/en" : "/");
export const handbookPath = (lang: HandbookLang, docPath = "") => {
  const clean = docPath.replace(/^\/+|\/+$/gu, "");
  if (!clean || clean === "index") return handbookBase(lang);
  return lang === "en" ? `/en/${clean}` : `/${clean}`;
};
export const sectionTitle = (section: HandbookSectionMeta | undefined, lang: HandbookLang) =>
  section ? (lang === "en" ? section.titleEn ?? section.title : section.title) : undefined;

/** The handbook remembers the reader's choice under this localStorage key. */
export const HANDBOOK_LANG_KEY = "garden-handbook-lang";

/** Handbook chrome labels. Page text lives in docs/handbook and docs/handbook/en. */
export const HANDBOOK_UI = {
  zh: {
    name: "Garden 用户手册",
    overview: "总览",
    overviewHint: "框架全景与快速导览",
    guide: "指南",
    pager: "手册上下篇导航",
    prev: "上一篇",
    next: "下一篇",
    backToOverview: "返回首页",
    overviewDocTitle: "Garden 用户手册首页",
    toc: "本页目录",
    sidebar: "Garden 用户手册目录",
    chapters: "章节导航",
    closeSidebar: "关闭手册目录",
    openSidebar: "打开手册目录",
    sidebarShort: "手册目录",
    mobileBar: "手册目录栏",
    expandSubnav: "展开子目录",
    collapseSubnav: "收起子目录",
  },
  en: {
    name: "Garden Handbook",
    overview: "Overview",
    overviewHint: "Framework overview & quick links",
    guide: "Guide",
    pager: "Handbook pages",
    prev: "Previous",
    next: "Next",
    backToOverview: "Back to home",
    overviewDocTitle: "Garden Handbook home",
    toc: "On this page",
    sidebar: "Garden Handbook contents",
    chapters: "Chapters",
    closeSidebar: "Close contents",
    openSidebar: "Open contents",
    sidebarShort: "Contents",
    mobileBar: "Handbook contents bar",
    expandSubnav: "Expand section",
    collapseSubnav: "Collapse section",
  },
} as const;

/**
 * Five stable top-level sections. Their order NEVER mutates across routes.
 * Every section heading is itself a clickable overview page (`overviewPath`).
 */
export const HANDBOOK_SECTIONS: HandbookSectionMeta[] = [
  { id: "guide", overviewPath: "guide", title: "使用指南", titleEn: "User Guide" },
  { id: "design", overviewPath: "design", title: "框架设计", titleEn: "Framework Design" },
  { id: "components", overviewPath: "components", title: "内置组件", titleEn: "Built-in Components" },
  { id: "scripts", overviewPath: "scripts", title: "常用脚本", titleEn: "Scripts & Tooling" },
  { id: "extensions", overviewPath: "extensions", title: "扩展插件", titleEn: "Extensions" },
];

export const REFERENCE_SECTION = "reference";
export const isReferencePath = (docPath: string) =>
  docPath === REFERENCE_SECTION || docPath.startsWith(`${REFERENCE_SECTION}/`);

export const COMPONENT_BADGE: Record<string, string> = {};

export const NAV_SHORT_TITLE: Record<string, string> = {
  "guide/quick-start": "快速上手",
  "guide/ai-collaboration": "AI 协作",
  "guide/tutorial": "详细教程",
  "guide/admin": "管理后台",
  "design/principles": "设计原则",
  "design/references": "实现参考",
  "design/internals": "底层原理",
  "components/link-card": "链接卡片",
  "components/media": "图片视频",
  "components/source": "来源胶囊",
  "components/file-embed": "文件内嵌",
  "components/intelligent-ui": "智能 UI",
  "scripts/makefile": "Makefile",
  "scripts/cli": "scripts",
  "scripts/ai-kit": "skills/AGENTS.md",
  "extensions/typora": "typora",
  "extensions/vscode": "vscode",
};

export function referenceBadgeSuffix(badge: string, label: string): string | null {
  if (!badge || !label || label === badge) return null;
  if (!label.startsWith(badge)) return null;
  const rest = label.slice(badge.length);
  if (!rest || !/^[\s·\-—]/u.test(rest)) return null;
  return rest;
}

/** Sidebar text label: prefer authored navTitle; ZH may fall back to NAV_SHORT_TITLE. */
export function handbookNavLabel(item: GardenDocNavItem, lang: HandbookLang): string {
  if (item.navTitle) return item.navTitle;
  if (lang !== "en") {
    const short = NAV_SHORT_TITLE[item.path];
    if (short) return short;
  }
  return item.title;
}

function normalizeSectionId(section?: string): string {
  if (!section) return "guide";
  if (section === "diagrams") return "components";
  if (HANDBOOK_SECTIONS.some((item) => item.id === section)) return section;
  return "guide";
}

/**
 * Groups docs into the 5 fixed sections without ever reordering sections.
 * Each section holds:
 * - `overviewDoc`: the clickable section overview page (`path === section.overviewPath`), if authored.
 * - `items`: direct sidebar child pages. Diagram recipes are not siblings here.
 * - `diagramSubpages`: the figure catalog and all 21 recipes, shown nested under 智能 UI.
 * - `allDocs`: all pages in reading order (overview first, then child pages, then diagram detail subpages).
 */
export function groupHandbookDocs<T extends GardenDocNavItem>(docs: T[]) {
  const bySection = new Map<string, T[]>();
  for (const section of HANDBOOK_SECTIONS) {
    bySection.set(section.id, []);
  }
  for (const doc of docs) {
    const key = normalizeSectionId(doc.section);
    bySection.get(key)!.push(doc);
  }
  for (const list of bySection.values()) {
    list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.path.localeCompare(b.path));
  }
  return HANDBOOK_SECTIONS.map((section) => {
    const all = bySection.get(section.id) ?? [];
    const overviewDoc = all.find((doc) => doc.path === section.overviewPath) ?? null;
    const rest = all.filter((doc) => doc.path !== section.overviewPath);
    const items = rest.filter(
      (doc) => doc.section !== "diagrams" && !doc.path.startsWith("components/diagrams/"),
    );
    const diagramSubpages = rest.filter(
      (doc) => doc.section === "diagrams" || doc.path.startsWith("components/diagrams/"),
    );
    const allDocs = [
      ...(overviewDoc ? [overviewDoc] : []),
      ...items,
      ...diagramSubpages,
    ];
    return {
      ...section,
      overviewDoc,
      items,
      diagramSubpages,
      allDocs,
    };
  }).filter((section) => section.overviewDoc !== null || section.items.length > 0);
}

export function orderedHandbookDocs<T extends GardenDocNavItem>(docs: T[]): T[] {
  return groupHandbookDocs(docs).flatMap((section) => section.allDocs);
}

export function toHandbookNavItems(docs: GardenDocNavItem[]): GardenDocNavItem[] {
  return orderedHandbookDocs(docs).map((doc) => ({
    path: doc.path,
    title: doc.title,
    description: doc.description,
    section: doc.section,
    order: doc.order,
    ...(doc.navTitle ? { navTitle: doc.navTitle } : {}),
    ...(doc.navIcon ? { navIcon: doc.navIcon } : {}),
  }));
}
