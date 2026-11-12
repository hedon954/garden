/** Place the Garden Typora picker inside the viewport without patching Typora's global autocomplete. */

export const VIEWPORT_MARGIN = 8;
export const ANCHOR_GAP = 4;
export const TYPORA_AUTO_SUGGEST_ID = "ty-auto-suggest";
export const GARDEN_PICKER_CLASS = "garden-picker-open";
export const TYPORA_LEFT_INSET = 15;

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
  const width = Math.min(Math.max(0, menu.width), Math.max(0, viewport.width - 2 * margin));
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
  const watchedImages = new WeakSet();

  const handle = { apply, destroy };
  bound.set(container, handle);

  function measure() {
    return {
      width: Math.max(container.scrollWidth || 0, container.getBoundingClientRect?.().width || 0),
      height: Math.max(container.scrollHeight || 0, 0),
    };
  }

  function apply() {
    if (destroyed || applying) return last;
    if (!container.classList?.contains?.("ty-show") || !isGardenMenu(container)) {
      destroy();
      return null;
    }
    const viewport = (getViewport || viewportRect)(win);
    const anchor = getAnchorRect?.() || caretClientRect(win);
    if (!anchor || !viewport?.width || !viewport?.height) return last;

    applying = true;
    try {
      watchImages();
      const menu = measure();
      const preferredLeft = readPreferredLeft(container, anchor);
      const placed = placePickerMenu({ anchor: copyRect(anchor), viewport, menu, preferredLeft });
      if (samePlacement(last, placed)) {
        scrollActive(container);
        return last;
      }
      const style = container.style;
      style.top = `${placed.top}px`;
      style.left = `${placed.left}px`;
      style.right = "auto";
      style.maxHeight = `${placed.maxHeight}px`;
      style.maxWidth = `${placed.width}px`;
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
    if (bound.get(container) === handle) bound.delete(container);
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
