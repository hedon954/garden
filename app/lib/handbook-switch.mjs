/** Handbook page language from its path: /garden/en/... is English, the rest of /garden/ is Chinese. */
export const handbookPageLang = (pathname) => (/\/garden\/en(\/|$)/u.test(String(pathname ?? "")) ? "en" : "zh");

/** The 中 / EN switch always offers the other language: Chinese pages offer English, English pages offer Chinese. */
export const handbookSwitchTarget = (pageLang) => (pageLang === "en" ? "zh" : "en");

/** aria-label of the live link. */
export const handbookSwitchLabel = (pageLang) => (handbookSwitchTarget(pageLang) === "en" ? "Read in English" : "Switch to Chinese");

/** Tooltip while there is no counterpart link (built HTML, before hydration). */
export const handbookSwitchTitle = (pageLang, siteLang) =>
  pageLang === "en" ? "No Chinese version of this page yet" : siteLang === "en" ? "No English version of this page yet" : "这一页还没有英文版";
