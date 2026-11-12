/** Typora 1.14.15 AutoComplete Enter contract and Garden-only fixes.
 *
 * Native update() does: match.length ? index = Math.min(index, 0) : index = -1.
 * After a fresh show, index is -1, so handleKeyEvents on Enter calls hide()
 * without returning false — the key is not prevented and the editor inserts a
 * newline. Garden must accept the current (or first) item instead, then reopen
 * the diagram list when the command hint was chosen.
 *
 * IME: WebKit/WKWebView may clear isComposing before the confirming Enter
 * keydown (WebKit 165004). Also treat keyCode 229 as composition.
 */

export function typoraIndexAfterSearch(previousIndex, matchLength) {
  return matchLength ? Math.min(previousIndex, 0) : -1;
}

/** What Typora's own handleKeyEvents does for Enter, before any Garden hook. */
export function typoraNativeEnterAction(index) {
  return index >= 0 ? "apply" : "hide-and-newline";
}

export function isImeConfirmEnter(event) {
  if (!event) return false;
  if (event.isComposing) return true;
  if (event.keyCode === 229 || event.which === 229) return true;
  if (event.key === "Process") return true;
  return false;
}

export function ensureTyporaActiveIndex(state) {
  if (!state?.match?.length) return false;
  if (state.index == null || state.index < 0) {
    state.index = 0;
    return true;
  }
  return false;
}

export function gardenEnterShouldApply(event, { shown = true, matchLength = 0 } = {}) {
  if (!shown || !matchLength) return false;
  if (!event || event.key !== "Enter") return false;
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return false;
  if (isImeConfirmEnter(event)) return false;
  return true;
}

/**
 * Garden capture-phase Enter handler. When it applies, it prevents the native
 * newline path (index === -1) without changing Tab, click, Escape, or IME Enter.
 *
 * @returns {"apply"|"ime"|"ignore"}
 */
export function handleGardenSuggestEnter(event, {
  shown,
  isGardenMenu,
  match,
  index,
  apply,
} = {}) {
  if (!isGardenMenu || !shown) return "ignore";
  const enterish = event?.key === "Enter" || event?.key === "Process" || event?.keyCode === 229 || event?.which === 229;
  if (enterish && isImeConfirmEnter(event)) return "ime";
  if (!gardenEnterShouldApply(event, { shown, matchLength: match?.length || 0 })) return "ignore";
  const selected = index >= 0 ? match[index] : match[0];
  if (selected === undefined) return "ignore";
  event.preventDefault?.();
  event.stopPropagation?.();
  apply?.(selected);
  return "apply";
}

export function bindGardenPickerKeys({
  container,
  getAutoComplete,
  win = globalThis,
  isGardenMenu = (node) => Boolean(node?.querySelector?.(".garden-suggest")),
} = {}) {
  const doc = win.document || win;
  const onKeyDown = (event) => {
    const ac = getAutoComplete?.();
    const shown = Boolean(container?.classList?.contains?.("ty-show") || ac?.isShown?.());
    handleGardenSuggestEnter(event, {
      shown,
      isGardenMenu: isGardenMenu(container),
      match: ac?.state?.match,
      index: ac?.state?.index,
      apply: (item) => ac?.apply?.(item),
    });
  };
  if (!doc?.addEventListener) return { destroy() {} };
  doc.addEventListener("keydown", onKeyDown, true);
  return {
    destroy() {
      doc.removeEventListener("keydown", onKeyDown, true);
    },
  };
}

/** Schedule the same edit pulse Typora's slash manager listens to, after /garden is pasted. */
export function scheduleGardenCommandReopen(emit, { win = globalThis } = {}) {
  const fire = () => {
    try { emit?.("edit"); } catch { /* editor observer may already have run */ }
  };
  fire();
  const raf = win.requestAnimationFrame || ((fn) => setTimeout(fn, 16));
  raf(fire);
  setTimeout(fire, 30);
}
