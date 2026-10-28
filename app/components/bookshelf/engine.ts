/* eslint-disable */
// @ts-nocheck
// Tip ux26 held-book-s10-ux26-20261028. Motion copied from that app.js. Do not retune it.
import { DEMO_CATALOG, DEMO_NOTES } from "./demo-data";

function cssIdent(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
}

function coverSrc(book) {
  if (typeof book.cover === "string" && book.cover) return book.cover;
  return `/covers/${book.id}.jpg`;
}

function injectExtraCovers(catalog) {
  const rules = [];
  for (const cat of catalog) {
    for (const book of cat.books) {
      const id = cssIdent(book.id);
      if (!id) continue;
      if (typeof book.cover === "string" && book.cover) {
        const url = book.cover.replace(/["'\\\n\r]/g, "");
        rules.push(`.bookshelf-demo .img-${id}{background-image:url("${url}")}`);
        rules.push(`.bookshelf-demo .spine.is-expanded.img-${id}{background-image:url("${url}") !important}`);
      }
      if (typeof book.color === "string" && book.color) {
        const color = book.color.replace(/[^#(),.%a-zA-Z0-9 ]/g, "");
        rules.push(`.bookshelf-demo .bk-${id}{background-color:${color}}`);
      }
    }
  }
  if (!rules.length) return () => {};
  const style = document.createElement("style");
  style.setAttribute("data-bookshelf-covers", "");
  style.textContent = rules.join("\n");
  document.head.appendChild(style);
  return () => style.remove();
}

export function mountBookshelf(root, options = {}) {
  // A passed catalog is a site shelf. Demo notes and demo copy stay on the
  // package preview, which mounts this with no catalog.
  const CATALOG = options.catalog ?? DEMO_CATALOG;
  const NOTES = options.notes ?? (options.catalog ? {} : DEMO_NOTES);
  const usingDemo = !options.catalog;
  const removeExtraCovers = injectExtraCovers(CATALOG);

  // ux26: per-book cover dominant (= existing bk-* spine colors) for open-shell + page wash
  const COVER_SHELL = {
    "clean-code": "#0d1b2a",
    "refactoring": "#7a0d1b",
    "design-patterns": "#0d1b1b",
    "continuous-delivery": "#be2828",
    "phoenix-project": "#3a7ab8",
    "mythical-man-month": "#1b3688",
    "pragmatic-programmer": "#1a1a1a",
    "tdd": "#513688",
    "lean-startup": "#3a3a3a",
    "release-it": "#5a6a88",
    "sre": "#00367a",
    "team-topologies": "#2a6a88",
    "accelerate": "#36445f",
    "ddd": "#1e4a7a",
    "microservices": "#a38851",
    "eaa": "#950d1b",
    "ddia": "#8b3a2f",
    "fundamentals-sa": "#44881b",
    "implementing-ddd": "#b03644",
    "systems-performance": "#00447a",
    "clean-architecture": "#0d1b44",
    sand: "#c4b7a2",
    cream: "#d2c4ae",
  };

  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "").trim();
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b };
    }
    if (h.length !== 6) return { r: 90, g: 106, b: 136 };
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function rgbToHex({ r, g, b }) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${c(r)}${c(g)}${c(b)}`;
  }

  function mixRgb(a, b, t) {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    };
  }

  function bookShellHex(book) {
    if (!book) return "#5a6a88";
    if (book.filler === "sand" || book.filler === true) return COVER_SHELL.sand;
    if (book.filler === "cream") return COVER_SHELL.cream;
    // Site books carry the sampled cover color. Demo jackets keep COVER_SHELL.
    const color = typeof book.color === "string" ? book.color.trim() : "";
    if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return color;
    return COVER_SHELL[book.id] || "#5a6a88";
  }

  function bookPagePalette(book) {
    const shell = bookShellHex(book);
    const s = hexToRgb(shell);
    const cream = { r: 255, g: 252, b: 246 };
    const paper = { r: 247, g: 244, b: 239 };
    const paperLo = { r: 239, g: 232, b: 220 };
    // Soft tint: mostly paper, hint of cover
    const pageHi = mixRgb(cream, s, 0.08);
    const page = mixRgb(paper, s, 0.12);
    const pageLo = mixRgb(paperLo, s, 0.18);
    const shellHi = mixRgb(s, { r: 255, g: 255, b: 255 }, 0.22);
    const shellLo = mixRgb(s, { r: 0, g: 0, b: 0 }, 0.28);
    const edgeA = mixRgb(cream, s, 0.28);
    const edgeB = mixRgb(paper, s, 0.38);
    const edgeC = mixRgb(paperLo, s, 0.48);
    // Dark ink on tinted page (pages stay light)
    const ink = mixRgb({ r: 32, g: 28, b: 22 }, s, 0.18);
    const inkMuted = mixRgb({ r: 90, g: 83, b: 72 }, s, 0.12);
    return {
      shell,
      shellHi: rgbToHex(shellHi),
      shellLo: rgbToHex(shellLo),
      page: rgbToHex(page),
      pageHi: rgbToHex(pageHi),
      pageLo: rgbToHex(pageLo),
      edgeA: rgbToHex(edgeA),
      edgeB: rgbToHex(edgeB),
      edgeC: rgbToHex(edgeC),
      ink: rgbToHex(ink),
      inkMuted: rgbToHex(inkMuted),
    };
  }

  function applyFlyerPalette(flyer, book) {
    if (!flyer) return;
    const p = bookPagePalette(book);
    flyer.style.setProperty("--shell", p.shell);
    flyer.style.setProperty("--shell-hi", p.shellHi);
    flyer.style.setProperty("--shell-lo", p.shellLo);
    flyer.style.setProperty("--page", p.page);
    flyer.style.setProperty("--page-hi", p.pageHi);
    flyer.style.setProperty("--page-lo", p.pageLo);
    flyer.style.setProperty("--edge-a", p.edgeA);
    flyer.style.setProperty("--edge-b", p.edgeB);
    flyer.style.setProperty("--edge-c", p.edgeC);
    flyer.style.setProperty("--ink", p.ink);
    flyer.style.setProperty("--ink-muted", p.inkMuted);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function plainFromHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = String(html || "");
    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
  }

  function noteSummaryText(book) {
    const key = book && book.note;
    const note = key ? NOTES[key] : null;
    if (note && typeof note.summary === "string" && note.summary.trim()) {
      return note.summary.trim().replace(/\s+/g, " ");
    }
    if (note && note.body) {
      let text = plainFromHtml(note.body);
      // Prefer first real sentence-ish chunk after stripping headings noise
      text = text.replace(/^(为什么还在读这本|整洁不是洁癖|为什么这本难跳过|几条带走的|记下的几条|带走的框架)\s*/g, "");
      if (text.length > 140) text = text.slice(0, 138).replace(/\s+\S*$/, "") + "…";
      if (text.length >= 24) return text;
    }
    const who = book && book.author ? ` · ${book.author}` : "";
    if (!usingDemo) return (book && (book.author || book.title)) || "";
    return `《${book.title}》的读书笔记摘要${who}。正式站会换成完整笔记；Demo 先占这一页。`;
  }

  function leftPageHtml(book) {
    const title = escapeHtml(book.title || "");
    const author = book.author ? `<p class="flyer-page-author">${escapeHtml(book.author)}</p>` : "";
    return `<div class="flyer-page-title">${title}</div>${author}`;
  }

  function rightPageHtml(book) {
    const summary = escapeHtml(noteSummaryText(book));
    const href = book && typeof book.href === "string" ? book.href : "";
    const more = href
      ? `<a class="flyer-page-more" href="${escapeHtml(href)}">阅读全文</a>`
      : "";
    return `<div class="flyer-page-kicker">读书笔记</div><p class="flyer-page-summary">${summary}</p>${more}`;
  }


  const $ = (sel, scope = root) => scope.querySelector(sel);
  const $$ = (sel, scope = root) => [...scope.querySelectorAll(sel)];

  const unlisten = [];
  function listen(target, type, fn, opts) {
    if (!target) return;
    target.addEventListener(type, fn, opts);
    unlisten.push(() => target.removeEventListener(type, fn, opts));
  }

  const shelfView = $("#shelfView");
  const noteView = $("#noteView");
  const baysEl = $("#bays");
  const stage = $("#stage");
  const openVeil = $("#openVeil");
  const openVeilBlob = $("#openVeilBlob");
  const openBackdrop = $("#openBackdrop");
  const modeHint = $("#modeHint");
  const footMode = $("#footMode");

  let pageMode = "spines"; // covers | spines
  // Hedon lock: density decided once on enter; resize must not flip covers↔spines.
  // ux21: mobile-primary enter pins covers (全封面); desktop keeps ux19 autoDecide pin.
  let densityPinned = null;
  let modeOverride = null; // auto | covers | spines | null→from query
  let busy = false;
  let expandedId = null;
  let openBook = null;
  let openFromExpanded = false;
  let touchExpandedId = null;

  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wait = (ms) =>
    new Promise((r) => setTimeout(r, reduceMotion() ? 0 : ms));

  const cssMs = (name, fallback) => {
    if (reduceMotion()) return 0;
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    if (!raw) return fallback;
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s")) return parseFloat(raw) * 1000;
    return fallback;
  };

  function bookById(id) {
    for (const cat of CATALOG) {
      const b = cat.books.find((x) => x.id === id);
      if (b) return { book: b, cat };
    }
    return null;
  }

  function coverClass(book) {
    if (!book.cover) return "";
    return `img-${book.id}`;
  }


  // Natural cover aspect (width/height). Seeded from demo JPGs; refined on preload.
  const COVER_NAT = {
    "accelerate": [299, 300],
    "clean-architecture": [506, 685],
    "clean-code": [1080, 1357],
    "continuous-delivery": [394, 500],
    "ddd": [600, 754],
    "ddia": [1080, 1080],
    "design-patterns": [408, 576],
    "eaa": [720, 1024],
    "fundamentals-sa": [800, 800],
    "implementing-ddd": [1080, 1401],
    "lean-startup": [1080, 1401],
    "microservices": [1080, 1368],
    "mythical-man-month": [408, 580],
    "phoenix-project": [700, 992],
    "pragmatic-programmer": [398, 500],
    "refactoring": [1080, 1404],
    "release-it": [417, 500],
    "sre": [374, 500],
    "systems-performance": [1080, 1382],
    "tdd": [432, 544],
    "team-topologies": [800, 800],
  };

  function coverWidthPx() {
    return window.innerWidth <= 640 ? 102 : 118;
  }

  function bookNat(book) {
    if (!book || !book.cover) return null;
    const pair = COVER_NAT[book.id];
    if (!pair || !pair[0] || !pair[1]) return null;
    return { w: pair[0], h: pair[1] };
  }

  // Fixed width; height from real cover aspect. Fallback ~2:3 if unknown.
  function bookFaceHeight(book) {
    const w = coverWidthPx();
    const nat = bookNat(book);
    if (!nat) return Math.round(w / 0.68);
    return Math.max(96, Math.round(w * (nat.h / nat.w)));
  }

  function applyFaceSize(el, book, { expanded = false } = {}) {
    if (!el || !book) return;
    const faceH = bookFaceHeight(book);
    if (el.classList.contains("cover") || expanded) {
      const w = coverWidthPx();
      el.style.width = w + "px";
      el.style.height = faceH + "px";
      el.style.backgroundSize = "contain";
      el.style.backgroundPosition = "center top";
      el.style.backgroundRepeat = "no-repeat";
    } else if (el.classList.contains("spine")) {
      // Resting spine: same height as that book's cover face; width from size class.
      el.style.height = faceH + "px";
      el.style.removeProperty("width"); // keep CSS size class width
      el.dataset.faceH = String(faceH);
    }
  }

  function parseForceMode() {
    const q = new URLSearchParams(location.search);
    const f = q.get("force");
    if (f === "covers" || f === "spines") return f;
    return null;
  }

  // ux21 lock: touch / hover:none resting = all covers (全封面).
  // hover:none alone — do not also require pointer:coarse (DevTools 窄屏/部分真机否则会掉回立脊).
  function isMobilePrimary() {
    return window.matchMedia("(hover: none)").matches;
  }

  // Density: compute once on enter (pin), unless ?force= QA or explicit B spines.
  // ux21: mobile-primary → pin "covers" (skip fit→spines autoDecide).
  // Desktop → autoDecide once (ux19). Resize must NOT re-classify device class.
  function pinnedDensityMode({ recompute = false } = {}) {
    if (recompute || !densityPinned) {
      densityPinned = isMobilePrimary() ? "covers" : autoDecideMode();
    }
    return densityPinned;
  }

  function resolveRestingMode(pref, { recompute = false } = {}) {
    const force = parseForceMode();
    if (force) return force;
    if (pref === "spines") return "spines";
    // covers / auto / default: pinned resting (mobile→covers; desktop→density)
    return pinnedDensityMode({ recompute });
  }

  function applyCoverImage(el, book) {
    if (!el || !book) return;
    // ux24: NEVER preset wood/brown plate behind cover — transparent only
    el.style.backgroundColor = "transparent";
    el.style.backgroundSize = "contain";
    el.style.backgroundPosition = "center top";
    el.style.backgroundRepeat = "no-repeat";
    // Durable <img> — CSS multi-layer background often drops inside preserve-3d mid-flip
    let img = el.querySelector(":scope > .flyer-cover-img");
    if (book.cover) {
      const src = coverSrc(book);
      el.style.backgroundImage =
        `linear-gradient(90deg, rgba(0,0,0,0.18) 0%, transparent 10%),` +
        `linear-gradient(180deg, rgba(255,255,255,0.06), transparent 40%),` +
        `url("${src}")`;
      if (!img) {
        img = document.createElement("img");
        img.className = "flyer-cover-img";
        img.alt = "";
        img.draggable = false;
        el.insertBefore(img, el.firstChild);
      }
      if (img.getAttribute("src") !== src) img.src = src;
      img.style.display = "block";
    } else {
      el.style.backgroundImage =
        `linear-gradient(90deg, rgba(0,0,0,0.18) 0%, transparent 10%),` +
        `linear-gradient(180deg, rgba(255,255,255,0.06), transparent 40%)`;
      if (img) img.style.display = "none";
    }
  }

  function bkClass(book) {
    if (book.filler === "sand" || book.filler === true) return "bk-sand";
    if (book.filler === "cream") return "bk-cream";
    return `bk-${book.id}`;
  }

  function parseQuery() {
    const q = new URLSearchParams(location.search);
    const m = q.get("mode");
    if (m === "covers" || m === "a") return "covers";
    if (m === "spines" || m === "b") return "spines";
    return null;
  }

  function setMode(mode, { push = false } = {}) {
    pageMode = mode === "covers" ? "covers" : "spines";
    expandedId = null;
    touchExpandedId = null;
    renderShelf();
    updateModeUI();
    if (push) {
      const url = new URL(location.href);
      url.searchParams.set("mode", pageMode);
      history.replaceState(null, "", url);
    }
  }

  function enableDebugChrome() {
    const q = new URLSearchParams(location.search);
    const on = q.get("debug") === "1" || location.hash === "#qa";
    document.body.classList.toggle("debug-on", on);
    ["lede", "qaBar", "footBar"].forEach((id) => {
      const el = root.querySelector("#" + id);
      if (!el) return;
      if (on) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

    function updateModeUI() {
    $$(".qa-btn").forEach((btn) => {
      const m = btn.dataset.mode;
      const active =
        (m === "auto" && modeOverride === "auto") ||
        (m === pageMode && modeOverride === pageMode) ||
        (m === pageMode && !modeOverride && parseQuery() === pageMode);
      btn.classList.toggle("is-active", !!active || (m === pageMode && modeOverride === m));
    });
    // clearer active: mark exact override or current page mode button
    $$(".qa-btn").forEach((btn) => btn.classList.remove("is-active"));
    if (modeOverride === "auto") {
      $("#modeAuto")?.classList.add("is-active");
    } else if (pageMode === "covers") {
      $("#modeCovers")?.classList.add("is-active");
    } else {
      $("#modeSpines")?.classList.add("is-active");
    }
    const force = parseForceMode();
    const auto = autoDecideMode();
    let label = pageMode === "covers" ? "A · 全封面" : "B · 全立脊";
    let tag = "";
    if (force) tag = "（强制对照）";
    else if (modeOverride === "auto") tag = "（自动）";
    else if (modeOverride === "covers") tag = auto === "covers" ? "（封面优先）" : "（放不下→立脊）";
    else if (modeOverride === "spines") tag = "（手动）";
    else if (densityPinned === "covers" && isMobilePrimary() && pageMode === "covers") tag = "（手机默认）";
    else tag = pageMode === "spines" ? "（默认）" : "";
    modeHint.textContent = label + tag;
    footMode.textContent = label;
  }

  function autoDecideMode() {
    // Page-level density: if any category can't fit covers in --col, all spines.
    // Approximate: desktop covers need ~118+14 gap * n; with pad.
    const col = Math.min(window.innerWidth - 32, 740);
    const coverW = window.innerWidth <= 640 ? 102 + 10 : 118 + 14;
    for (const cat of CATALOG) {
      const n = cat.books.filter((b) => b.cover).length;
      // Use cover-count for mode A layout (locked refs use subset on mobile)
      const need = n * coverW;
      if (need > col - 8) return "spines";
    }
    return "covers";
  }

  function applyModePreference() {
    let pref = modeOverride;
    if (!pref) {
      const q = parseQuery();
      if (q) pref = q;
    }
    const mode = resolveRestingMode(pref);
    setMode(mode);
  }

  function renderShelf() {
    rememberScrollHome();
    baysEl.innerHTML = "";
    for (const cat of CATALOG) {
      const section = document.createElement("section");
      section.className = "bay";
      section.dataset.cat = cat.id;

      const label = document.createElement("div");
      label.className = "row-label";
      label.innerHTML = `<span class="name">${cat.name}</span>`;
      section.appendChild(label);

      const ledge = document.createElement("div");
      ledge.className = "ledge";

      if (pageMode === "covers") {
        const row = document.createElement("div");
        row.className = "covers";
        for (const book of cat.books) {
          if (!book.cover) continue; // covers mode: real covers only (locked A)
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `cover ${coverClass(book)} ${bkClass(book)}`;
          btn.dataset.bookId = book.id;
          btn.setAttribute("aria-label", book.title);
          applyFaceSize(btn, book);
          // ux24: durable cover art — ban resting bk-* solid shells if CSS bg drops
          const art = document.createElement("img");
          art.className = "cover-art";
          art.src = coverSrc(book);
          art.alt = "";
          art.draggable = false;
          btn.appendChild(art);
          btn.addEventListener("click", () => onCoverClick(book.id, btn));
          row.appendChild(btn);
        }
        ledge.appendChild(row);
      } else {
        const row = document.createElement("div");
        row.className = "spines";
        for (const book of cat.books) {
          const btn = document.createElement("button");
          btn.type = "button";
          const sizeCls = book.size === "thin" ? "thin dark-text" : `${book.size} light-text`;
          btn.className = `spine ${bkClass(book)} ${sizeCls}`;
          if (book.cover) btn.classList.add(coverClass(book));
          btn.dataset.bookId = book.id;
          btn.setAttribute("aria-label", book.title);
          btn.innerHTML = `<span>${book.spine}</span>`;
          if (book.cover && !book.filler) applyFaceSize(btn, book);
          else if (book.filler) { /* thin filler keeps CSS height */ }

          if (book.cover && !book.filler) {
            btn.addEventListener("pointerenter", (e) => {
              if (e.pointerType === "touch") return;
              expandSpine(book.id);
            });
            btn.addEventListener("pointerleave", (e) => {
              if (e.pointerType === "touch") return;
              if (!busy) collapseSpine(book.id);
            });
          }

          btn.addEventListener("click", (e) => onSpineClick(book.id, btn, e));
          row.appendChild(btn);
        }
        ledge.appendChild(row);
      }

      const rail = document.createElement("div");
      rail.className = "rail";
      ledge.appendChild(rail);
      section.appendChild(ledge);
      baysEl.appendChild(section);
    }

    // restore expanded visual if needed
    if (pageMode === "spines" && expandedId) {
      const el = $(`.spine[data-book-id="${expandedId}"]`);
      if (el) el.classList.add("is-expanded");
    }
  }

  // ux18: resting after expand — drop class + inline face width (inline beats CSS collapse).
  function restoreRestingSpine(el, bookId) {
    if (!el) return;
    el.classList.remove("is-expanded", "is-collapsing");
    const found = bookById(bookId);
    if (found && found.book.cover && !found.book.filler) {
      applyFaceSize(el, found.book, { expanded: false });
    } else {
      el.style.removeProperty("width");
      el.style.removeProperty("height");
    }
  }

  function clearOrphanExpandedFaces(exceptId) {
    $$(".spine[data-book-id]").forEach((el) => {
      const id = el.dataset.bookId;
      if (!id || id === exceptId) return;
      if (
        el.classList.contains("is-expanded") ||
        el.classList.contains("is-collapsing") ||
        el.style.width
      ) {
        restoreRestingSpine(el, id);
      }
    });
  }

  function expandSpine(id) {
    if (busy || pageMode !== "spines") return;
    pinScrollHome();
    const found = bookById(id);
    if (!found || !found.book.cover || found.book.filler) return;
    cancelCollapse();
    // Sweep orphans first — rapid hover left inline widths under ux17.
    clearOrphanExpandedFaces(id);
    if (expandedId && expandedId !== id) {
      const prev = $(`.spine[data-book-id="${expandedId}"]`);
      if (prev) restoreRestingSpine(prev, expandedId);
    }
    expandedId = id;
    const el = $(`.spine[data-book-id="${id}"]`);
    if (el) {
      el.classList.remove("is-collapsing");
      el.classList.add("is-expanded");
      applyFaceSize(el, found.book, { expanded: true });
    }
  }

  let collapseToken = 0;

  async function collapseSpine(id) {
    if (pageMode !== "spines") return;
    if (expandedId !== id) return;
    const el = $(`.spine[data-book-id="${id}"]`);
    touchExpandedId = null;
    if (!el) return;
    // Keep is-expanded + expandedId during shrink so a click mid-collapse still takes C path.
    // Drop inline width FIRST — ux17 face size would otherwise beat .is-collapsing CSS width.
    el.style.removeProperty("width");
    el.classList.add("is-collapsing");
    const token = ++collapseToken;
    await wait(cssMs("--t-collapse", 230));
    if (token !== collapseToken) return; // cancelled by open or re-expand
    if (expandedId !== id) return;
    expandedId = null;
    restoreRestingSpine(el, id);
    // Restore home before unpin — undoes SIV that fired during hover/click.
    writeScroll(scrollHome);
    unpinScrollHome();
  }

  function cancelCollapse() {
    collapseToken += 1;
  }

  async function onCoverClick(id, el) {
    if (busy) return;
    const found = bookById(id);
    if (!found || found.book.filler) return;
    await openBookFlow(found.book, found.cat, el, { fromExpanded: false, asSpine: false });
  }

  async function onSpineClick(id, el, ev) {
    if (busy) return;
    const found = bookById(id);
    if (!found) return;
    if (found.book.filler || !found.book.cover) return;

    const isTouch = ev && (ev.pointerType === "touch" || ("ontouchstart" in window && window.matchMedia("(hover: none)").matches));

    // Mobile (Hedon Oct 28): one tap → open animation. No cover-peek then second tap.
    if (isTouch || window.matchMedia("(hover: none)").matches) {
      touchExpandedId = null;
      if (expandedId) await collapseSpine(expandedId);
      await openBookFlow(found.book, found.cat, el, { fromExpanded: false, asSpine: true });
      return;
    }

    // Desktop: expanded OR mid-collapse → C path (retract+pull continuous from current footprint)
    const fromExpanded =
      (expandedId === id && el.classList.contains("is-expanded")) ||
      el.classList.contains("is-collapsing");
    await openBookFlow(found.book, found.cat, el, { fromExpanded, asSpine: true });
  }

  function fillNote(book, cat) {
    $("#noteCat").textContent = cat.name;
    $("#noteTitle").textContent = book.title;
    $("#noteAuthor").textContent = book.author || "";
    const coverEl = $("#noteCover");
    coverEl.className = `note-cover ${bkClass(book)} ${coverClass(book)}`;
    const note = NOTES[book.note];
    const read = $("#noteRead");
    if (read) {
      if (book.href) {
        read.href = book.href;
        read.hidden = false;
      } else {
        read.hidden = true;
        read.removeAttribute("href");
      }
    }
    if (note) {
      $("#noteBody").innerHTML = note.body;
    } else if (usingDemo) {
      $("#noteBody").innerHTML = `<p class="placeholder">这本还没有完整笔记正文。Demo 占位：返回书架继续抽翻验收。</p><p>${book.title}${book.author ? " · " + book.author : ""}</p>`;
    } else {
      $("#noteBody").innerHTML = `<p class="placeholder">这本还没有笔记正文。</p><p>${escapeHtml(book.title)}${book.author ? " · " + escapeHtml(book.author) : ""}</p>`;
    }
  }

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  // Mid flyer = dual-page SPREAD ≈ article column width (§9).
  // Close put-back still targets the real shelf slot via startRect/endRect.
  const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // kept for non-clock UI; OPEN uses linear
  const OPEN_MS = 2600; // §12 ux12: open ≤2.8s (keep 2600; extract still ~0.35–0.55s readable)
  const CLOSE_MS = 1900; // §12 ux12: close wall ~1.8–2.2s; no center full-size dwell
  let flowSeq = 0; // invalidate open finally when close starts

  function midSize(book) {
    // ux25: page aspect = THIS book's natural cover — ban fixed 2:3 preset taller plate
    // behind shorter/square covers (object-fit:contain letterbox ghost).
    const col = Math.min(window.innerWidth - 48, 700);
    const pageW = Math.round(Math.min(col * 0.48, window.innerWidth * 0.4, 340));
    let aspect = 1.45; // fallback ~2:3 only when nat unknown
    const nat = bookNat(book);
    if (nat && nat.w > 0 && nat.h > 0) aspect = nat.h / nat.w;
    const pageH = Math.round(Math.min(pageW * aspect, window.innerHeight * 0.68));
    return { w: pageW * 2, h: Math.max(120, pageH) };
  }

  function midRect(book) {
    const { w, h } = midSize(book);
    return {
      left: Math.round(window.innerWidth / 2 - w / 2),
      top: Math.round(window.innerHeight / 2 - h / 2 - 16),
      width: w,
      height: h,
    };
  }

  function flipTransform(fromRect, toRect, extra = "") {
    const sx = fromRect.width / toRect.width;
    const sy = fromRect.height / toRect.height;
    const tx = fromRect.left - toRect.left;
    const ty = fromRect.top - toRect.top;
    return `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})${extra ? " " + extra : ""}`;
  }

  // Closed book: cover on RIGHT half. Uniform scale only (non-uniform sx/sy = stretch jitter).
  function closedCoverTransform(slotRect, mid) {
    const halfW = mid.width / 2;
    const sx = slotRect.width / halfW;
    const sy = slotRect.height / mid.height;
    const s = Math.min(sx, sy);
    const scaledHalfW = halfW * s;
    const scaledH = mid.height * s;
    // Center scaled right-half over slot
    const tx = slotRect.left - mid.left - halfW * s + (slotRect.width - scaledHalfW) / 2;
    const ty = slotRect.top - mid.top + (slotRect.height - scaledH) / 2;
    return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
  }

  // Flat cover-card → slot (close path). No dual-leaf / half-board math.
  function cardToSlotTransform(slotRect, cardRect) {
    const sx = slotRect.width / cardRect.width;
    const sy = slotRect.height / cardRect.height;
    const s = Math.min(sx, sy);
    const scaledW = cardRect.width * s;
    const scaledH = cardRect.height * s;
    const tx = slotRect.left - cardRect.left + (slotRect.width - scaledW) / 2;
    const ty = slotRect.top - cardRect.top + (slotRect.height - scaledH) / 2;
    return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
  }

  function coverCardRect(mid) {
    const w = Math.round(mid.width / 2);
    const h = mid.height;
    return {
      left: Math.round(mid.left + (mid.width - w) / 2),
      top: mid.top,
      width: w,
      height: h,
    };
  }

  // §13/ux14: shared shelf↔center waypoints — open forward, close reverses SAME list.
  function lerpRect(a, b, t) {
    const u = Math.max(0, Math.min(1, t));
    return {
      left: Math.round(a.left + (b.left - a.left) * u),
      top: Math.round(a.top + (b.top - a.top) * u),
      width: Math.round(a.width + (b.width - a.width) * u),
      height: Math.round(a.height + (b.height - a.height) * u),
    };
  }

  function copyRect(r) {
    return {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }


  // ux16: FULL-HEIGHT standing spine at slot mouth — exact homeRect size.
  // Root cause of ux15 purple stub: closedCoverTransform uses min(sx,sy) uniform
  // scale of mid-flyer onto narrow spine → height collapses (~40px) + label → "…".
  // Fix: dedicated spine-slot flyer matching getBoundingClientRect of the shelf spine
  // (full height, spine width). Dual mid-flyer stays on ux14 path but hidden until
  // after leaving the slot / before seating.
  function makeSpineSlotFlyer(book, homeRect, { opacity = 1 } = {}) {
    const el = document.createElement("div");
    el.className = ("flyer flyer-spine-slot " + bkClass(book)).trim();
    el.setAttribute("aria-hidden", "true");
    const w = Math.max(1, Math.round(homeRect.width));
    const h = Math.max(1, Math.round(homeRect.height));
    el.style.left = Math.round(homeRect.left) + "px";
    el.style.top = Math.round(homeRect.top) + "px";
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.transform = "translate3d(0px, 0px, 0)";
    el.style.opacity = String(opacity);
    el.style.zIndex = "80";
    el.style.pointerEvents = "none";
    const label = document.createElement("span");
    label.className = "flyer-spine-slot-label";
    label.textContent = book.spine || book.title || "";
    el.appendChild(label);
    stage.appendChild(el);
    return el;
  }

  function disposeSpineSlot(el) {
    if (!el) return;
    try {
      el.getAnimations({ subtree: true }).forEach((a) => {
        try { a.cancel(); } catch (_) {}
      });
    } catch (_) {}
    try { el.remove(); } catch (_) {}
  }

  function spineSlotOutDelta(homeRect, mid) {
    const homeCx = homeRect.left + homeRect.width / 2;
    const homeCy = homeRect.top + homeRect.height / 2;
    const midCx = mid.left + mid.width / 2;
    const midCy = mid.top + mid.height / 2;
    // ~12% toward screen center — readable "slide out of slot" without jumping.
    return {
      x: (midCx - homeCx) * 0.12,
      y: (midCy - homeCy) * 0.12,
    };
  }

  // Kept for compatibility; ux16 no longer paints spine as inset plate on scaled dual.
  function attachSpineOverlay(coverEl, book, { opacity = 0 } = {}) {
    if (!coverEl || !book) return { plate: null, label: null };
    return { plate: null, label: null };
  }

  // Readable CLOSED book footprint (cover aspect). Used as MORPH TARGET only — never
  // snap frame-0 to this size (ux14: gradual across lift→extract).
  function closedBookRect(slotRect, book) {
    const w0 = Math.round(slotRect.width);
    const h0 = Math.round(slotRect.height);
    const ratio = w0 / Math.max(1, h0);
    // Already cover-shaped (covers path or expanded): keep footprint.
    if (ratio >= 0.42) {
      return { left: Math.round(slotRect.left), top: Math.round(slotRect.top), width: w0, height: h0 };
    }
    // Spine seat → morph to that book's natural cover face (fixed width, nat height).
    const w = coverWidthPx();
    const h = book ? bookFaceHeight(book) : Math.round(Math.min(Math.max(h0, 120), 180));
    return {
      left: Math.round(slotRect.left + w0 / 2 - w / 2),
      top: Math.round(slotRect.top + h0 - h), // sit on same rail
      width: w,
      height: h,
    };
  }

  function centerClosedRect(seatR) {
    return {
      left: Math.round(window.innerWidth / 2 - seatR.width / 2),
      top: Math.round(window.innerHeight / 2 - seatR.height / 2 - 16),
      width: seatR.width,
      height: seatR.height,
    };
  }

  // ux14: ONE transform math for shelf↔center on open AND close (dual mid + right-half cover).
  function pathTransform(slotRect, mid) {
    return closedCoverTransform(slotRect, mid);
  }

  // Parse translate/scale from our path strings; lerp components so grow ≠ hard jump (PATH-SHAKE ~2.2s).
  function parseTS(transform) {
    const s = String(transform || "");
    let tx = 0, ty = 0, sc = 1;
    let m = s.match(/translate3d\(\s*([\d.-]+)px\s*,\s*([\d.-]+)px/);
    if (m) { tx = +m[1]; ty = +m[2]; }
    else {
      m = s.match(/translate\(\s*([\d.-]+)px\s*,\s*([\d.-]+)px/);
      if (m) { tx = +m[1]; ty = +m[2]; }
    }
    m = s.match(/scale\(\s*([\d.-]+)\s*(?:,\s*[\d.-]+)?\s*\)/);
    if (m) sc = +m[1];
    return { tx, ty, s: sc };
  }
  function formatTS(p) {
    return `translate(${p.tx.toFixed(2)}px, ${p.ty.toFixed(2)}px) scale(${p.s.toFixed(4)})`;
  }
  function lerpTS(a, b, t) {
    const u = Math.max(0, Math.min(1, t));
    const pa = typeof a === "string" ? parseTS(a) : a;
    const pb = typeof b === "string" ? parseTS(b) : b;
    return formatTS({
      tx: pa.tx + (pb.tx - pa.tx) * u,
      ty: pa.ty + (pb.ty - pa.ty) * u,
      s: pa.s + (pb.s - pa.s) * u,
    });
  }

  // ux14 geometric core: ONE diagonal arc slot-center ↔ screen-center.
  // X, Y, AND scale on the SAME beat — ban L-path (lift-only then slide-only).
  // Transforms are lerpTS(T0→Tfull) samples so WAAPI stays collinear in tx/ty/s.
  function buildSlotWaypoints(homeRect, mid, book) {
    const home = copyRect(homeRect);
    const closedTarget = closedBookRect(home, book || (openBook && openBook.book));
    const centerClosed = centerClosedRect(closedTarget);
    const T0 = pathTransform(home, mid);
    const Tfull = "translate(0.00px, -4.00px) scale(1.0000)";
    // Pure component lerp T0→Tfull: position+scale advance together (no staged L).
    const Tp1 = lerpTS(T0, Tfull, 0.25);
    const Tp2 = lerpTS(T0, Tfull, 0.50);
    const Tp3 = lerpTS(T0, Tfull, 0.75);
    return {
      home,
      centerClosed,
      closedTarget,
      mid: copyRect(mid),
      T0,
      Tp1,
      Tp2,
      Tp3,
      Tfull,
    };
  }

  // Close-only: single flat cover face + durable <img>. No board / cream / preserve-3d.
  // ux7: keep CSS cover url until <img> is actually decoded — spine-direct Clean Code
  // used to clear backgroundImage on img-create → gray-brown flat board mid-close.
  function coverImgReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  function preferImgOverBg(face) {
    if (!face) return;
    const img = face.querySelector(":scope > .flyer-cover-img");
    if (coverImgReady(img)) {
      face.style.backgroundImage = "none";
      // ux24: transparent under img — ban #4a3b2f wood plate
      face.style.backgroundColor = "transparent";
      img.style.opacity = "1";
      img.style.visibility = "visible";
    }
    // else keep applyCoverImage's url(...) so mid-flight never shows naked board
  }

  async function awaitCloseCoverReady(face, book, ms = 400) {
    if (!face || !book) return;
    applyCoverImage(face, book);
    const img = face.querySelector(":scope > .flyer-cover-img");
    if (!img) return;
    if (coverImgReady(img)) {
      preferImgOverBg(face);
      return;
    }
    try {
      const decodeOrLoad = img.decode
        ? img.decode()
        : new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
      await Promise.race([decodeOrLoad.catch(() => {}), wait(ms)]);
    } catch (_) {}
    preferImgOverBg(face);
  }

  function makeCloseCoverFlyer(book, cardRect) {
    const flyer = document.createElement("div");
    flyer.className = "flyer flyer-close-cover";
    const face = document.createElement("div");
    face.className = (
      "flyer-close-face " + bkClass(book) + " " + coverClass(book)
    ).trim();
    face.classList.add("is-cover-ready");
    applyCoverImage(face, book);
    // ux7-spine-close-cover-texture: do NOT drop background until img decoded
    preferImgOverBg(face);
    flyer.appendChild(face);
    flyer._cover = face;
    flyer._front = face;
    flyer._left = null;
    flyer._right = null;
    flyer._book = null;
    flyer._gutter = null;
    flyer._shadow = null;
    flyer.style.width = cardRect.width + "px";
    flyer.style.height = cardRect.height + "px";
    flyer.style.left = cardRect.left + "px";
    flyer.style.top = cardRect.top + "px";
    flyer.style.transform = "translate3d(0px, -4px, 0) scale(1)";
    flyer.style.opacity = "1";
    stage.appendChild(flyer);
    return flyer;
  }

  function parkShelf() {
    shelfView.classList.add("is-parked");
    shelfView.classList.remove("is-dim");
    shelfView.hidden = false;
    shelfView.style.opacity = "";
  }

  function unparkShelf() {
    shelfView.classList.remove("is-parked");
    shelfView.hidden = false;
  }

  // ux6b: face-out (hover-expand → open) left whole shelf ~197px high (rail 361→164)
  // and stuck after close. Cause: scrollY drift (scrollIntoView / overflow-anchor /
  // pointerleave re-pin after SIV), not row collapse. Spine-direct never drifted.
  // Fix: sample idle home; pin FIRST expand from idle (never from drifted Y);
  // while expanded OR open, reject scroll away from home; restore on collapse+close.
  // Never call scrollIntoView.
  let idleScrollHome = { x: 0, y: 0 };
  let scrollHome = { x: 0, y: 0 };
  let scrollHomePinned = false; // true from first expand until release/collapse restore
  let scrollLock = null;
  let idleScrollTimer = 0;
  function readScroll() {
    return {
      x: window.scrollX || document.documentElement.scrollLeft || 0,
      y: window.scrollY || document.documentElement.scrollTop || 0,
    };
  }
  function writeScroll(s) {
    if (!s) return;
    try { window.scrollTo(s.x, s.y); } catch (_) {}
  }
  function sampleIdleScrollHome() {
    if (scrollLock || scrollHomePinned || busy || expandedId || openBook) return;
    idleScrollHome = readScroll();
    scrollHome = { x: idleScrollHome.x, y: idleScrollHome.y };
  }
  function rememberScrollHome() {
    if (scrollLock || scrollHomePinned) return;
    sampleIdleScrollHome();
  }
  function pinScrollHome() {
    // FIRST pin wins for this expand session. Use last IDLE home — never readScroll()
    // here (automation scrollIntoView may already have drifted before pointerenter/click).
    if (scrollHomePinned) return;
    scrollHome = { x: idleScrollHome.x, y: idleScrollHome.y };
    scrollHomePinned = true;
    writeScroll(scrollHome);
    armExpandedScrollGuard();
  }
  function unpinScrollHome() {
    scrollHomePinned = false;
    disarmExpandedScrollGuard();
  }
  function targetScrollHome() {
    if (scrollLock) return scrollLock;
    if (scrollHomePinned) return scrollHome;
    return null;
  }
  function onScrollGuard(ev) {
    const target = targetScrollHome();
    if (!target) return;
    const now = readScroll();
    if (now.x !== target.x || now.y !== target.y) {
      if (ev && ev.cancelable) {
        try { ev.preventDefault(); } catch (_) {}
      }
      writeScroll(target);
    }
  }
  let expandedGuardArmed = false;
  let expandedGuardRaf = 0;
  function expandGuardTick() {
    expandedGuardRaf = 0;
    const target = targetScrollHome();
    if (!target) return;
    const now = readScroll();
    if (now.x !== target.x || now.y !== target.y) writeScroll(target);
    // Keep polling while expanded/open — some SIV paths skip scroll events.
    if (scrollHomePinned || scrollLock) {
      expandedGuardRaf = requestAnimationFrame(expandGuardTick);
    }
  }
  function armExpandedScrollGuard() {
    if (!expandedGuardArmed) {
      expandedGuardArmed = true;
      window.addEventListener("scroll", onScrollGuard, { passive: false, capture: true });
    }
    if (!expandedGuardRaf) expandedGuardRaf = requestAnimationFrame(expandGuardTick);
  }
  function disarmExpandedScrollGuard() {
    if (scrollLock) return; // open lock owns the listener + rAF
    if (expandedGuardRaf) {
      try { cancelAnimationFrame(expandedGuardRaf); } catch (_) {}
      expandedGuardRaf = 0;
    }
    if (!expandedGuardArmed) return;
    expandedGuardArmed = false;
    window.removeEventListener("scroll", onScrollGuard, { capture: true });
  }
  function armScrollLock() {
    // Prefer pinned expand home / idle home — undoes pre-click scrollIntoView drift.
    if (!scrollHomePinned) {
      scrollHome = { x: idleScrollHome.x, y: idleScrollHome.y };
    }
    scrollLock = { x: scrollHome.x, y: scrollHome.y };
    writeScroll(scrollLock);
    try { document.documentElement.style.overflowAnchor = "none"; } catch (_) {}
    if (shelfView) {
      try { shelfView.style.overflowAnchor = "none"; } catch (_) {}
    }
    armExpandedScrollGuard();
    // Re-assert after layout / focus scrolls settle.
    requestAnimationFrame(() => writeScroll(scrollLock));
    requestAnimationFrame(() => requestAnimationFrame(() => writeScroll(scrollLock)));
  }
  function releaseScrollLock() {
    const home = scrollLock
      ? { x: scrollLock.x, y: scrollLock.y }
      : { x: scrollHome.x, y: scrollHome.y };
    scrollLock = null;
    scrollHomePinned = false;
    expandedGuardArmed = false;
    if (expandedGuardRaf) {
      try { cancelAnimationFrame(expandedGuardRaf); } catch (_) {}
      expandedGuardRaf = 0;
    }
    window.removeEventListener("scroll", onScrollGuard, { capture: true });
    writeScroll(home);
    scrollHome = home;
    idleScrollHome = home;
    try { document.documentElement.style.removeProperty("overflow-anchor"); } catch (_) {}
    if (shelfView) {
      try { shelfView.style.removeProperty("overflow-anchor"); } catch (_) {}
    }
  }
  function onWindowScrollIdle() {
    if (targetScrollHome()) {
      onScrollGuard(null);
      return;
    }
    clearTimeout(idleScrollTimer);
    idleScrollTimer = setTimeout(sampleIdleScrollHome, 80);
  }
  listen(window, "scroll", onWindowScrollIdle, { passive: true, capture: true });

  function animDuration(a) {
    try {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
      const d = t && t.duration;
      return typeof d === "number" ? d : OPEN_MS;
    } catch (_) {
      return OPEN_MS;
    }
  }

  // Settle finals FIRST, then cancel — never cancel into a pre-anim flash.
  // Avoid commitStyles (iOS leftovers); caller writes inline finals in `settle`.
  function runGroup(animations, timeoutMs, settle) {
    if (!animations.length) {
      if (typeof settle === "function") settle();
      return Promise.resolve();
    }
    const ms =
      timeoutMs != null
        ? timeoutMs
        : Math.max.apply(null, animations.map(animDuration)) + 320;
    const done = Promise.all(animations.map((a) => a.finished.catch(() => {})));
    return Promise.race([done, wait(ms)]).then(() => {
      if (typeof settle === "function") settle();
      for (const a of animations) {
        try { a.cancel(); } catch (_) {}
      }
    });
  }

  function disposeFlyer(flyer) {
    if (!flyer) {
      if (stage) stage.innerHTML = "";
      return;
    }
    try {
      flyer.getAnimations({ subtree: true }).forEach((a) => {
        try { a.cancel(); } catch (_) {}
      });
    } catch (_) {}
    flyer.style.opacity = "0";
    flyer.style.visibility = "hidden";
    flyer.style.pointerEvents = "none";
    demote(flyer);
    if (flyer._left) demote(flyer._left);
    if (flyer._right) demote(flyer._right);
    if (flyer._cover) demote(flyer._cover);
    if (flyer._book) demote(flyer._book);
    if (flyer._front) demote(flyer._front);
    try { flyer.remove(); } catch (_) {}
    if (stage) stage.innerHTML = "";
  }

  function restoreSlot(el, book) {
    if (!el) return;
    try {
      el.getAnimations({ subtree: true }).forEach((a) => {
        try { a.cancel(); } catch (_) {}
      });
    } catch (_) {}
    el.classList.remove(
      "is-placeholder",
      "is-opening",
      "is-landing",
      "is-expanded",
      "is-collapsing"
    );
    // Explicit removeProperty — kills commitStyles leftovers like opacity:0 / transform
    [
      "width",
      "height",
      "min-width",
      "min-height",
      "flex-shrink",
      "transition",
      "opacity",
      "visibility",
      "transform",
      "filter",
      "will-change",
      "display",
      "pointer-events",
    ].forEach((prop) => {
      try { el.style.removeProperty(prop); } catch (_) {}
    });
    // ux25: after clearing height, re-pin natural cover face — ban CSS 154/178 taller plate
    if (book && el.classList.contains("cover") && book.cover) {
      applyFaceSize(el, book);
    } else if (book && el.classList.contains("spine") && book.cover && !book.filler) {
      applyFaceSize(el, book);
    }
  }

  function pageLinesHtml(title) {
    // ux26: kept as thin alias — dual pages use leftPageHtml / rightPageHtml
    return leftPageHtml({ title: title || "" });
  }

  // §10 held-book flyer: board + dual leaves + gutter + thickness + foot shadow.
  // Closed: left leaf rotateY(180°) (cover on right half). Open: modest ±Y V + book rotateX.
  function makeFlyer(book, atRect, { spineShape, spreadOpen = false } = {}) {
    const flyer = document.createElement("div");
    flyer.className = "flyer";

    const shadow = document.createElement("div");
    shadow.className = "flyer-shadow";

    const bookEl = document.createElement("div");
    bookEl.className = "flyer-book";

    const board = document.createElement("div");
    board.className = "flyer-board";

    const left = document.createElement("div");
    left.className = "flyer-leaf flyer-leaf-left";
    const leftThick = document.createElement("div");
    leftThick.className = "flyer-thickness";
    const leftPage = document.createElement("div");
    leftPage.className = "flyer-face flyer-face-page";
    leftPage.innerHTML = leftPageHtml(book);
    const cover = document.createElement("div");
    cover.className = ("flyer-face flyer-face-cover " + bkClass(book) + " " + coverClass(book)).trim();
    if (spineShape) {
      cover.classList.add("is-spine-face");
      const label = document.createElement("span");
      label.className = "flyer-spine-label";
      label.textContent = book.spine;
      cover.appendChild(label);
    } else {
      cover.classList.add("is-cover-ready");
    }
    applyCoverImage(cover, book);
    left.appendChild(leftThick);
    left.appendChild(leftPage);
    left.appendChild(cover);

    const right = document.createElement("div");
    right.className = "flyer-leaf flyer-leaf-right";
    const rightThick = document.createElement("div");
    rightThick.className = "flyer-thickness";
    const rightPage = document.createElement("div");
    rightPage.className = "flyer-face flyer-face-page";
    rightPage.innerHTML = rightPageHtml(book);
    right.appendChild(rightThick);
    right.appendChild(rightPage);

    const gutter = document.createElement("div");
    gutter.className = "flyer-gutter";

    bookEl.appendChild(board);
    bookEl.appendChild(left);
    bookEl.appendChild(right);
    bookEl.appendChild(gutter);
    flyer.appendChild(shadow);
    flyer.appendChild(bookEl);

    flyer._left = left;
    flyer._right = right;
    flyer._cover = cover;
    flyer._front = cover;
    flyer._shadow = shadow;
    flyer._book = bookEl;
    flyer._gutter = gutter;
    flyer._board = board;
    flyer._leftThick = leftThick;
    flyer._rightThick = rightThick;
    flyer._leftPage = leftPage;
    flyer._rightPage = rightPage;
    applyFlyerPalette(flyer, book);

    const mid = midRect(book);
    flyer.style.width = mid.width + "px";
    flyer.style.height = mid.height + "px";
    flyer.style.left = mid.left + "px";
    flyer.style.top = mid.top + "px";

    if (spreadOpen) {
      left.style.transform = "rotateY(8deg)";
      right.style.transform = "rotateY(-8deg)";
      bookEl.style.transform = "rotateX(8deg) translate3d(0,0,0)";
      gutter.style.opacity = "1";
      flyer.style.transform = "translate3d(0px, -4px, 0) scale(1)";
      flyer.style.opacity = "1";
    } else {
      // ux10: closed extract must look like ONE cover/spine — hide board + right page
      // so scaled dual-mid does not show brown+white flattened in the slot (ux9 fail).
      left.style.transform = "rotateY(180deg)";
      right.style.transform = "rotateY(0deg)";
      right.style.opacity = "0";
      board.style.opacity = "0";
      leftThick.style.opacity = "0";
      rightThick.style.opacity = "0";
      bookEl.style.transform = "rotateX(8deg) translate3d(0,0,0)";
      gutter.style.opacity = "0";
      flyer.style.transform = closedCoverTransform(atRect, mid);
      flyer.style.opacity = "1";
    }
    stage.appendChild(flyer);
    return flyer;
  }

  function promote(el) {
    if (!el) return;
    el.classList.add("is-ready");
    el.style.willChange = "transform, opacity";
  }

  function demote(el) {
    if (!el) return;
    el.classList.remove("is-ready");
    el.style.willChange = "auto";
  }

  function setVeilOrigin(x, y) {
    if (!openVeil) return;
    openVeil.style.setProperty("--vx", ((x / window.innerWidth) * 100).toFixed(2) + "%");
    openVeil.style.setProperty("--vy", ((y / window.innerHeight) * 100).toFixed(2) + "%");
  }

  function resetVeil() {
    if (!openVeil) return;
    openVeil.classList.remove("is-on");
    openVeil.style.opacity = "";
    if (openVeilBlob) {
      openVeilBlob.style.transform = "";
      openVeilBlob.style.opacity = "";
      demote(openVeilBlob);
    }
  }

  function armBackdrop({ solid = false } = {}) {
    if (!openBackdrop) return;
    openBackdrop.classList.add("is-on");
    openBackdrop.classList.toggle("is-solid", !!solid);
    openBackdrop.style.opacity = solid ? "1" : "";
  }

  function resetBackdrop() {
    if (!openBackdrop) return;
    openBackdrop.classList.remove("is-on", "is-solid");
    openBackdrop.style.opacity = "";
  }


  function armVeilAt(originX, originY, { full = false } = {}) {
    setVeilOrigin(originX, originY);
    openVeil.classList.add("is-on");
    openVeil.style.opacity = "1";
    if (openVeilBlob) {
      openVeilBlob.style.transform = full
        ? "translateZ(0) scale(1)"
        : "translateZ(0) scale(0)";
      openVeilBlob.style.opacity = "1";
      promote(openVeilBlob);
    }
  }

  async function prepareNote(book, cat) {
    fillNote(book, cat);
    noteView.hidden = false;
    noteView.classList.add("is-preparing");
    noteView.classList.remove("is-open");
    noteView.style.opacity = "0";
    const coverEl = $("#noteCover");
    const bg = coverEl && getComputedStyle(coverEl).backgroundImage;
    const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (m) {
      try {
        const img = new Image();
        img.src = m[1];
        const DECODE_MS = 400;
        const decodeOrLoad = img.decode
          ? img.decode()
          : new Promise((res) => { img.onload = res; img.onerror = res; });
        // Never hang open on a stuck decode (e.g. 代码整洁之道).
        await Promise.race([decodeOrLoad.catch(() => {}), wait(DECODE_MS)]);
      } catch (_) {}
    }
    void noteView.offsetWidth;
  }

  function preloadCovers() {
    for (const cat of CATALOG) {
      for (const book of cat.books) {
        if (!book.cover) continue;
        const img = new Image();
        img.src = coverSrc(book);
        const capture = () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            COVER_NAT[book.id] = [img.naturalWidth, img.naturalHeight];
          }
        };
        img.onload = () => {
          capture();
          // Re-apply resting sizes once we know real aspect (no mode flip).
          if (!openBook && !busy) {
            document.querySelectorAll(`.cover[data-book-id="${book.id}"], .spine[data-book-id="${book.id}"]`).forEach((el) => {
              const expanded = el.classList.contains("is-expanded");
              applyFaceSize(el, book, { expanded });
            });
          }
        };
        if (img.decode) img.decode().then(capture).catch(() => {});
      }
    }
  }

  function clearGhost(el) {
    restoreSlot(el);
  }

  async function openBookFlow(book, cat, sourceEl, { fromExpanded, asSpine }) {
    if (busy) return;
    busy = true;
    const myFlow = ++flowSeq;
    document.body.classList.add("is-busy");
    openBook = { book, cat, asSpine, fromExpanded: !!fromExpanded, openSeatRect: null };
    openFromExpanded = !!fromExpanded;

    // ux6b: freeze window scroll to idle/expand home (face-out stuck ~197px up).
    // Face-out: keep FIRST pin from expandSpine (idle Y). Do NOT re-sample here —
    // scrollIntoView / focus may already have drifted scrollY before this runs.
    if (!fromExpanded) rememberScrollHome();
    armScrollLock();
    try {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    } catch (_) {}

    try {
      await prepareNote(book, cat);
    } catch (_) {
      // Decode/prepare failed — still open; never leave is-busy hung.
    }

    if (reduceMotion()) {
      sourceEl.classList.add("is-placeholder");
      if (fromExpanded) {
        expandedId = null;
        sourceEl.classList.remove("is-expanded", "is-collapsing");
      }
      noteView.classList.remove("is-preparing");
      noteView.classList.add("is-open");
      noteView.style.opacity = "1";
      parkShelf();
      releaseScrollLock();
      busy = false;
      document.body.classList.remove("is-busy");
      return;
    }

    try {
    // ux14 PATH-SHAKE ①: clear hover lift FIRST, then freeze source rect — ban fighting hover coords.
    cancelCollapse();
    sourceEl.style.transition = "none";
    sourceEl.style.transform = "none"; // kill :hover translateY / is-expanded lift
    sourceEl.classList.add("is-extracting"); // CSS: suppress :hover transform while extracting
    if (fromExpanded) {
      sourceEl.classList.remove("is-expanded", "is-collapsing");
      [
        "width",
        "height",
        "min-width",
        "min-height",
        "flex-shrink",
      ].forEach((p) => {
        try { sourceEl.style.removeProperty(p); } catch (_) {}
      });
      expandedId = null;
      touchExpandedId = null;
      void sourceEl.offsetWidth; // reflow to natural spine (transform already none)
    } else {
      // Even spine-direct: pointer may still be hovering → :hover lift would skew freeze.
      void sourceEl.offsetWidth;
    }
    // ux25: pin natural cover face BEFORE measure — frame height stable open→land
    if (sourceEl.classList.contains("cover") && book && book.cover) {
      sourceEl.style.transform = "none";
      applyFaceSize(sourceEl, book);
      void sourceEl.offsetWidth;
    }
    const homeRect = copyRect(rectOf(sourceEl));
    if (sourceEl.classList.contains("cover") && book && book.cover) {
      // Force home to natural W×H (ignore hover scale / fallback CSS taller box)
      homeRect.width = coverWidthPx();
      homeRect.height = bookFaceHeight(book);
      homeRect.top = Math.round(homeRect.top + (rectOf(sourceEl).height - homeRect.height));
    }
    if (openBook) {
      openBook.homeRect = { ...homeRect };
      openBook.homeMode = sourceEl.classList.contains("spine") ? "spines" : "covers";
      openBook.openSeatRect = { ...homeRect };
    }
    const startRect = homeRect;
    const mid = midRect(book);
    const originX = mid.left + mid.width / 2;
    const originY = mid.top + mid.height / 2;
    void originX;
    void originY;

    // ux14: ONE continuous dual layer; frame-0 locked to homeRect (no closedBookRect snap).
    // ux15: spine-wall extract T0 = standing spine overlay; cover morphs in after leaving slot.
    const wp = buildSlotWaypoints(homeRect, mid);
    const startAsSpine =
      !!asSpine ||
      (sourceEl && sourceEl.classList.contains("spine")) ||
      (openBook && openBook.homeMode === "spines");
    const dual = makeFlyer(book, homeRect, { spineShape: false, spreadOpen: false });
    dual.style.zIndex = "70";
    dual.style.opacity = "1";
    promote(dual);
    dual._cover.classList.add("is-cover-ready");
    dual._cover.classList.remove("is-spine-face");
    const spineLabel = dual._cover.querySelector(".flyer-spine-label");
    if (spineLabel) spineLabel.style.opacity = "0";
    applyCoverImage(dual._cover, book);
    // ux24: covers keep bg url under img (no preferImg clear → no naked plate on lift)
    if (startAsSpine) preferImgOverBg(dual._cover);
    // ux16: full-height spine-slot flyer at homeRect (not scaled dual stub).
    let spineSlot = null;
    let spineOut = { x: 0, y: 0 };
    const extractCoverImg = dual._cover.querySelector(":scope > .flyer-cover-img");
    if (startAsSpine) {
      spineOut = spineSlotOutDelta(homeRect, mid);
      spineSlot = makeSpineSlotFlyer(book, homeRect, { opacity: 1 });
      // Dual stays under spine until after leaving slot — hide stub geometry.
      dual.style.opacity = "0";
      if (extractCoverImg) extractCoverImg.style.opacity = "0";
      dual._cover.style.backgroundImage = "none";
      if (openBook) {
        openBook.spineOut = { ...spineOut };
        openBook.spineHome = copyRect(homeRect);
      }
    }
    // ux24: spines may clear to img-only; covers keep applyCoverImage (no wood flash)
    if (startAsSpine) await awaitCloseCoverReady(dual._cover, book, 400);
    else {
      applyCoverImage(dual._cover, book);
      const img = dual._cover && dual._cover.querySelector(":scope > .flyer-cover-img");
      if (img) { img.style.opacity = "1"; img.style.visibility = "visible"; }
    }
    if (startAsSpine) {
      if (extractCoverImg) extractCoverImg.style.opacity = "1"; // ready for morph-in
      // Dual still opacity 0 until spine slides out.
      dual.style.opacity = "0";
    }

    // Hide slot completely — ux13: opacity 0 (CSS placeholder no longer gray plate).
    sourceEl.style.width = homeRect.width + "px";
    sourceEl.style.height = homeRect.height + "px";
    sourceEl.style.opacity = "0";
    sourceEl.style.pointerEvents = "none";
    sourceEl.style.transition = "none";
    sourceEl.classList.add("is-placeholder");

    // Soft veil only — shelf stays under book (kills “floating on cream void”).
    armBackdrop({ solid: false });
    unparkShelf();
    shelfView.classList.add("is-frozen");
    shelfView.style.opacity = "1";

    // ux13: rAF can stall in headless/harness — race with short timer
    await Promise.race([
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      wait(32),
    ]);

    // §12+§13 ux13: LINEAR wall clock; single dual layer extract→hinge→note-on-top.
    const opts = { duration: OPEN_MS, easing: "linear", fill: "forwards" };
    const optsMotion = { duration: OPEN_MS, easing: "linear", fill: "forwards" };

    // ONE diagonal arc: T0→Tfull with X/Y/scale same beat (ban L: lift then horizontal jump).
    const T0 = wp.T0;
    const Tp1 = wp.Tp1;
    const Tp2 = wp.Tp2;
    const Tp3 = wp.Tp3;
    const Tfull = wp.Tfull;
    // Aliases kept so hinge timing still keys off "arrived near full".
    const TdualClosed = Tp2; // mid-arc (closed pose still; hinge starts around here)
    const Tgrow = Tp3;
    const Tnear = lerpTS(Tp3, Tfull, 0.5);
    if (openBook) {
      openBook.pathMid = copyRect(mid);
      openBook.pathTs = { T0, Tp1, Tp2, Tp3, TdualClosed, Tgrow, Tnear, Tfull };
      openBook.pathWp = wp;
    }

    // Same dual: single diagonal to full — no hold-then-slide second segment.
    const aDualMove = dual.animate(
      [
        { offset: 0, transform: T0 },
        { offset: 0.12, transform: Tp1 },
        { offset: 0.28, transform: Tp2 },
        { offset: 0.44, transform: Tp3 },
        { offset: 0.58, transform: Tfull },
        { offset: 0.78, transform: Tfull },
        { offset: 1.0, transform: Tfull },
      ],
      optsMotion
    );
    // Stay visible under note fade; only yield after note is solid (no hard cut).
    // ux16 spine extract: dual hidden until spine leaves slot (~0.14), then take over.
    const aDualFade = dual.animate(
      startAsSpine
        ? [
            { offset: 0, opacity: 0 },
            { offset: 0.14, opacity: 0 },
            { offset: 0.22, opacity: 1 },
            { offset: 0.90, opacity: 1 },
            { offset: 0.96, opacity: 0.35 },
            { offset: 1.0, opacity: 0 },
          ]
        : [
            { offset: 0, opacity: 1 },
            { offset: 0.90, opacity: 1 },
            { offset: 0.96, opacity: 0.35 },
            { offset: 1.0, opacity: 0 },
          ],
      opts
    );

    // ux16: full-height spine slides out of slot, then yields to dual cover path.
    const outXf = `translate3d(${spineOut.x.toFixed(2)}px, ${spineOut.y.toFixed(2)}px, 0)`;
    const outXf2 = `translate3d(${(spineOut.x * 1.35).toFixed(2)}px, ${(spineOut.y * 1.35).toFixed(2)}px, 0)`;
    const aSpineSlot = spineSlot
      ? spineSlot.animate(
          [
            { offset: 0, transform: "translate3d(0px, 0px, 0)", opacity: 1 },
            { offset: 0.10, transform: outXf, opacity: 1 },
            { offset: 0.14, transform: outXf2, opacity: 1 },
            { offset: 0.22, transform: outXf2, opacity: 0 },
            { offset: 1.0, transform: outXf2, opacity: 0 },
          ],
          optsMotion
        )
      : null;
    const aExtractPlate = null;
    const aExtractLabel = null;
    const aExtractCoverIn = null;

    // Pose fade on SAME layer while diagonal continues — ban origin-swapping phase.
    const closedFaceKf = [
      { offset: 0, opacity: 0 },
      { offset: 0.28, opacity: 0 },
      { offset: 0.40, opacity: 0.35 },
      { offset: 0.52, opacity: 1 },
      { offset: 1.0, opacity: 1 },
    ];
    const aBoard = dual._board ? dual._board.animate(closedFaceKf, opts) : null;
    const aRightFace = dual._right.animate(
      [
        { offset: 0, opacity: 0, transform: "rotateY(0deg)" },
        { offset: 0.28, opacity: 0, transform: "rotateY(0deg)" },
        { offset: 0.40, opacity: 0.5, transform: "rotateY(-2deg)" },
        { offset: 0.52, opacity: 1, transform: "rotateY(-6deg)" },
        { offset: 0.62, opacity: 1, transform: "rotateY(-8deg)" },
        { offset: 1.0, opacity: 1, transform: "rotateY(-8deg)" },
      ],
      optsMotion
    );
    const aThickL = dual._leftThick ? dual._leftThick.animate(closedFaceKf, opts) : null;
    const aThickR = dual._rightThick ? dual._rightThick.animate(closedFaceKf, opts) : null;

    const aLeft = dual._left.animate(
      [
        { offset: 0, transform: "rotateY(180deg)" },
        { offset: 0.28, transform: "rotateY(180deg)" },
        { offset: 0.38, transform: "rotateY(140deg)" },
        { offset: 0.48, transform: "rotateY(70deg)" },
        { offset: 0.56, transform: "rotateY(20deg)" },
        { offset: 0.64, transform: "rotateY(8deg)" },
        { offset: 1.0, transform: "rotateY(8deg)" },
      ],
      optsMotion
    );
    void aRightFace; // hinge tracked as aRightFace in group

    const aGutter = dual._gutter
      ? dual._gutter.animate(
          [
            { offset: 0, opacity: 0 },
            { offset: 0.48, opacity: 0 },
            { offset: 0.58, opacity: 1 },
            { offset: 1.0, opacity: 1 },
          ],
          opts
        )
      : null;

    // §12: note main rise offset 0.70–0.92 (≥1.80s clear). FORBIDDEN: ≥0.95 at 0.34.
    const aNote = noteView.animate(
      [
        { offset: 0, opacity: 0 },
        { offset: 0.65, opacity: 0 },
        { offset: 0.70, opacity: 0.15 },
        { offset: 0.78, opacity: 0.55 },
        { offset: 0.85, opacity: 0.90 },
        { offset: 0.90, opacity: 0.99 },
        { offset: 0.92, opacity: 1 },
        { offset: 1.0, opacity: 1 },
      ],
      opts
    );

    const aBack = openBackdrop
      ? openBackdrop.animate(
          [
            { offset: 0, opacity: 0.35 },
            { offset: 0.45, opacity: 0.45 },
            { offset: 0.73, opacity: 0.55 },
            { offset: 0.90, opacity: 0.85 },
            { offset: 1.0, opacity: 1 },
          ],
          opts
        )
      : null;

    const group = [aDualMove, aDualFade, aLeft, aRightFace, aNote].filter(Boolean);
    if (aBoard) group.push(aBoard);
    if (aThickL) group.push(aThickL);
    if (aThickR) group.push(aThickR);
    if (aGutter) group.push(aGutter);
    if (aBack) group.push(aBack);
    if (aExtractPlate) group.push(aExtractPlate);
    if (aExtractLabel) group.push(aExtractLabel);
    if (aExtractCoverIn) group.push(aExtractCoverIn);
    if (aSpineSlot) group.push(aSpineSlot);

    let flyerAlive = true;
    let clicksUnlocked = false;
    const settleNoteSolid = () => {
      noteView.style.opacity = "1";
      noteView.classList.remove("is-preparing");
      noteView.classList.add("is-open");
    };
    const unlockNoteClicks = () => {
      if (clicksUnlocked) return;
      clicksUnlocked = true;
      settleNoteSolid();
      // ux13: do NOT parkShelf here — parking mid-flight is the ~3–4s hard cut
      // (shelf vanishes while book layer still handing off). Keep shelf under note.
      if (myFlow === flowSeq) {
        document.body.classList.remove("is-busy");
        busy = false;
      }
    };
    const holdFlyerUnderNote = () => {
      if (!flyerAlive) return;
      flyerAlive = false;
      try {
        // Commit end pose so close can time-reverse the SAME layer (PATH-SHAKE ②).
        dual.getAnimations({ subtree: true }).forEach((a) => {
          try { a.commitStyles(); } catch (_) {}
          try { a.cancel(); } catch (_) {}
        });
      } catch (_) {}
      dual.style.opacity = "0";
      dual.style.pointerEvents = "none";
      dual.style.visibility = "visible";
      if (openBook) openBook.heldFlyer = dual;
    };

    // Unlock once note is solid (≥0.99 ≈ offset 0.90 → ~2340ms; §12 ≥2.20s)
    const unlockAt = Math.round(OPEN_MS * 0.90);
    wait(unlockAt).then(() => {
      if (myFlow !== flowSeq) return;
      unlockNoteClicks();
    });

    try {
      await runGroup(group, OPEN_MS + 400, () => {
        if (myFlow === flowSeq) {
          settleNoteSolid();
          unlockNoteClicks();
        }
      });
    } finally {
      // ux14: keep SAME dual under note (opacity 0) — ban dispose→new-flyer layer swap on close.
      disposeSpineSlot(spineSlot);
      spineSlot = null;
      if (myFlow === flowSeq) {
        settleNoteSolid();
        unlockNoteClicks();
        holdFlyerUnderNote();
        parkShelf();
        restoreSlot(sourceEl, book);
        sourceEl.classList.remove("is-extracting");
        // Keep sourceEl as invisible reserved seat while note open (no gray plate).
        sourceEl.classList.add("is-placeholder");
        sourceEl.style.opacity = "0";
        sourceEl.style.pointerEvents = "none";
        resetVeil();
        resetBackdrop();
        shelfView.classList.remove("is-frozen", "is-dim");
        busy = false;
        document.body.classList.remove("is-busy");
      }
    }
    } catch (err) {
      if (myFlow === flowSeq) {
        try { resetVeil(); } catch (_) {}
        try { resetBackdrop(); } catch (_) {}
        try { noteView.classList.remove("is-preparing"); } catch (_) {}
        try { shelfView.classList.remove("is-frozen", "is-dim"); } catch (_) {}
        try { releaseScrollLock(); } catch (_) {}
        busy = false;
        document.body.classList.remove("is-busy");
      }
      throw err;
    }
  }

  async function closeBookFlow() {
    if (busy || !openBook) return;
    busy = true;
    const myFlow = ++flowSeq;
    document.body.classList.add("is-busy");

    const { book } = openBook;
    const targetMode = pageMode;

    if (reduceMotion()) {
      noteView.classList.remove("is-open", "is-preparing");
      noteView.hidden = true;
      noteView.style.opacity = "";
      expandedId = null;
      openFromExpanded = false;
      unparkShelf();
      renderShelf();
      clearGhost(
        targetMode === "covers"
          ? $(`.cover[data-book-id="${book.id}"]`)
          : $(`.spine[data-book-id="${book.id}"]`)
      );
      openBook = null;
      releaseScrollLock();
      busy = false;
      document.body.classList.remove("is-busy");
      return;
    }

    const mid = midRect(book);
    const originX = mid.left + mid.width / 2;
    const originY = mid.top + mid.height / 2;

    // Keep shelf in layout (park ≠ display:none).
    // ux12: HIDE slot BEFORE unpark — kills resting-spine flash on face-out close.
    // ux6b: re-arm scroll lock before unpark — open may have released early.
    if (!scrollLock) armScrollLock();
    else writeScroll(scrollLock);

    const slotSel =
      targetMode === "covers"
        ? `.cover[data-book-id="${book.id}"]`
        : `.spine[data-book-id="${book.id}"]`;
    let slot = $(slotSel);
    if (!slot) {
      // Still parked — safe to render without a visible flash
      unparkShelf();
      shelfView.style.opacity = "1";
      renderShelf();
      slot = $(slotSel);
    }
    if (!slot) {
      noteView.classList.remove("is-open", "is-preparing");
      noteView.hidden = true;
      openBook = null;
      busy = false;
      document.body.classList.remove("is-busy");
      return;
    }

    // Pin seat geometry WHILE still parked (invisible), then unpark.
    // ux13 gate⑤: ALWAYS land as resting spine — never keep hover face-out foot.
    // Clear open-path inline size FIRST (face-out open pins expanded W×H) before measure.
    slot.style.transition = "none";
    [
      "width",
      "height",
      "min-width",
      "min-height",
      "flex-shrink",
      "transform",
    ].forEach((p) => {
      try { slot.style.removeProperty(p); } catch (_) {}
    });
    slot.classList.remove("is-collapsing", "is-placeholder", "is-expanded");
    expandedId = null;
    void slot.offsetWidth; // reflow to natural spine after class/inline clear
    const naturalW = slot.offsetWidth;
    const naturalH = slot.offsetHeight;
    slot.style.flexShrink = "0";
    slot.style.width = naturalW + "px";
    slot.style.minWidth = naturalW + "px";
    slot.style.height = naturalH + "px";
    slot.style.minHeight = naturalH + "px";
    slot.style.transform = "none";
    slot.style.opacity = "0";
    slot.style.pointerEvents = "none";

    // Pin EVERY cover/spine row to resting height so unfreeze cannot reflow.
    shelfView.querySelectorAll(".covers, .spines").forEach((r) => {
      const h = Math.round(r.getBoundingClientRect().height);
      if (h > 0) r.style.minHeight = h + "px";
    });
    const shelfPinH = Math.round(shelfView.getBoundingClientRect().height);
    if (shelfPinH > 0) shelfView.style.minHeight = shelfPinH + "px";
    shelfView.querySelectorAll(".cover, .spine").forEach((el) => {
      if (el === slot) return;
      el.style.transition = "none";
      el.style.transform = "none";
      // ux13: pin neighbor opacity at 1 for whole close clock — ban ~6s opacity snap
      el.style.opacity = "1";
    });
    shelfView.classList.add("is-frozen");

    // ux13: prepare shelf+flyer UNDER opaque note — ban route hard-cut then mid-air resume.
    // Keep note is-open + opacity 1 until reverse clock starts.
    noteView.classList.add("is-open");
    noteView.classList.remove("is-preparing");
    noteView.hidden = false;
    noteView.style.opacity = "1";
    noteView.style.zIndex = "75";

    unparkShelf();
    shelfView.style.opacity = "1";
    await Promise.race([
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      wait(32),
    ]);
    // ux14 MOTION LOCK: prefer frozen homeRect from open — never remeasure mid-flight for path.
    // Remeasure only if open stash missing; path end keyframe MUST be that homeRect.
    const frozenHome =
      (openBook && openBook.homeRect && openBook.homeRect.width > 0)
        ? copyRect(openBook.homeRect)
        : copyRect(rectOf(slot));
    // ux25: covers seat = natural face only — never taller CSS/preset box at land
    if (targetMode === "covers" && book && book.cover) {
      const natW = coverWidthPx();
      const natH = bookFaceHeight(book);
      const bottom = frozenHome.top + frozenHome.height;
      frozenHome.width = natW;
      frozenHome.height = natH;
      frozenHome.top = Math.round(bottom - natH);
    }
    slot.style.width = frozenHome.width + "px";
    slot.style.minWidth = frozenHome.width + "px";
    slot.style.height = frozenHome.height + "px";
    slot.style.minHeight = frozenHome.height + "px";
    const endRect = frozenHome;

    armBackdrop({ solid: false });

    // ux14: SAME dual layer + pathTransform as open (ban cardToSlot / approach seek chain).
    const pathMid = (openBook && openBook.pathMid) ? copyRect(openBook.pathMid) : mid;
    const wp =
      (openBook && openBook.pathWp)
        ? openBook.pathWp
        : buildSlotWaypoints(frozenHome, pathMid);
    const stashTs = openBook && openBook.pathTs;
    const T0 = stashTs ? stashTs.T0 : (wp.T0 || pathTransform(frozenHome, pathMid));
    const Tp1 = stashTs ? stashTs.Tp1 : (wp.Tp1 || lerpTS(T0, wp.Tfull || "translate(0.00px, -4.00px) scale(1.0000)", 0.25));
    const Tp2 = stashTs ? stashTs.Tp2 : (wp.Tp2 || lerpTS(T0, wp.Tfull || "translate(0.00px, -4.00px) scale(1.0000)", 0.50));
    const Tp3 = stashTs ? stashTs.Tp3 : (wp.Tp3 || lerpTS(T0, wp.Tfull || "translate(0.00px, -4.00px) scale(1.0000)", 0.75));
    const Tfull = stashTs ? stashTs.Tfull : (wp.Tfull || "translate(0.00px, -4.00px) scale(1.0000)");
    const TdualClosed = stashTs ? stashTs.TdualClosed : Tp2;
    const Tgrow = stashTs ? stashTs.Tgrow : Tp3;
    const Tnear = stashTs ? stashTs.Tnear : lerpTS(Tp3, Tfull, 0.5);
    void TdualClosed;
    void Tgrow;
    void Tnear;
    void endRect;

    // ux14 PATH-SHAKE ②: reuse SAME dual held under note — ban new-layer origin pop (~6.2s).
    let flyer = openBook && openBook.heldFlyer;
    const reused = !!(flyer && flyer.isConnected);
    if (!reused) {
      flyer = makeFlyer(book, frozenHome, { spineShape: false, spreadOpen: true });
    }
    flyer.style.zIndex = "70";
    flyer.style.visibility = "visible";
    flyer.style.opacity = "0"; // stay hidden under note until reverse clock
    flyer.style.transform = Tfull; // start at open end pose (transform-aligned)
    promote(flyer);
    if (flyer._cover) {
      flyer._cover.classList.add("is-cover-ready");
      flyer._cover.classList.remove("is-spine-face");
      applyCoverImage(flyer._cover, book);
      // ux23: covers-mode keep CSS/bg url under <img> — fading img must not expose brown board
      if (targetMode === "spines") preferImgOverBg(flyer._cover);
      else {
        const img = flyer._cover.querySelector(":scope > .flyer-cover-img");
        if (img) {
          img.style.opacity = "1";
          img.style.visibility = "visible";
        }
      }
    }
    // Ensure open-spread leaf pose at Tfull so reverse hinge is continuous (under note).
    if (flyer._left) flyer._left.style.transform = "rotateY(8deg)";
    if (flyer._right) {
      flyer._right.style.transform = "rotateY(-8deg)";
      flyer._right.style.opacity = "1";
    }
    if (flyer._board) flyer._board.style.opacity = "1";
    if (flyer._leftThick) flyer._leftThick.style.opacity = "1";
    if (flyer._rightThick) flyer._rightThick.style.opacity = "1";
    if (flyer._gutter) flyer._gutter.style.opacity = "1";
    const closeSpineLabel = flyer._cover && flyer._cover.querySelector(".flyer-spine-label");
    if (closeSpineLabel) closeSpineLabel.style.opacity = "0";
    // ux23: spines may swap to img-only; covers keep applyCoverImage bg under img
    const readyPulse =
      targetMode === "spines"
        ? awaitCloseCoverReady(flyer._cover, book, 150)
        : (async () => {
            applyCoverImage(flyer._cover, book);
            const img = flyer._cover && flyer._cover.querySelector(":scope > .flyer-cover-img");
            if (img) {
              img.style.opacity = "1";
              img.style.visibility = "visible";
            }
          })();
    const coverImgEl = flyer._cover && flyer._cover.querySelector(".flyer-cover-img");
    void coverImgEl;
    void reused;

    let landLabel = null;
    let landPlate = null;
    // ux16: full-height spine-slot flyer for insert — not scaled dual stub plate.
    if (flyer._cover) {
      flyer._cover
        .querySelectorAll(":scope > .flyer-spine-land-plate, :scope > .flyer-spine-label")
        .forEach((n) => {
          try { n.remove(); } catch (_) {}
        });
    }
    let spineSlotClose = null;
    let spineOutClose = { x: 0, y: 0 };
    if (targetMode === "spines") {
      const spineHome =
        (openBook && openBook.spineHome && openBook.spineHome.width > 0)
          ? copyRect(openBook.spineHome)
          : copyRect(frozenHome);
      spineOutClose =
        (openBook && openBook.spineOut)
          ? { ...openBook.spineOut }
          : spineSlotOutDelta(spineHome, pathMid);
      spineSlotClose = makeSpineSlotFlyer(book, spineHome, { opacity: 0 });
      spineSlotClose.style.transform =
        `translate3d(${spineOutClose.x.toFixed(2)}px, ${spineOutClose.y.toFixed(2)}px, 0)`;
    }

    // One frame then start reverse clock — note still fully covering.
    await Promise.race([
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      wait(32),
    ]);
    void readyPulse;
    flyer.style.opacity = "1"; // book layer present under note as reverse begins

    // ux14: TIME-REVERSE of open pathTs — ban separately computed return / end-segment seek.
    const PUT_MS = 380;
    const XFADE_MS = 200;
    const putFrom = 1 - PUT_MS / CLOSE_MS; // ~0.80
    const xfadeFrom = 1 - XFADE_MS / CLOSE_MS; // ~0.89
    const slotInAt = Math.max(0.86, xfadeFrom - 0.04);
    const flyerFadeAt = Math.min(0.97, slotInAt + 0.06);
    const closeOpts = { duration: CLOSE_MS, easing: "linear", fill: "forwards" };
    const closeMotion = { duration: CLOSE_MS, easing: "linear", fill: "forwards" };

    resetVeil();

    // ux13: note fades ON the book layer while reverse shrink starts — ban instant note unmount.
    const aNoteOut = noteView.animate(
      [
        { offset: 0, opacity: 1 },
        { offset: 0.06, opacity: 0.85 },
        { offset: 0.12, opacity: 0.45 },
        { offset: 0.22, opacity: 0 },
        { offset: 1.0, opacity: 0 },
      ],
      closeOpts
    );

    // Open extract was 0→0.32 (T0→Tp1→Tp2→TdualClosed), grow 0.40→0.78.
    // Close: reverse grow then reverse extract; end = T0 (frozen home) — no approach snap.
    // TIME-REVERSE of open diagonal — same Ts, no L hang-then-drop.
    const aFlyerMove = flyer.animate(
      [
        { offset: 0, transform: Tfull },
        { offset: 0.12, transform: Tfull },
        { offset: 0.28, transform: Tp3 },
        { offset: 0.44, transform: Tp2 },
        { offset: 0.60, transform: Tp1 },
        { offset: 0.78, transform: T0 },
        { offset: 0.90, transform: T0 },
        { offset: 1.0, transform: T0 },
      ],
      closeMotion
    );
    // Reverse hinge on SAME layer while shrink (open was 0.32→0.68 hinge).
    const aLeftClose = flyer._left
      ? flyer._left.animate(
          [
            { offset: 0, transform: "rotateY(8deg)" },
            { offset: 0.08, transform: "rotateY(20deg)" },
            { offset: 0.16, transform: "rotateY(70deg)" },
            { offset: 0.24, transform: "rotateY(140deg)" },
            { offset: 0.32, transform: "rotateY(180deg)" },
            { offset: 1.0, transform: "rotateY(180deg)" },
          ],
          closeMotion
        )
      : null;
    const aRightClose = flyer._right
      ? flyer._right.animate(
          [
            { offset: 0, opacity: 1, transform: "rotateY(-8deg)" },
            { offset: 0.20, opacity: 1, transform: "rotateY(-4deg)" },
            { offset: 0.32, opacity: 0, transform: "rotateY(0deg)" },
            { offset: 1.0, opacity: 0, transform: "rotateY(0deg)" },
          ],
          closeMotion
        )
      : null;
    const closedFaceOut = [
      { offset: 0, opacity: 1 },
      { offset: 0.18, opacity: 0.7 },
      { offset: 0.28, opacity: 0 },
      { offset: 1.0, opacity: 0 },
    ];
    const aBoardClose = flyer._board ? flyer._board.animate(closedFaceOut, closeOpts) : null;
    const aThickLClose = flyer._leftThick ? flyer._leftThick.animate(closedFaceOut, closeOpts) : null;
    const aThickRClose = flyer._rightThick ? flyer._rightThick.animate(closedFaceOut, closeOpts) : null;
    const aGutterClose = flyer._gutter
      ? flyer._gutter.animate(
          [
            { offset: 0, opacity: 1 },
            { offset: 0.24, opacity: 0 },
            { offset: 1.0, opacity: 0 },
          ],
          closeOpts
        )
      : null;
    // ux17: foot shadow must be gone by ~50% close — no dark plate on the rail.
    // Kill leftover open-path shadows (can leave a second .flyer-shadow stuck at 0.4).
    const closeShadowEl =
      flyer._shadow ||
      (flyer.querySelector && flyer.querySelector(":scope > .flyer-shadow"));
    try {
      document.querySelectorAll(".flyer-shadow").forEach((sh) => {
        if (sh !== closeShadowEl) {
          try { sh.getAnimations().forEach((a) => a.cancel()); } catch (_) {}
          sh.style.opacity = "0";
        }
      });
    } catch (_) {}
    const aShadowClose = closeShadowEl
      ? closeShadowEl.animate(
          [
            { offset: 0, opacity: 0.4 },
            { offset: 0.22, opacity: 0.22 },
            { offset: 0.42, opacity: 0.06 },
            { offset: 0.50, opacity: 0 },
            { offset: 1.0, opacity: 0 },
          ],
          closeOpts
        )
      : null;
    const aFlyerFade = flyer.animate(
      targetMode === "spines"
        ? [
            { offset: 0, opacity: 1 },
            { offset: 0.50, opacity: 1 },
            { offset: 0.58, opacity: 0 },
            { offset: 1.0, opacity: 0 },
          ]
        : [
            { offset: 0, opacity: 1 },
            { offset: flyerFadeAt, opacity: 1 },
            { offset: 1.0, opacity: 0 },
          ],
      closeOpts
    );

    const coverPulse = wait(Math.round(CLOSE_MS * 0.18)).then(() => {
      if (myFlow !== flowSeq) return;
      try {
        applyCoverImage(flyer._cover, book);
        if (targetMode === "spines") preferImgOverBg(flyer._cover);
        else {
          const img = flyer._cover && flyer._cover.querySelector(":scope > .flyer-cover-img");
          if (img) {
            img.style.opacity = "1";
            img.style.visibility = "visible";
          }
        }
      } catch (_) {}
    });

    // ux16: full-height spine appears near slot, then slides INTO homeRect (insert).
    const outClose = `translate3d(${spineOutClose.x.toFixed(2)}px, ${spineOutClose.y.toFixed(2)}px, 0)`;
    const aSpineSlotClose = spineSlotClose
      ? spineSlotClose.animate(
          [
            { offset: 0, transform: outClose, opacity: 0 },
            { offset: 0.50, transform: outClose, opacity: 0 },
            { offset: 0.58, transform: outClose, opacity: 1 },
            { offset: 0.78, transform: "translate3d(0px, 0px, 0)", opacity: 1 },
            { offset: 0.90, transform: "translate3d(0px, 0px, 0)", opacity: 1 },
            { offset: 1.0, transform: "translate3d(0px, 0px, 0)", opacity: 0 },
          ],
          closeMotion
        )
      : null;
    const aLabel = null;
    const aLandPlate = null;
    const coverImg = flyer._cover && flyer._cover.querySelector(".flyer-cover-img");
    // ux23: covers-mode keep real cover opaque until seat handover (no mid-close brown plate)
    const aCoverOut = coverImg
      ? coverImg.animate(
          targetMode === "spines"
            ? [
                { offset: 0, opacity: 1 },
                { offset: 0.50, opacity: 1 },
                { offset: 0.58, opacity: 0 },
                { offset: 1, opacity: 0 },
              ]
            : [
                { offset: 0, opacity: 1 },
                { offset: flyerFadeAt, opacity: 1 },
                { offset: 1, opacity: 0 },
              ],
          closeOpts
        )
      : null;

    // ux23: covers seat must show real cover at handover — never naked #brown board
    if (targetMode === "covers" && book && book.cover) {
      const src = coverSrc(book);
      slot.style.backgroundImage = `url("${src}")`;
      slot.style.backgroundSize = "contain";
      slot.style.backgroundPosition = "center top";
      slot.style.backgroundRepeat = "no-repeat";
      slot.style.backgroundColor = "";
    }

    const aSlotIn = slot.animate(
      [
        { offset: 0, opacity: 0 },
        { offset: slotInAt, opacity: 0 },
        { offset: flyerFadeAt, opacity: 1 },
        { offset: 1, opacity: 1 },
      ],
      closeOpts
    );

    const aBack = openBackdrop
      ? openBackdrop.animate(
          [
            { offset: 0, opacity: 0.45 },
            { offset: 0.4, opacity: 0.35 },
            { offset: putFrom, opacity: 0.12 },
            { offset: flyerFadeAt, opacity: 0 },
            { offset: 1, opacity: 0 },
          ],
          closeOpts
        )
      : null;

    const group = [aNoteOut, aFlyerMove, aFlyerFade, aSlotIn];
    if (aLeftClose) group.push(aLeftClose);
    if (aRightClose) group.push(aRightClose);
    if (aBoardClose) group.push(aBoardClose);
    if (aThickLClose) group.push(aThickLClose);
    if (aThickRClose) group.push(aThickRClose);
    if (aGutterClose) group.push(aGutterClose);
    if (aShadowClose) group.push(aShadowClose);
    if (aLabel) group.push(aLabel);
    if (aLandPlate) group.push(aLandPlate);
    if (aCoverOut) group.push(aCoverOut);
    if (aSpineSlotClose) group.push(aSpineSlotClose);
    if (aBack) group.push(aBack);
    void coverPulse;
    void originX;
    void originY;

    try {
      await runGroup(group, CLOSE_MS + 400, () => {
        slot.style.opacity = "1";
        flyer.style.opacity = "0";
        noteView.style.opacity = "0";
      });
    } finally {
      // PATH-SHAKE ③: final frame still transform-aligned to slot (T0), hand back without vertical drop.
      try {
        flyer.getAnimations({ subtree: true }).forEach((a) => {
          try { a.commitStyles(); } catch (_) {}
          try { a.cancel(); } catch (_) {}
        });
      } catch (_) {}
      flyer.style.transform = T0; // stay locked on frozen home until slot fully owns pixels
      flyer.style.opacity = "0";
      slot.style.opacity = "1";
      slot.style.transform = "none";
      noteView.classList.remove("is-open", "is-preparing");
      noteView.hidden = true;
      noteView.style.opacity = "";
      noteView.style.zIndex = "";
      // One paint with slot visible + flyer invisible@T0, THEN remove flyer (no layout snap seek).
      await Promise.race([
        new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        wait(48),
      ]);
      if (openBook) openBook.heldFlyer = null;
      disposeSpineSlot(spineSlotClose);
      spineSlotClose = null;
      disposeFlyer(flyer);
      resetVeil();
      resetBackdrop();
      // Settle with pins + freeze held, then release — no min-height snap.
      // ux13 gate⑤: settle ALWAYS as resting spine (collapse any face-out / is-expanded).
      await Promise.race([
        new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        wait(48),
      ]);
      expandedId = null;
      openFromExpanded = false;
      restoreSlot(slot, book);
      try { slot.classList.remove("is-extracting"); } catch (_) {}
      // ux23: drop close-path inline cover pin; resting .img-* CSS owns the seat again
      if (targetMode === "covers" && slot) {
        ["background-image", "background-size", "background-position", "background-repeat", "background-color"].forEach((p) => {
          try { slot.style.removeProperty(p); } catch (_) {}
        });
      }
      const slot2 = $(slotSel);
      if (slot2 && slot2 !== slot) {
        restoreSlot(slot2, book);
        if (targetMode === "covers") {
          ["background-image", "background-size", "background-position", "background-repeat", "background-color"].forEach((p) => {
            try { slot2.style.removeProperty(p); } catch (_) {}
          });
        }
      }
      shelfView.querySelectorAll(".cover, .spine").forEach((el) => {
        ["transition", "transform", "opacity"].forEach((p) => {
          try { el.style.removeProperty(p); } catch (_) {}
        });
      });
      // Drop freeze first while row min-heights still pinned at resting size
      shelfView.classList.remove("is-dim", "is-frozen", "is-parked");
      await Promise.race([
        new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        wait(48),
      ]);
      shelfView.querySelectorAll(".covers, .spines").forEach((r) => {
        try { r.style.removeProperty("min-height"); } catch (_) {}
      });
      try { shelfView.style.removeProperty("min-height"); } catch (_) {}
      shelfView.style.opacity = "";
      openBook = null;
      openFromExpanded = false;
      releaseScrollLock();
      if (myFlow === flowSeq) {
        busy = false;
        document.body.classList.remove("is-busy");
      }
    }
  }

  // Mode buttons
  listen($("#modeAuto"), "click", () => {
    modeOverride = "auto";
    // Drop force so density wins
    const url = new URL(location.href);
    url.searchParams.delete("force");
    history.replaceState(null, "", url);
    densityPinned = null;
    setMode(resolveRestingMode("auto", { recompute: true }), { push: true });
  });
  listen($("#modeCovers"), "click", () => {
    modeOverride = "covers";
    const url = new URL(location.href);
    url.searchParams.delete("force");
    history.replaceState(null, "", url);
    densityPinned = null;
    setMode(resolveRestingMode("covers", { recompute: true }), { push: true });
  });
  listen($("#modeSpines"), "click", () => {
    modeOverride = "spines";
    const url = new URL(location.href);
    url.searchParams.delete("force");
    history.replaceState(null, "", url);
    setMode(resolveRestingMode("spines"), { push: true });
  });

  listen($("#backBtn"), "click", () => closeBookFlow());

  // Browser Back from the full note restores this page from bfcache, still open.
  // Land on the shelf at the scroll we saved, without replaying the close clock.
  listen(window, "pageshow", (event) => {
    if (!event.persisted || !openBook) return;
    const home = scrollLock
      ? { x: scrollLock.x, y: scrollLock.y }
      : { x: scrollHome.x, y: scrollHome.y };
    try { releaseScrollLock(); } catch (_) {}
    openBook = null;
    openFromExpanded = false;
    expandedId = null;
    touchExpandedId = null;
    busy = false;
    flowSeq += 1;
    document.body.classList.remove("is-busy");
    noteView.classList.remove("is-open", "is-preparing");
    noteView.hidden = true;
    noteView.style.opacity = "";
    noteView.style.zIndex = "";
    if (stage) stage.replaceChildren();
    resetVeil();
    resetBackdrop();
    unparkShelf();
    shelfView.classList.remove("is-frozen", "is-dim", "is-parked");
    shelfView.style.opacity = "";
    try { shelfView.style.removeProperty("min-height"); } catch (_) {}
    renderShelf();
    writeScroll(home);
    requestAnimationFrame(() => writeScroll(home));
  });

  // Leaving for the post page: remember the shelf scroll so Back lands on it.
  listen(root, "click", (event) => {
    const target = event.target;
    if (!target || !target.closest) return;
    const link = target.closest("a.flyer-page-more, a.note-read");
    if (!link || !root.contains(link)) return;
    const y = scrollLock ? scrollLock.y : readScroll().y;
    try { sessionStorage.setItem("garden-bookshelf-scroll", String(y)); } catch (_) {}
  });

  // Escape closes note
  listen(window, "keydown", (e) => {
    if (e.key === "Escape" && openBook && !busy) closeBookFlow();
  });

  // Resize: density stays pinned (Hedon). No mode flip, no face re-measure.
  // ux21: once enter classified mobile→covers (or desktop density), do not re-detect
  // isMobilePrimary / autoDecide on rotate or window drag.
  listen(window, "resize", () => {
    /* intentionally empty — enter-time density + face sizes stay put */
  });

  // init
  const q = parseQuery();
  if (q) modeOverride = q;
  enableDebugChrome();
  applyModePreference();
  preloadCovers();

  return () => {
    for (const fn of unlisten) fn();
    clearTimeout(idleScrollTimer);
    try { releaseScrollLock(); } catch (_) {}
    try { disarmExpandedScrollGuard(); } catch (_) {}
    document.body.classList.remove("is-busy", "debug-on");
    removeExtraCovers();
  };
}
