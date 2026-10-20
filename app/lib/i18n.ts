import { siteConfig } from "../site.config";

/**
 * Framework chrome strings. The site language is chosen at build time with
 * `locale` in site.config.yaml (zh_CN, en_US, ...); there is no runtime switch
 * for the blog. The /garden/ handbook is the one bilingual area: its pages pass
 * their own language explicitly.
 */
export type UiLang = "zh" | "en";

export const langOf = (locale: string | undefined): UiLang => (/^en/i.test(locale ?? "") ? "en" : "zh");
export const siteLang: UiLang = langOf(siteConfig.locale);
export const htmlLang = (lang: UiLang) => (lang === "en" ? "en" : "zh-CN");

const zh = {
  toc: "本篇目录",
  tocShort: "目录",
  tocPage: "本页目录",
  open: "打开",
  close: "关闭",
  currentSection: "，当前章节：",
  prev: "上一篇",
  next: "下一篇",
  pagerLabel: "上一篇和下一篇",
  columnPagerLabel: "专栏里的上一篇和下一篇",
  comments: "评论",
  webmentions: "来自开放网络的回应",
  webmentionsLead: "引用、喜欢、转发和站外回复会通过 Webmention 回到这里。",
  notFoundTitle: "找不到这一页",
  notFoundDeck: "地址可能写错了，或者这篇已经不在了。",
  backHome: "返回首页",
  builtWith: ["基于 ", " 构建"],
  search: "搜索",
  searchArticles: "搜索文章",
  toLight: "切换到浅色模式",
  toDark: "切换到深色模式",
  wordCount: (n: number) => `约 ${n.toLocaleString("en-US")} 字`,
  dateLocale: "zh-CN",
  handbook: "Garden 使用说明",
  overview: "总览",
  langSwitch: "切换语言",
};

const en: typeof zh = {
  toc: "Contents",
  tocShort: "Contents",
  tocPage: "On this page",
  open: "Open ",
  close: "Close ",
  currentSection: ", current section: ",
  prev: "Previous",
  next: "Next",
  pagerLabel: "Previous and next post",
  columnPagerLabel: "Previous and next in this column",
  comments: "Comments",
  webmentions: "Responses from the open web",
  webmentionsLead: "Mentions, likes, reposts and replies from other sites arrive here through Webmention.",
  notFoundTitle: "Page not found",
  notFoundDeck: "The address may be wrong, or the page has moved.",
  backHome: "Back to home",
  builtWith: ["Built with ", ""],
  search: "Search",
  searchArticles: "Search posts",
  toLight: "Switch to light mode",
  toDark: "Switch to dark mode",
  wordCount: (n: number) => `${n.toLocaleString("en-US")} words`,
  dateLocale: "en-US",
  handbook: "Garden Handbook",
  overview: "Overview",
  langSwitch: "Switch language",
};

export const UI_STRINGS = { zh, en } as const;
export const ui = (lang: UiLang = siteLang) => UI_STRINGS[lang];
