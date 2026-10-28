/* eslint-disable */
// @ts-nocheck
// Verbatim port of the approved bookshelf demo (tip a0762b5d).
// Timeline, offsets, and easing are copied from that app.js. Do not retune them.
import { DEMO_CATALOG, DEMO_NOTES } from "./demo-data";
import { flipTransform, MID_H, MID_W, pageDensity } from "./density";

export const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
export const OPEN_MS = 2100;
export const CLOSE_MS = 1650;

function cssIdent(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
}

function injectExtraCovers(root, catalog) {
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
  const removeExtraCovers = injectExtraCovers(root, CATALOG);

  const $ = (sel, scope = root) => scope.querySelector(sel);
  const $$ = (sel, scope = root) => [...scope.querySelectorAll(sel)];

  const shelfView = $("#shelfView");
  const noteView = $("#noteView");
  const baysEl = $("#bays");
  const stage = $("#stage");
  const openVeil = $("#openVeil");
  const openVeilBlob = $("#openVeilBlob");
  const modeHint = $("#modeHint");
  const footMode = $("#footMode");

  let pageMode = "spines"; // covers | spines
  let modeOverride = null; // auto | covers | spines | null→from query
  let flight = 0;
  let dupUntil = 0;

  function beginFlight() {
    const now = performance.now();
    if (now < dupUntil) return 0;
    dupUntil = now + 80;
    flight += 1;
    return flight;
  }

  function superseded(token) {
    return token !== flight;
  }

  function stopAnimations() {
    for (const node of [openVeilBlob, openVeil, shelfView, noteView, stage]) {
      if (!node) continue;
      try {
        node.getAnimations({ subtree: true }).forEach((anim) => {
          try { anim.cancel(); } catch (_) {}
        });
      } catch (_) {}
    }
    if (stage) stage.querySelectorAll(".flyer").forEach((node) => disposeFlyer(node));
    $$(".cover, .spine").forEach((el) => restoreSlot(el));
    if (shelfView) {
      shelfView.hidden = false;
      shelfView.style.opacity = "";
      shelfView.classList.remove("is-dim");
    }
    resetVeil();
  }

  function releasePointer() {
    document.body.classList.remove("is-busy");
  }
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
    return pageDensity(CATALOG, window.innerWidth);
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
              collapseSpine(book.id);
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
    if (pageMode !== "spines") return;
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
  }

  function cancelCollapse() {
    collapseToken += 1;
  }

  async function onCoverClick(id, el) {
    const found = bookById(id);
    if (!found || found.book.filler) return;
    await openBookFlow(found.book, found.cat, el, { fromExpanded: false, asSpine: false });
  }

  async function onSpineClick(id, el, ev) {
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
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }

  function midRect() {
    return {
      left: window.innerWidth / 2 - MID_W / 2,
      top: window.innerHeight / 2 - MID_H / 2 - 28,
      width: MID_W,
      height: MID_H,
    };
  }

  function animDuration(a) {
    try {
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
      const d = t && t.duration;
      return typeof d === "number" ? d : OPEN_MS;
    } catch (_) {
      return OPEN_MS;
    }
  }

  // No commitStyles — iOS Safari leaves opacity/transform leftovers that create shelf gaps
  // and floating flyers. Cancel + explicit cleanup instead. Timeout if finished never fires.
  function runGroup(animations, timeoutMs) {
    if (!animations.length) return Promise.resolve();
    const ms =
      timeoutMs != null
        ? timeoutMs
        : Math.max.apply(null, animations.map(animDuration)) + 320;
    const done = Promise.all(animations.map((a) => a.finished.catch(() => {})));
    return Promise.race([done, wait(ms)]).then(() => {
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

  function makeFlyer(book, atRect, { spineShape } = {}) {
    const flyer = document.createElement("div");
    flyer.className = "flyer";

    const shadow = document.createElement("div");
    shadow.className = "flyer-shadow";

    const inner = document.createElement("div");
    inner.className = "flyer-inner";

    const back = document.createElement("div");
    back.className = "flyer-back";
    back.innerHTML = `
      <div class="flyer-page-title"></div>
      <div class="flyer-page-line"></div>
      <div class="flyer-page-line mid"></div>
      <div class="flyer-page-line"></div>
      <div class="flyer-page-line short"></div>
      <div class="flyer-page-line mid"></div>
      <div class="flyer-page-line"></div>
      <div class="flyer-page-line short"></div>
    `;
    back.querySelector(".flyer-page-title").textContent = book.title;

    const front = document.createElement("div");
    front.className = "flyer-front " + bkClass(book);
    if (spineShape) {
      front.classList.add("is-spine-face");
      const label = document.createElement("span");
      label.className = "flyer-spine-label";
      label.textContent = book.spine;
      front.appendChild(label);
    } else {
      front.classList.add("is-cover-ready");
    }

    inner.appendChild(back);
    inner.appendChild(front);
    flyer.appendChild(shadow);
    flyer.appendChild(inner);
    flyer._front = front;

    const mid = midRect();
    flyer.style.width = mid.width + "px";
    flyer.style.height = mid.height + "px";
    flyer.style.left = mid.left + "px";
    flyer.style.top = mid.top + "px";
    flyer.style.transform = flipTransform(atRect, mid);
    front.style.transform = "rotateY(0deg)";
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
        if (img.decode) await img.decode();
        else await new Promise((res) => { img.onload = res; img.onerror = res; });
      } catch (_) {}
    }
    void noteView.offsetWidth;
  }

  function preloadCovers() {
    for (const cat of CATALOG) {
      for (const book of cat.books) {
        if (!book.cover) continue;
        const img = new Image();
        img.src = typeof book.cover === "string" ? book.cover : `/covers/${book.id}.jpg`;
        if (img.decode) img.decode().catch(() => {});
      }
    }
  }

  function clearGhost(el) {
    restoreSlot(el);
  }

  async function openBookFlow(book, cat, sourceEl, { fromExpanded, asSpine }) {
    const token = beginFlight();
    if (!token) return;
    stopAnimations();
    document.body.classList.add("is-busy");
    openBook = { book, cat, asSpine, fromExpanded: !!fromExpanded };
    openFromExpanded = !!fromExpanded;

    await prepareNote(book, cat);
    if (superseded(token)) return;

    if (reduceMotion()) {
      sourceEl.classList.add("is-placeholder");
      if (fromExpanded) {
        expandedId = null;
        sourceEl.classList.remove("is-expanded", "is-collapsing");
      }
      noteView.classList.remove("is-preparing");
      noteView.classList.add("is-open");
      noteView.style.opacity = "1";
      shelfView.hidden = true;
      releasePointer();
      return;
    }

    // Capture rect FIRST. C path: pull FROM expanded (or mid-collapse) size — no collapse await.
    cancelCollapse();
    if (fromExpanded) {
      sourceEl.style.transition = "none";
      sourceEl.classList.remove("is-collapsing"); // freeze current footprint; no shrink anim
    }
    const startRect = rectOf(sourceEl);

    // C: cover face from expanded footprint; B: spine face from narrow spine
    const spineShape = asSpine && !fromExpanded && pageMode === "spines";
    // Flyer FIRST so the expanded cover never hard-cuts to a naked spine
    const flyer = makeFlyer(book, startRect, { spineShape });
    const mid = midRect();
    const originX = mid.left + mid.width / 2;
    const originY = mid.top + mid.height / 2;
    promote(flyer);
    promote(flyer._front);

    // Ghost AFTER flyer covers the slot (expanded footprint on C; neighbors stable)
    sourceEl.style.width = startRect.width + "px";
    sourceEl.style.height = startRect.height + "px";
    sourceEl.classList.add("is-placeholder");
    if (fromExpanded) {
      expandedId = null;
      touchExpandedId = null;
      sourceEl.classList.remove("is-expanded", "is-collapsing");
    }

    armVeilAt(originX, originY, { full: false });
    shelfView.classList.add("is-dim");
    // One frame only — promote then start; no double-rAF freeze before pull
    await new Promise((r) => requestAnimationFrame(r));

    const T0 = flipTransform(startRect, mid, "rotateZ(-2deg)");
    const T1 = "translate(0px, -20px) scale(1.02, 1.02) rotateZ(2deg)";
    const T2 = "translate(0px, -14px) scale(1, 1) rotateZ(1deg)";
    const T3 = "translate(0px, -10px) scale(1, 1) rotateZ(0deg)";
    const T4 = "translate(0px, -8px) scale(1, 1) rotateZ(0deg)";

    // ONE clock: all animations share OPEN_MS + same easing; offsets = continuous phases
    // C retract is baked into early flyer scale (wide cover → mid), no hold on spine.
    const opts = { duration: OPEN_MS, easing: EASE, fill: "forwards" };

    const aFlyer = flyer.animate(
      [
        { offset: 0, transform: T0 },
        { offset: 0.08, transform: flipTransform(
          {
            left: startRect.left + (mid.left - startRect.left) * 0.15,
            top: startRect.top - 6,
            width: startRect.width + (mid.width - startRect.width) * 0.2,
            height: startRect.height + (mid.height - startRect.height) * 0.2,
          },
          mid,
          "rotateZ(-1deg)"
        ) },
        { offset: 0.22, transform: T1 },
        { offset: 0.38, transform: T2 },
        { offset: 0.55, transform: T3 },
        { offset: 1.0, transform: T4 },
      ],
      opts
    );

    // Drop spine label face early via opacity on label (no class mid-flight)
    const label = flyer._front.querySelector(".flyer-spine-label");
    const aLabel = label
      ? label.animate(
          [
            { offset: 0, opacity: 1 },
            { offset: 0.12, opacity: 1 },
            { offset: 0.22, opacity: 0 },
            { offset: 1, opacity: 0 },
          ],
          opts
        )
      : null;
    if (!spineShape) {
      flyer._front.classList.add("is-cover-ready");
      flyer._front.classList.remove("is-spine-face");
    } else {
      // After timeline we'll force cover face; during flight keep spine face visual fading label
    }

    // Flip finishes near-flat before the veil grows. Same eased clock as the pull.
    const aHinge = flyer._front.animate(
      [
        { offset: 0, transform: "rotateY(0deg)" },
        { offset: 0.18, transform: "rotateY(0deg)" },
        { offset: 0.26, transform: "rotateY(-50deg)" },
        { offset: 0.34, transform: "rotateY(-110deg)" },
        { offset: 0.42, transform: "rotateY(-145deg)" },
        { offset: 0.48, transform: "rotateY(-155deg)" },
        { offset: 1.0, transform: "rotateY(-155deg)" },
      ],
      opts
    );

    // Veil: scale only (no clip-path). Stays small through the flip, then a light cream wash.
    const aVeil = openVeilBlob.animate(
      [
        { offset: 0, transform: "translateZ(0) scale(0)", opacity: 0.55 },
        { offset: 0.42, transform: "translateZ(0) scale(0.03)", opacity: 0.6 },
        { offset: 0.52, transform: "translateZ(0) scale(0.1)", opacity: 0.65 },
        { offset: 0.64, transform: "translateZ(0) scale(0.35)", opacity: 0.72 },
        { offset: 0.76, transform: "translateZ(0) scale(0.7)", opacity: 0.78 },
        { offset: 0.86, transform: "translateZ(0) scale(1)", opacity: 0.82 },
        { offset: 0.93, transform: "translateZ(0) scale(1)", opacity: 0.22 },
        { offset: 1.0, transform: "translateZ(0) scale(1)", opacity: 0 },
      ],
      opts
    );

    // Article pre-rendered; opacity reveal under veil as veil fades
    const aNote = noteView.animate(
      [
        { offset: 0, opacity: 0 },
        { offset: 0.84, opacity: 0 },
        { offset: 0.92, opacity: 1 },
        { offset: 1.0, opacity: 1 },
      ],
      opts
    );

    const group = [aFlyer, aHinge, aVeil, aNote];
    if (aLabel) group.push(aLabel);
    const openShadow = flyer.querySelector(".flyer-shadow");
    if (openShadow) {
      group.push(openShadow.animate(
        [
          { offset: 0, opacity: 0.4 },
          { offset: 0.22, opacity: 0.22 },
          { offset: 0.42, opacity: 0.08 },
          { offset: 1, opacity: 0.06 },
        ],
        opts
      ));
    }

    // Hide shelf under note near reveal (opacity only, no layout) via WAAPI on shelf
    const aShelf = shelfView.animate(
      [
        { offset: 0, opacity: 1 },
        { offset: 0.82, opacity: 0.4 },
        { offset: 0.92, opacity: 0 },
        { offset: 1, opacity: 0 },
      ],
      opts
    );
    group.push(aShelf);

    // Flyer leaves when the veil is full and the note is readable (eased progress, not a timeout).
    const NOTE_READY = 0.86;
    let flyerAlive = true;
    const revealNote = () => {
      if (superseded(token)) return;
      noteView.classList.remove("is-preparing");
      noteView.classList.add("is-open");
      releasePointer();
    };
    const killFlyerNow = () => {
      if (!flyerAlive) return;
      flyerAlive = false;
      disposeFlyer(flyer);
      revealNote();
    };
    const watchKill = () => {
      if (!flyerAlive || superseded(token)) return;
      try {
        const pNote = aNote.effect && aNote.effect.getComputedTiming
          ? aNote.effect.getComputedTiming().progress
          : null;
        const pVeil = aVeil.effect && aVeil.effect.getComputedTiming
          ? aVeil.effect.getComputedTiming().progress
          : null;
        const noteOp = parseFloat(getComputedStyle(noteView).opacity) || 0;
        if ((pNote != null && pNote >= NOTE_READY) || (pVeil != null && pVeil >= NOTE_READY) || noteOp >= 0.2) {
          killFlyerNow();
          return;
        }
      } catch (_) {}
      requestAnimationFrame(watchKill);
    };
    requestAnimationFrame(watchKill);

    try {
      await runGroup(group, OPEN_MS + 400);
    } finally {
      if (superseded(token)) return;
      killFlyerNow();
      revealNote();
      noteView.style.opacity = "1";
      shelfView.hidden = true;
      shelfView.style.opacity = "";
      shelfView.classList.remove("is-dim");
      resetVeil();
      restoreSlot(sourceEl);
      releasePointer();
    }
  }

  async function closeBookFlow() {
    if (!openBook) return;
    const token = beginFlight();
    if (!token) return;
    stopAnimations();
    document.body.classList.add("is-busy");

    const { book, asSpine } = openBook;
    const targetMode = pageMode;

    if (reduceMotion()) {
      noteView.classList.remove("is-open", "is-preparing");
      noteView.hidden = true;
      noteView.style.opacity = "";
      shelfView.hidden = false;
      renderShelf();
      clearGhost(
        targetMode === "covers"
          ? $(`.cover[data-book-id="${book.id}"]`)
          : $(`.spine[data-book-id="${book.id}"]`)
      );
      openBook = null;
      releasePointer();
      return;
    }

    const mid = midRect();
    const originX = mid.left + mid.width / 2;
    const originY = mid.top + mid.height / 2;

    // Prep shelf UNDER the note (note still covering) so renderShelf cost is before veil
    shelfView.hidden = false;
    shelfView.style.opacity = "0";
    renderShelf();
    const slotSel =
      targetMode === "covers"
        ? `.cover[data-book-id="${book.id}"]`
        : `.spine[data-book-id="${book.id}"]`;
    const slot = $(slotSel);
    if (!slot) {
      noteView.classList.remove("is-open", "is-preparing");
      noteView.hidden = true;
      openBook = null;
      releasePointer();
      return;
    }
    // Landing rect after shelf is shown; scroll slot into view (mobile scroll restore)
    try {
      slot.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch (_) {}
    await new Promise((r) => requestAnimationFrame(r));
    if (superseded(token)) return;
    const endRect = rectOf(slot);
    // Invisible seat (correct size) — real spine crossfades in near land; no placeholder class
    // (avoids opacity:0 leftovers). Hold opacity 0 until put-back crossfade.
    slot.style.width = endRect.width + "px";
    slot.style.height = endRect.height + "px";
    slot.style.opacity = "0";
    slot.style.pointerEvents = "none";

    // Arm FULL veil over article — reverse start. Then instantly swap DOM under it.
    armVeilAt(originX, originY, { full: true });
    noteView.classList.remove("is-open", "is-preparing");
    noteView.style.opacity = "0";
    noteView.hidden = true;
    shelfView.style.opacity = "1";

    const flyer = makeFlyer(book, mid, { spineShape: false });
    flyer.style.transform = "translate(0px, -8px) scale(1, 1)";
    flyer._front.style.transform = "rotateY(-155deg)";
    if (targetMode === "spines") {
      flyer._front.classList.add("is-spine-face");
      flyer._front.classList.remove("is-cover-ready");
      let label = flyer._front.querySelector(".flyer-spine-label");
      if (!label) {
        label = document.createElement("span");
        label.className = "flyer-spine-label";
        label.textContent = book.spine;
        flyer._front.appendChild(label);
      }
      label.style.opacity = "0";
    }

    promote(flyer);
    promote(flyer._front);
    promote(openVeilBlob);

    const Tend = flipTransform(endRect, mid);
    // Whole close clock stays linear. Put-back and crossfade are the tail of that clock.
    const PUT_MS = 340;
    const XFADE_MS = 120;
    const putFrom = 1 - PUT_MS / CLOSE_MS;
    const xfadeFrom = 1 - XFADE_MS / CLOSE_MS;
    const DECEL = "cubic-bezier(0.22, 1, 0.36, 1)";
    const EASE_IO = "cubic-bezier(0.45, 0, 0.55, 1)";
    const closeOpts = { duration: CLOSE_MS, easing: "linear", fill: "forwards" };

    // CLOSE = OPEN reverse. Veil already full; contract starts THIS tick (no hold / refill).
    const aVeil = openVeilBlob.animate(
      [
        { offset: 0, transform: "translateZ(0) scale(1)", opacity: 1, easing: EASE_IO },
        { offset: 0.08, transform: "translateZ(0) scale(0.55)", opacity: 0.9, easing: EASE_IO },
        { offset: 0.2, transform: "translateZ(0) scale(0.22)", opacity: 0.7, easing: EASE_IO },
        { offset: 0.34, transform: "translateZ(0) scale(0.05)", opacity: 0.35, easing: EASE_IO },
        { offset: 0.48, transform: "translateZ(0) scale(0)", opacity: 0, easing: "ease-out" },
        { offset: 1.0, transform: "translateZ(0) scale(0)", opacity: 0 },
      ],
      closeOpts
    );

    const aHinge = flyer._front.animate(
      [
        { offset: 0, transform: "rotateY(-155deg)", easing: "linear" },
        { offset: 0.06, transform: "rotateY(-155deg)", easing: EASE_IO },
        { offset: 0.16, transform: "rotateY(-140deg)", easing: EASE_IO },
        { offset: 0.28, transform: "rotateY(-90deg)", easing: EASE_IO },
        { offset: 0.4, transform: "rotateY(-30deg)", easing: DECEL },
        { offset: 0.52, transform: "rotateY(0deg)", easing: "linear" },
        { offset: 1.0, transform: "rotateY(0deg)" },
      ],
      closeOpts
    );

    const aFlyer = flyer.animate(
      [
        { offset: 0, transform: "translate(0px, -8px) scale(1, 1) rotateZ(0deg)", easing: EASE_IO },
        { offset: 0.28, transform: "translate(0px, -14px) scale(1, 1) rotateZ(-1deg)", easing: EASE_IO },
        { offset: 0.48, transform: "translate(0px, -10px) scale(1.02, 1.02) rotateZ(2deg)", easing: EASE_IO },
        // Put-back is the last PUT_MS of the linear clock (decel into the slot).
        {
          offset: putFrom,
          transform: flipTransform(
            {
              left: endRect.left + (mid.left - endRect.left) * 0.28,
              top: endRect.top - 6,
              width: endRect.width + (mid.width - endRect.width) * 0.4,
              height: endRect.height + (mid.height - endRect.height) * 0.4,
            },
            mid,
            "rotateZ(-1deg)"
          ),
          easing: DECEL,
        },
        { offset: 1.0, transform: Tend },
      ],
      closeOpts
    );

    const label = flyer._front.querySelector(".flyer-spine-label");
    const aLabel = label
      ? label.animate(
          [
            { offset: 0, opacity: 0, easing: "linear" },
            { offset: Math.max(0.55, putFrom - 0.08), opacity: 0, easing: "ease-out" },
            { offset: putFrom + 0.06, opacity: 1, easing: "linear" },
            { offset: 1, opacity: 1 },
          ],
          closeOpts
        )
      : null;

    // Crossfade ~150ms: flyer out + real spine in, overlapping — no finally swap jump
    const aFlyerFade = flyer.animate(
      [
        { offset: 0, opacity: 1, easing: "linear" },
        { offset: xfadeFrom, opacity: 1, easing: "ease-out" },
        { offset: 1, opacity: 0 },
      ],
      closeOpts
    );

    const aSlotIn = slot.animate(
      [
        { offset: 0, opacity: 0, easing: "linear" },
        { offset: xfadeFrom, opacity: 0, easing: "ease-out" },
        { offset: 1, opacity: 1 },
      ],
      closeOpts
    );

    const closeShadow = flyer.querySelector(".flyer-shadow");
    const aShadow = closeShadow
      ? closeShadow.animate(
          [
            { offset: 0, opacity: 0.08 },
            { offset: 0.48, opacity: 0.1 },
            { offset: putFrom, opacity: 0.35 },
            { offset: xfadeFrom, opacity: 0.15 },
            { offset: 1, opacity: 0 },
          ],
          closeOpts
        )
      : null;

    const group = [aVeil, aHinge, aFlyer, aFlyerFade, aSlotIn];
    if (aLabel) group.push(aLabel);
    if (aShadow) group.push(aShadow);

    try {
      await runGroup(group, CLOSE_MS + 400);
    } finally {
      if (superseded(token)) return;
      // Lock spine visible BEFORE cancel/clear so removeProperty does not flash a gap
      slot.style.opacity = "1";
      disposeFlyer(flyer);
      restoreSlot(slot);
      restoreSlot($(slotSel));
      resetVeil();
      shelfView.classList.remove("is-dim");
      shelfView.style.opacity = "";
      openBook = null;
      openFromExpanded = false;
      releasePointer();
    }
  }

  const unlisten = [];
  function listen(target, type, fn, opts) {
    if (!target) return;
    target.addEventListener(type, fn, opts);
    unlisten.push(() => target.removeEventListener(type, fn, opts));
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
    if (e.key === "Escape" && openBook) closeBookFlow();
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
    document.body.classList.remove("is-busy", "debug-on");
    removeExtraCovers();
  };
}
