"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Chrome strings of the interactive runtime (buttons, screen-reader labels,
 * error notes). Authors' own labels come from the block. The host picks the
 * language: the site language, or the handbook route language on /garden/.
 */
export type RuntimeLang = "zh" | "en";

const zh = {
  unknownComponent: (name: string) => `预览需要更新 Garden 插件（不认识 <${name}>）`,
  errorTitle: "这块交互有错误",
  lineN: (n: number) => `第 ${n} 行`,
  missingCaption: "（缺少 caption）",
  idea: "想法",
  uncompiled: "未编译",
  copyCompilePrompt: "复制编译提示词",
  ideaNote: "编译后这里会变成可交互的组件。",
  interactive: "交互",
  tapNumbers: "点图上的序号看说明。",
  mermaidFailed: "图没能画出来（语法有误，或这里没有 Mermaid）。下面是源码。",
  drawing: "正在绘制图…",
  highlighted: (items: string[]) => `当前高亮：${items.join("、")}`,
  prevStep: "上一步",
  nextStep: "下一步",
  stepN: (n: number, title: string) => `第 ${n} 步：${title}`,
  pause: "暂停",
  play: "播放",
  badSlider: (label: string) => `滑杆 ${label} 的范围无效`,
  decrease: "减少",
  increase: "增加",
  over: (v: string) => ` 超出 ${v}`,
  rowN: (n: number) => `第 ${n} 行`,
  tapCell: "点一格看说明。",
  cellNote: (row: string, col: string, text: string) => `${row} · ${col}：${text}`,
  cellAria: (row: string, col: string, val: string, tone: string) => `${row} ${col}：${val}${tone ? `，${tone}` : ""}`,
  seriesTooltip: (label: string) => `${label}：`,
  seriesN: (n: number) => `系列 ${n}`,
  badChart: "图表缺少有效的范围或数据",
  chart: "图表",
  chartKeys: (label: string) => `${label}，左右方向键查看各点`,
  donut: "圆环图",
};

const en: typeof zh = {
  unknownComponent: (name: string) => `This preview needs a newer Garden plugin (unknown <${name}>)`,
  errorTitle: "This interactive block has errors",
  lineN: (n: number) => `Line ${n}`,
  missingCaption: "(missing caption)",
  idea: "Idea",
  uncompiled: "Not compiled",
  copyCompilePrompt: "Copy compile prompt",
  ideaNote: "Once compiled, an interactive component appears here.",
  interactive: "Interactive",
  tapNumbers: "Tap a number on the figure for its note.",
  mermaidFailed: "The diagram could not be drawn (a syntax error, or Mermaid is not available here). The source is below.",
  drawing: "Drawing the diagram…",
  highlighted: (items: string[]) => `Highlighted: ${items.join(", ")}`,
  prevStep: "Previous step",
  nextStep: "Next step",
  stepN: (n: number, title: string) => `Step ${n}: ${title}`,
  pause: "Pause",
  play: "Play",
  badSlider: (label: string) => `Slider ${label} has an invalid range`,
  decrease: "Decrease",
  increase: "Increase",
  over: (v: string) => ` ${v} over`,
  rowN: (n: number) => `Row ${n}`,
  tapCell: "Tap a cell for its note.",
  cellNote: (row: string, col: string, text: string) => `${row} · ${col}: ${text}`,
  cellAria: (row: string, col: string, val: string, tone: string) => `${row} ${col}: ${val}${tone ? `, ${tone}` : ""}`,
  seriesTooltip: (label: string) => `${label}: `,
  seriesN: (n: number) => `Series ${n}`,
  badChart: "The chart has no valid range or data",
  chart: "Chart",
  chartKeys: (label: string) => `${label}, use the left and right arrow keys to read each point`,
  donut: "Donut chart",
};

export const RUNTIME_STRINGS = { zh, en } as const;
const RuntimeLangContext = createContext<RuntimeLang>("zh");

export function RuntimeLangProvider({ lang, children }: { lang: RuntimeLang; children: ReactNode }) {
  return <RuntimeLangContext.Provider value={lang}>{children}</RuntimeLangContext.Provider>;
}

export const useRuntimeText = () => RUNTIME_STRINGS[useContext(RuntimeLangContext)];
