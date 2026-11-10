/** Largest real-font size that fits, or a readable minimum followed by wrapping. */
export function fitTitleSize({ width, minimum, maximum, measure }) {
  if (!(width > 0 && minimum > 0 && maximum >= minimum)) return maximum;
  if (measure(maximum) <= width) return maximum;
  if (measure(minimum) > width) return minimum;
  let low = minimum, high = maximum;
  for (let i = 0; i < 12; i++) {
    const middle = (low + high) / 2;
    if (measure(middle) <= width) low = middle;
    else high = middle;
  }
  return Math.max(minimum, Math.floor(low * 64) / 64);
}

/** Browser-only: inline boot and layout effect. CSSOM leaves SSR markup intact. */
export function mountFeatureTitle(root, chooseSize = fitTitleSize) {
  if (!root) return;
  const key = Symbol.for('garden.feature-title-fit');
  if (root[key]) { root[key].refresh(); return root[key].dispose; }
  const heading = root.querySelector('[data-feature-title]');
  const sheet = root.querySelector('style[data-feature-title-rules]')?.sheet;
  if (!heading?.id || !sheet || !window.ResizeObserver || !window.CSS?.escape) return;
  const index = sheet.insertRule(`#${CSS.escape(heading.id)}[data-feature-title]{}`, sheet.cssRules.length);
  const rule = sheet.cssRules[index].style;
  let frame = 0, disposed = false, signature = '', previous, readingFloor = 0;
  const fit = () => {
    if (disposed || !heading.isConnected) return;
    const prior = rule.fontSize;
    rule.removeProperty('font-size');
    const style = getComputedStyle(heading), parent = getComputedStyle(root);
    const summary = root.querySelector('[data-feature-summary]');
    const body = parseFloat(getComputedStyle(summary || root).fontSize);
    const parentSize = parseFloat(parent.fontSize), rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const dpr = window.devicePixelRatio, scale = window.visualViewport?.scale || 1;
    const width = heading.getBoundingClientRect().width;
    const text = heading.textContent;
    const state = { text, parentSize, rootSize, body, dpr, scale };
    if (previous?.text !== text) readingFloor = 0;
    if (previous?.text === text) {
      // VisualViewport floats can jitter during initial mobile layout. Only an
      // actual scale/font increase should preserve the reader's chosen size.
      if (dpr < previous.dpr-.001 || scale < previous.scale-.001 || body < previous.body-.01 || rootSize < previous.rootSize-.01) readingFloor = 0;
      if (dpr > previous.dpr+.001 || scale > previous.scale+.001 || body > previous.body+.01 || rootSize > previous.rootSize+.01) {
        const rootGrowth = Math.max(1, rootSize / previous.rootSize);
        readingFloor = Math.max(readingFloor, previous.size * rootGrowth / parentSize, previous.size / previous.parentSize);
      }
    }
    const minimum = Math.max(body * 1.125, readingFloor * parentSize);
    const maximum = Math.max(parseFloat(style.fontSize), minimum);
    const nextSignature = JSON.stringify([heading.textContent,width,body,parentSize,rootSize,minimum,maximum,
      style.fontFamily,style.fontWeight,style.fontStyle,style.fontStretch,style.letterSpacing,style.fontFeatureSettings,
      style.fontVariationSettings,style.fontSizeAdjust,style.fontKerning,style.wordSpacing,style.fontOpticalSizing,style.textTransform,dpr,scale]);
    if (!(width > 0 && parentSize > 0 && body > 0) || nextSignature === signature) {
      if (prior) rule.fontSize = prior;
      return;
    }
    const probe = document.createElement('span');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;white-space:nowrap;width:max-content;max-width:none;inset:0 auto auto 0;';
    for (const property of ['font','fontKerning','fontFeatureSettings','fontVariationSettings','fontStretch','fontSizeAdjust','fontOpticalSizing','letterSpacing','wordSpacing','textTransform','direction']) probe.style[property] = style[property];
    probe.textContent = heading.textContent;
    root.append(probe);
    let size;
    try {
      size = chooseSize({ width: Math.max(0,width-.5), minimum, maximum,
        measure(value) { probe.style.fontSize = `${value}px`; return probe.getBoundingClientRect().width; } });
    } finally { probe.remove(); }
    rule.fontSize = `${size / parentSize}em`;
    signature = nextSignature;
    previous = { ...state, size };
  };
  const refresh = () => { if (!disposed && !frame) frame = requestAnimationFrame(() => { frame = 0; fit(); }); };
  fit();
  const resize = new ResizeObserver(refresh);
  resize.observe(root);
  const mutations = new MutationObserver(refresh);
  mutations.observe(heading, { childList: true, subtree: true, characterData: true });
  for (const element of [document.documentElement, document.body]) mutations.observe(element, { attributes:true, attributeFilter:['class','style','lang','data-theme'] });
  window.addEventListener('resize',refresh);
  window.visualViewport?.addEventListener('resize',refresh);
  const fontsChanged = () => { signature = ''; refresh(); };
  document.fonts?.addEventListener('loadingdone',fontsChanged);
  document.fonts?.ready.then(fontsChanged);
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect(); mutations.disconnect();
    window.removeEventListener('resize',refresh);
    window.visualViewport?.removeEventListener('resize',refresh);
    document.fonts?.removeEventListener('loadingdone',fontsChanged);
    if (sheet.cssRules[index]?.style === rule) sheet.deleteRule(index);
    delete root[key];
  };
  root[key] = { refresh, dispose };
  return dispose;
}
