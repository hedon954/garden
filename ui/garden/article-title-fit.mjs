import { fitTitleSize } from "./feature-title-fit.mjs";

/** Fit a split article H1 so the remaining title prefers one second line. */
export function mountArticleTitle(root, chooseSize = fitTitleSize) {
  if (!root) return;
  const key = Symbol.for("garden.article-title-fit");
  if (root[key]) { root[key].refresh(); return root[key].dispose; }
  const heading = root.querySelector("h1.h1-br");
  const lines = heading ? [...heading.querySelectorAll(".h1-line")] : [];
  const sheet = root.querySelector("style[data-article-title-rules]")?.sheet;
  if (!heading?.id || lines.length < 2 || !sheet || !window.ResizeObserver || !window.CSS?.escape) return;
  const index = sheet.insertRule(`#${CSS.escape(heading.id)}.h1-br{}`, sheet.cssRules.length);
  const rule = sheet.cssRules[index].style;
  let frame = 0, disposed = false, signature = "", previous, readingFloor = 0;
  const widest = (probe) => Math.max(...lines.map((line) => {
    probe.textContent = line.textContent;
    return probe.getBoundingClientRect().width;
  }));
  const fit = () => {
    if (disposed || !heading.isConnected) return;
    const priorSize = rule.fontSize, priorWrap = rule.whiteSpace;
    rule.removeProperty("font-size");
    rule.removeProperty("white-space");
    const style = getComputedStyle(heading);
    const parent = heading.parentElement || root;
    const parentSize = parseFloat(getComputedStyle(parent).fontSize);
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const article = heading.closest("article");
    const bodyNode = article?.querySelector(".markdown-body") || article || document.documentElement;
    const body = parseFloat(getComputedStyle(bodyNode).fontSize);
    const dpr = window.devicePixelRatio, scale = window.visualViewport?.scale || 1;
    const width = heading.getBoundingClientRect().width;
    const text = lines.map((line) => line.textContent).join("\n");
    const state = { text, parentSize, rootSize, body, dpr, scale };
    if (previous?.text !== text) readingFloor = 0;
    if (previous?.text === text) {
      if (dpr < previous.dpr - .001 || scale < previous.scale - .001 || body < previous.body - .01 || rootSize < previous.rootSize - .01) readingFloor = 0;
      if (dpr > previous.dpr + .001 || scale > previous.scale + .001 || body > previous.body + .01 || rootSize > previous.rootSize + .01) {
        const rootGrowth = Math.max(1, rootSize / previous.rootSize);
        readingFloor = Math.max(readingFloor, previous.size * rootGrowth / parentSize, previous.size / previous.parentSize);
      }
    }
    const minimum = Math.max(body * 1.125, readingFloor * parentSize);
    const maximum = Math.max(parseFloat(style.fontSize), minimum);
    const nextSignature = JSON.stringify([text, width, body, parentSize, rootSize, minimum, maximum,
      style.fontFamily, style.fontWeight, style.fontStyle, style.fontStretch, style.letterSpacing, style.fontFeatureSettings,
      style.fontVariationSettings, style.fontSizeAdjust, style.fontKerning, style.wordSpacing, style.fontOpticalSizing, style.textTransform, dpr, scale]);
    if (!(width > 0 && parentSize > 0 && body > 0) || nextSignature === signature) {
      if (priorSize) rule.fontSize = priorSize;
      if (priorWrap) rule.whiteSpace = priorWrap;
      return;
    }
    const probe = document.createElement("span");
    probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;white-space:nowrap;width:max-content;max-width:none;inset:0 auto auto 0;";
    for (const property of ["font", "fontKerning", "fontFeatureSettings", "fontVariationSettings", "fontStretch", "fontSizeAdjust", "fontOpticalSizing", "letterSpacing", "wordSpacing", "textTransform", "direction"]) probe.style[property] = style[property];
    heading.append(probe);
    let size;
    try {
      size = chooseSize({ width: Math.max(0, width - .5), minimum, maximum,
        measure(value) { probe.style.fontSize = `${value}px`; return widest(probe); } });
    } finally { probe.remove(); }
    rule.fontSize = `${size / parentSize}em`;
    const actual = parseFloat(getComputedStyle(heading).fontSize);
    heading.append(probe);
    try {
      probe.style.fontSize = `${actual}px`;
      if (widest(probe) <= Math.max(0, heading.getBoundingClientRect().width - .5)) rule.whiteSpace = "nowrap";
    } finally { probe.remove(); }
    signature = nextSignature;
    previous = { ...state, size };
  };
  const refresh = () => { if (!disposed && !frame) frame = requestAnimationFrame(() => { frame = 0; fit(); }); };
  fit();
  const resize = new ResizeObserver(refresh);
  resize.observe(heading);
  if (heading.parentElement) resize.observe(heading.parentElement);
  const mutations = new MutationObserver(refresh);
  mutations.observe(heading, { childList: true, subtree: true, characterData: true });
  for (const element of [document.documentElement, document.body]) mutations.observe(element, { attributes: true, attributeFilter: ["class", "style", "lang", "data-theme"] });
  window.addEventListener("resize", refresh);
  window.visualViewport?.addEventListener("resize", refresh);
  const fontsChanged = () => { signature = ""; refresh(); };
  document.fonts?.addEventListener("loadingdone", fontsChanged);
  document.fonts?.ready.then(fontsChanged);
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect(); mutations.disconnect();
    window.removeEventListener("resize", refresh);
    window.visualViewport?.removeEventListener("resize", refresh);
    document.fonts?.removeEventListener("loadingdone", fontsChanged);
    if (sheet.cssRules[index]?.style === rule) sheet.deleteRule(index);
    delete root[key];
  };
  root[key] = { refresh, dispose };
  return dispose;
}
