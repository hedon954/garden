/** Place the Garden Typora picker inside the viewport without patching Typora's global autocomplete. */

export const VIEWPORT_MARGIN = 8;
export const ANCHOR_GAP = 4;
export const TYPORA_AUTO_SUGGEST_ID = "ty-auto-suggest";
export const GARDEN_PICKER_CLASS = "garden-picker-open";
export const TYPORA_LEFT_INSET = 15;
/** Floor that fits a 72px thumb plus a short Chinese name and hint on readable lines. */
export const READABLE_MIN_WIDTH = 360;
export const READABLE_MAX_WIDTH = 480;

/**
 * @typedef {{top:number,right:number,bottom:number,left:number,width:number,height:number}} Rect
 * @param {{anchor:Rect, viewport:Rect, menu:{width:number,height:number}, margin?:number, gap?:number, preferredLeft?:number}} input
 */
export function placePickerMenu({
  anchor,
  viewport,
  menu,
  margin = VIEWPORT_MARGIN,
  gap = ANCHOR_GAP,
  preferredLeft,
}) {
  const maxBelow = Math.max(0, viewport.bottom - margin - (anchor.bottom + gap));
  const maxAbove = Math.max(0, (anchor.top - gap) - (viewport.top + margin));
  let placement = "below";
  if (menu.height <= maxBelow) placement = "below";
  else if (menu.height <= maxAbove) placement = "above";
  else placement = maxAbove > maxBelow ? "above" : "below";

  const maxHeight = Math.min(menu.height, placement === "below" ? maxBelow : maxAbove);
  const width = resolvePickerWidth({
    measuredWidth: menu.width,
    viewportWidth: viewport.width,
    margin,
  });
  let left = preferredLeft ?? anchor.left;
  left = Math.min(left, viewport.right - margin - width);
  left = Math.max(left, viewport.left + margin);
  const top = placement === "below"
    ? anchor.bottom + gap
    : anchor.top - gap - maxHeight;
  return { top, left, width, maxHeight, placement, spaceAbove: maxAbove, spaceBelow: maxBelow };
}

/** Visible viewport in the same CSS-pixel space as getBoundingClientRect. */
export function viewportRect(win = globalThis) {
  const vv = win.visualViewport;
  if (vv && Number.isFinite(vv.width) && vv.width > 0) {
    const left = vv.offsetLeft || 0;
    const top = vv.offsetTop || 0;
    return rect(left, top, vv.width, vv.height);
  }
  const width = Number(win.innerWidth) || 0;
  const height = Number(win.innerHeight) || 0;
  return rect(0, 0, width, height);
}

/**
 * Typora chrome that can cover a position:fixed #ty-auto-suggest (z-index 10).
 * `header` is z-index 900; mac-seamless `titlebar` sits at the top of the same
 * document; the editor `content` box is already below that chrome.
 */
export const TYPORA_CHROME_SELECTORS = [
  "header",
  "titlebar",
  "#top-titlebar",
  "footer.ty-footer",
  "#md-searchpanel",
];

export function intersectRects(a, b) {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return rect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

function bandOverlapsAxis(box, chrome, axis) {
  if (axis === "horizontal") {
    return Math.min(box.right, chrome.right) - Math.max(box.left, chrome.left) > box.width * 0.5;
  }
  return Math.min(box.bottom, chrome.bottom) - Math.max(box.top, chrome.top) > box.height * 0.5;
}

/** Shrink a visible box by a chrome rect that covers a top, bottom, or side band. */
export function subtractOverlappingBand(box, chrome) {
  if (!box || !chrome || chrome.width <= 0 || chrome.height <= 0) return box;
  let next = box;
  if (bandOverlapsAxis(next, chrome, "horizontal") && chrome.top <= next.top + 1 && chrome.bottom > next.top && chrome.bottom < next.bottom) {
    next = rect(next.left, chrome.bottom, next.width, next.bottom - chrome.bottom);
  }
  if (bandOverlapsAxis(next, chrome, "horizontal") && chrome.bottom >= next.bottom - 1 && chrome.top < next.bottom && chrome.top > next.top) {
    next = rect(next.left, next.top, next.width, chrome.top - next.top);
  }
  if (bandOverlapsAxis(next, chrome, "vertical") && chrome.left <= next.left + 1 && chrome.right > next.left && chrome.right < next.right) {
    next = rect(chrome.right, next.top, next.right - chrome.right, next.height);
  }
  if (bandOverlapsAxis(next, chrome, "vertical") && chrome.right >= next.right - 1 && chrome.left < next.right && chrome.left > next.left) {
    next = rect(next.left, next.top, chrome.left - next.left, next.height);
  }
  return next;
}

function isDisplayed(el, win) {
  if (!el) return false;
  const style = win?.getComputedStyle?.(el);
  if (style && (style.display === "none" || style.visibility === "hidden")) return false;
  const r = el.getBoundingClientRect?.();
  return Boolean(r && (r.width > 0 || r.height > 0));
}

/**
 * Visible editor box in the same client coordinates as position:fixed.
 * Typora is one document: #ty-auto-suggest is inside <content> but is
 * position:fixed to the window, so window (0,0) includes the titlebar/tabs
 * that paint over the menu (z-index 900 vs 10).
 */
export function editorVisibleRect(win = globalThis, doc = win.document) {
  const viewport = viewportRect(win);
  if (!doc?.querySelector) return viewport;
  let box = viewport;
  const content = doc.querySelector("content");
  if (content && isDisplayed(content, win)) {
    const cr = copyRect(content.getBoundingClientRect());
    if (cr.width > 0 && cr.height > 0) box = intersectRects(box, cr);
  }
  for (const selector of TYPORA_CHROME_SELECTORS) {
    const el = doc.querySelector(selector);
    if (!isDisplayed(el, win)) continue;
    box = subtractOverlappingBand(box, copyRect(el.getBoundingClientRect()));
  }
  if (box.width < 32 || box.height < 32) return viewport;
  return box;
}

export function caretClientRect(win = globalThis) {
  try {
    const selection = win.getSelection?.();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const client = range.getClientRects?.()[0] || range.getBoundingClientRect?.();
    if (!client) return null;
    if (client.width || client.height || client.bottom !== client.top || client.left || client.top) {
      return copyRect(client);
    }
  } catch {
    // WKWebView can throw if the selection is in a detached node.
  }
  return null;
}

export function scrollItemIntoContainer(container, item) {
  if (!container || !item) return false;
  const viewTop = container.scrollTop;
  const viewBottom = viewTop + container.clientHeight;
  const itemTop = item.offsetTop;
  const itemBottom = itemTop + item.offsetHeight;
  if (itemTop < viewTop) {
    container.scrollTop = itemTop;
    return true;
  }
  if (itemBottom > viewBottom) {
    container.scrollTop = itemBottom - container.clientHeight;
    return true;
  }
  return false;
}

const bound = new WeakMap();

/**
 * Reposition #ty-auto-suggest only while it is showing Garden rows.
 * Typora still owns show/hide, selection, and apply; this only writes top/left/maxHeight/maxWidth.
 */
export function bindGardenPickerPlacement({
  container,
  getAnchorRect,
  getViewport,
  win = globalThis,
  isGardenMenu = (node) => Boolean(node?.querySelector?.(".garden-suggest")),
} = {}) {
  if (!container) return emptyHandle();
  const existing = bound.get(container);
  if (existing) {
    existing.apply();
    return existing;
  }

  let applying = false;
  let destroyed = false;
  const teardowns = [];
  let last = null;
  let restoreStyle = null;
  const watchedImages = new WeakSet();

  const handle = { apply, destroy };
  bound.set(container, handle);

  function measure() {
    return measureMenuIntrinsicSize(container);
  }

  function ensureMenuScroll(style) {
    if (!style) return;
    if (!restoreStyle) {
      restoreStyle = {
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        overscrollBehavior: style.overscrollBehavior,
      };
    }
    style.overflowX = "hidden";
    style.overflowY = "auto";
    style.overscrollBehavior = "contain";
  }

  function apply() {
    if (destroyed || applying) return last;
    if (!container.classList?.contains?.("ty-show") || !isGardenMenu(container)) {
      destroy();
      return null;
    }
    const viewport = (getViewport || editorVisibleRect)(win);
    const anchor = getAnchorRect?.() || caretClientRect(win);
    if (!anchor || !viewport?.width || !viewport?.height) return last;

    applying = true;
    try {
      watchImages();
      const menu = measure();
      const preferredLeft = readPreferredLeft(container, anchor);
      const placed = placePickerMenu({ anchor: copyRect(anchor), viewport, menu, preferredLeft });
      const style = container.style;
      if (samePlacement(last, placed)) {
        ensureMenuScroll(style);
        scrollActive(container);
        return last;
      }
      style.top = `${placed.top}px`;
      style.left = `${placed.left}px`;
      style.right = "auto";
      style.maxHeight = `${placed.maxHeight}px`;
      // Set width, minWidth and maxWidth together so shrink-to-fit cannot collapse below the readable floor.
      style.minWidth = `${placed.width}px`;
      style.width = `${placed.width}px`;
      style.maxWidth = `${placed.width}px`;
      ensureMenuScroll(style);
      container.classList.add(GARDEN_PICKER_CLASS);
      container.dataset.gardenPlacement = placed.placement;
      last = placed;
      scrollActive(container);
      return placed;
    } finally {
      applying = false;
    }
  }

  function watchImages() {
    const images = container.querySelectorAll?.("img") || [];
    for (const image of images) {
      if (watchedImages.has(image) || image.complete) continue;
      watchedImages.add(image);
      const onDone = () => schedule();
      image.addEventListener("load", onDone, { once: true });
      image.addEventListener("error", onDone, { once: true });
      teardowns.push(() => {
        image.removeEventListener("load", onDone);
        image.removeEventListener("error", onDone);
      });
    }
  }

  let frame = 0;
  function schedule() {
    if (destroyed) return;
    const raf = win.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
    if (frame) return;
    frame = raf(() => {
      frame = 0;
      apply();
    });
  }

  const onWindowChange = () => schedule();
  win.addEventListener?.("resize", onWindowChange);
  teardowns.push(() => win.removeEventListener?.("resize", onWindowChange));
  // Capture scroll so a typora page-scroll hide still lets us detach; do not re-show.
  win.addEventListener?.("scroll", onWindowChange, true);
  teardowns.push(() => win.removeEventListener?.("scroll", onWindowChange, true));

  const vv = win.visualViewport;
  if (vv?.addEventListener) {
    vv.addEventListener("resize", onWindowChange);
    vv.addEventListener("scroll", onWindowChange);
    teardowns.push(() => {
      vv.removeEventListener("resize", onWindowChange);
      vv.removeEventListener("scroll", onWindowChange);
    });
  }

  if (win.ResizeObserver) {
    const ro = new win.ResizeObserver(() => schedule());
    ro.observe(container);
    teardowns.push(() => ro.disconnect());
  }

  if (win.MutationObserver) {
    const mo = new win.MutationObserver(() => schedule());
    mo.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    teardowns.push(() => mo.disconnect());
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (frame && win.cancelAnimationFrame) win.cancelAnimationFrame(frame);
    frame = 0;
    for (const stop of teardowns.splice(0)) {
      try { stop(); } catch { /* already gone */ }
    }
    container.classList?.remove?.(GARDEN_PICKER_CLASS);
    if (container.dataset) delete container.dataset.gardenPlacement;
    const style = container.style;
    const restore = restoreStyle;
    if (style && restore) {
      style.overflowX = restore.overflowX ?? "";
      style.overflowY = restore.overflowY ?? "";
      style.overscrollBehavior = restore.overscrollBehavior ?? "";
    }
    if (bound.get(container) === handle) bound.delete(container);
    restoreStyle = null;
    last = null;
  }

  apply();
  return handle;
}

function emptyHandle() {
  return { apply() { return null; }, destroy() {} };
}

function rect(left, top, width, height) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function copyRect(value) {
  const left = Number(value.left) || 0;
  const top = Number(value.top) || 0;
  const width = Number(value.width) || 0;
  const height = Number(value.height) || Math.max(0, (Number(value.bottom) || 0) - top);
  const bottom = Number(value.bottom) || top + height;
  const right = Number(value.right) || left + width;
  return { left, top, width, height, right, bottom };
}

function readPreferredLeft(container, anchor) {
  const raw = container.style?.left;
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  if (Number.isFinite(parsed)) return parsed;
  return anchor.left - TYPORA_LEFT_INSET;
}

function samePlacement(prev, next) {
  if (!prev || !next) return false;
  return prev.placement === next.placement
    && almost(prev.top, next.top)
    && almost(prev.left, next.left)
    && almost(prev.maxHeight, next.maxHeight)
    && almost(prev.width, next.width);
}

function almost(a, b) {
  return Math.abs(a - b) < 0.5;
}

function scrollActive(container) {
  const item = container.querySelector?.("li.active");
  if (item) scrollItemIntoContainer(container, item);
}

export function typoraAutoSuggestElement(doc = globalThis.document) {
  return doc?.getElementById?.(TYPORA_AUTO_SUGGEST_ID) ?? null;
}

/**
 * Clamp a measured menu width to a readable range, never feeding a shrink-to-fit
 * used width back as the only target. A narrow viewport may shrink below the
 * readable floor; a wide measurement is capped by READABLE_MAX_WIDTH.
 */
export function resolvePickerWidth({
  measuredWidth = 0,
  viewportWidth = 0,
  margin = VIEWPORT_MARGIN,
  readableMin = READABLE_MIN_WIDTH,
  readableMax = READABLE_MAX_WIDTH,
} = {}) {
  const available = Math.max(0, Number(viewportWidth) - 2 * margin);
  const floor = Math.min(readableMin, available);
  const ceil = Math.min(readableMax, available);
  const measured = Math.max(0, Number(measuredWidth) || 0);
  return Math.min(ceil, Math.max(floor, measured));
}

/**
 * Measure intrinsic size without the previously written maxWidth/width.
 * Does not use the shrink-to-fit client width as the target.
 */
export function measureMenuIntrinsicSize(container, { readableMin = READABLE_MIN_WIDTH } = {}) {
  if (!container) return { width: readableMin, height: 0 };
  const style = container.style || {};
  const prev = {
    width: style.width,
    minWidth: style.minWidth,
    maxWidth: style.maxWidth,
  };
  style.maxWidth = "none";
  style.width = "max-content";
  if (style.width !== "max-content") style.width = "auto";
  style.minWidth = `${readableMin}px`;
  const width = Math.max(
    readableMin,
    Number(container.scrollWidth) || 0,
    Number(container.offsetWidth) || 0,
  );
  const height = Math.max(Number(container.scrollHeight) || 0, 0);
  style.width = prev.width ?? "";
  style.minWidth = prev.minWidth ?? "";
  style.maxWidth = prev.maxWidth ?? "";
  return { width, height };
}
