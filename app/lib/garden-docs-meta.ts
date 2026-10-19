export type GardenDocNavItem = {
  path: string;
  title: string;
  description?: string;
  section?: string;
  order?: number;
};

export type HandbookSectionMeta = {
  id: string;
  title: string;
  note?: string;
};

export const HANDBOOK_SECTIONS: HandbookSectionMeta[] = [
  { id: "getting-started", title: "快速上手", note: "建站、配置与发布" },
  { id: "writing-and-reading", title: "写作与排版", note: "Markdown 与阅读版面" },
  { id: "components", title: "内置组件", note: "```garden <name>" },
  { id: "workflow", title: "检查与补全", note: "语法检查与编辑器片段" },
];

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
};

export const NAV_SHORT_TITLE: Record<string, string> = {
  start: "快速开始",
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
  workflow: "语法检查与快捷输入",
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
  }));
}
