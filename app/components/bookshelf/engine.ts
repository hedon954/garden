/* eslint-disable */
// @ts-nocheck
// Tip ux16 held-book-s10-ux16-20261028. Motion copied from that app.js. Do not retune it.
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
  const CATALOG = options.catalog ?? DEMO_CATALOG;
  const NOTES = options.notes ?? DEMO_NOTES;
  const removeExtraCovers = injectExtraCovers(CATALOG);

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

  function applyCoverImage(el, book) {
    if (!el || !book) return;
    el.style.backgroundColor = "#4a3b2f";
    el.style.backgroundSize = "cover";
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
    const label = pageMode === "covers" ? "A · 全封面" : "B · 全立脊";
    modeHint.textContent = label + (modeOverride === "auto" ? "（自动）" : "（手动）");
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
    if (modeOverride === "covers" || modeOverride === "spines") {
      setMode(modeOverride);
      return;
    }
    if (modeOverride === "auto") {
      setMode(autoDecideMode());
      return;
    }
    const q = parseQuery();
    if (q) {
      setMode(q);
      return;
    }
    // default demo: spines (B) so C expand is testable
    setMode("spines");
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

  function expandSpine(id) {
    if (busy || pageMode !== "spines") return;
    pinScrollHome();
    const found = bookById(id);
    if (!found || !found.book.cover || found.book.filler) return;
    cancelCollapse();
    if (expandedId && expandedId !== id) {
      const prev = $(`.spine[data-book-id="${expandedId}"]`);
      if (prev) prev.classList.remove("is-expanded", "is-collapsing");
    }
    expandedId = id;
    const el = $(`.spine[data-book-id="${id}"]`);
    if (el) {
      el.classList.remove("is-collapsing");
      el.classList.add("is-expanded");
    }
  }

  let collapseToken = 0;

  async function collapseSpine(id) {
    if (pageMode !== "spines") return;
    if (expandedId !== id) return;
    const el = $(`.spine[data-book-id="${id}"]`);
    touchExpandedId = null;
    if (!el) return;
    // Keep is-expanded + expandedId during shrink so a click mid-collapse still takes C path
    el.classList.add("is-collapsing");
    const token = ++collapseToken;
    await wait(cssMs("--t-collapse", 230));
    if (token !== collapseToken) return; // cancelled by open or re-expand
    if (expandedId !== id) return;
    expandedId = null;
    el.classList.remove("is-expanded", "is-collapsing");
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

    // Mobile: first tap expands; second tap (or tap on already expanded) opens
    if (isTouch || window.matchMedia("(hover: none)").matches) {
      if (expandedId !== id) {
        if (expandedId) await collapseSpine(expandedId);
        expandSpine(id);
        touchExpandedId = id;
        return;
      }
      // already expanded → open (must collapse first)
      await openBookFlow(found.book, found.cat, el, { fromExpanded: true, asSpine: true });
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
    if (note) {
      $("#noteBody").innerHTML = note.body;
    } else {
      $("#noteBody").innerHTML = `<p class="placeholder">这本还没有完整笔记正文。Demo 占位：返回书架继续抽翻验收。</p><p>${book.title}${book.author ? " · " + book.author : ""}</p>`;
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

  function midSize() {
    // Each page ~2:3 so closed half matches shelf cover aspect → uniform scale, less stretch-jitter.
    const col = Math.min(window.innerWidth - 48, 700);
    const pageW = Math.round(Math.min(col * 0.48, window.innerWidth * 0.4, 340));
    const pageH = Math.round(Math.min(pageW * 1.45, window.innerHeight * 0.68));
    return { w: pageW * 2, h: pageH };
  }

  function midRect() {
    const { w, h } = midSize();
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
  function closedBookRect(slotRect) {
    const w0 = Math.round(slotRect.width);
    const h0 = Math.round(slotRect.height);
    const ratio = w0 / Math.max(1, h0);
    if (ratio >= 0.42) {
      return { left: Math.round(slotRect.left), top: Math.round(slotRect.top), width: w0, height: h0 };
    }
    const h = h0;
    const w = Math.round(Math.min(Math.max(h * 0.68, 72), 120));
    return {
      left: Math.round(slotRect.left + w0 / 2 - w / 2),
      top: Math.round(slotRect.top),
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
  function buildSlotWaypoints(homeRect, mid) {
    const home = copyRect(homeRect);
    const closedTarget = closedBookRect(home);
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
      face.style.backgroundColor = "#4a3b2f";
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

  function restoreSlot(el) {
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
  }

  function pageLinesHtml(title) {
    const safe = String(title || "").replace(/</g, "&lt;");
    return `
      <div class="flyer-page-title">${safe}</div>
      <div class="flyer-page-line"></div>
      <div class="flyer-page-line mid"></div>
      <div class="flyer-page-line"></div>
      <div class="flyer-page-line short"></div>
      <div class="flyer-page-line mid"></div>
      <div class="flyer-page-line"></div>
      <div class="flyer-page-line short"></div>
    `;
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
    leftPage.innerHTML = pageLinesHtml(book.title);
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
    rightPage.innerHTML = pageLinesHtml(book.title);
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

    const mid = midRect();
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
        if (img.decode) img.decode().catch(() => {});
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
    const homeRect = copyRect(rectOf(sourceEl));
    if (openBook) {
      openBook.homeRect = { ...homeRect };
      openBook.homeMode = sourceEl.classList.contains("spine") ? "spines" : "covers";
      openBook.openSeatRect = { ...homeRect };
    }
    const startRect = homeRect;
    const mid = midRect();
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
    preferImgOverBg(dual._cover);
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
    await awaitCloseCoverReady(dual._cover, book, 400);
    preferImgOverBg(dual._cover);
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
        restoreSlot(sourceEl);
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

    const mid = midRect();
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
      preferImgOverBg(flyer._cover);
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
    const readyPulse = awaitCloseCoverReady(flyer._cover, book, 150);
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
      { offset: 0.28, opacity: 1 },
      { offset: 0.36, opacity: 0 },
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
        preferImgOverBg(flyer._cover);
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
    const aCoverOut = coverImg
      ? coverImg.animate(
          [
            { offset: 0, opacity: 1 },
            { offset: 0.50, opacity: 1 },
            { offset: 0.58, opacity: 0 },
            { offset: 1, opacity: 0 },
          ],
          closeOpts
        )
      : null;

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
      restoreSlot(slot);
      try { slot.classList.remove("is-extracting"); } catch (_) {}
      const slot2 = $(slotSel);
      if (slot2 && slot2 !== slot) restoreSlot(slot2);
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
    setMode(autoDecideMode(), { push: true });
  });
  listen($("#modeCovers"), "click", () => {
    modeOverride = "covers";
    setMode("covers", { push: true });
  });
  listen($("#modeSpines"), "click", () => {
    modeOverride = "spines";
    setMode("spines", { push: true });
  });

  listen($("#backBtn"), "click", () => closeBookFlow());

  // Escape closes note
  listen(window, "keydown", (e) => {
    if (e.key === "Escape" && openBook && !busy) closeBookFlow();
  });

  let resizeTimer;
  listen(window, "resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (modeOverride === "auto" && !openBook) {
        setMode(autoDecideMode());
      }
    }, 150);
  });

  // init
  const q = parseQuery();
  if (q) modeOverride = q;
  enableDebugChrome();
  applyModePreference();
  preloadCovers();

  return () => {
    for (const fn of unlisten) fn();
    clearTimeout(resizeTimer);
    clearTimeout(idleScrollTimer);
    try { releaseScrollLock(); } catch (_) {}
    try { disarmExpandedScrollGuard(); } catch (_) {}
    document.body.classList.remove("is-busy", "debug-on");
    removeExtraCovers();
  };
}
