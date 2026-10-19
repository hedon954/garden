"use client";

import { useEffect } from "react";
import { figureBreakout, figureImageWidth, tableBreakout, tocShift } from "../../ui/garden/enhance.mjs";

function translatedX(element: Element) {
  const value = new DOMMatrix(getComputedStyle(element).transform).m41;
  return Number.isFinite(value) ? value : 0;
}

// The table is width:100% and wraps its cells, so scrollWidth never exceeds
// the column. Measure the unwrapped width instead.
function naturalWidth(table: HTMLTableElement) {
  const previous = table.style.width;
  table.style.width = "max-content";
  const width = table.scrollWidth;
  table.style.width = previous;
  return width;
}

function resetWide(element: HTMLElement) {
  element.classList.remove("ux-wide");
  element.style.removeProperty("--wl");
  element.style.removeProperty("--wr");
}

export function ArticleMeasure() {
  useEffect(() => {
    const article = document.querySelector("article");
    const toc = document.querySelector<HTMLElement>(".toc");
    if (!article) return undefined;
    const root = document.documentElement;
    // Natural content widths are expensive (a max-content relayout per table),
    // so they are cached and only refreshed on resize and load.
    const natural = new WeakMap<HTMLElement, number>();
    let measureFrame = 0;
    let tocFrame = 0;
    let refreshPending = false;

    const tableWidth = (wrap: HTMLElement, refresh: boolean) => {
      if (!refresh && natural.has(wrap)) return natural.get(wrap) ?? 0;
      const table = wrap.querySelector("table");
      const width = table ? naturalWidth(table) : 0;
      natural.set(wrap, width);
      return width;
    };

    const docPage = article.closest<HTMLElement>(".garden-doc-page");

    const placeToc = () => {
      if (docPage) {
        root.removeAttribute("data-toc-yield");
        root.removeAttribute("data-toc-hide");
        return;
      }
      if (!toc) {
        root.removeAttribute("data-toc-yield");
        return;
      }
      const box = toc.getBoundingClientRect();
      const originalLeft = box.left - translatedX(toc);
      const overlapRights: number[] = [];
      article.querySelectorAll<HTMLElement>(".ux-wide").forEach((element) => {
        const wide = element.getBoundingClientRect();
        const overlaps = wide.bottom > box.top - 12 && wide.top < box.bottom + 12 && wide.right > originalLeft - 12;
        if (overlaps) overlapRights.push(wide.right);
      });
      const shift = tocShift({
        tocLeft: originalLeft,
        tocWidth: box.width,
        viewport: root.clientWidth,
        overlapRights,
      });
      if (shift.shift > 0) {
        root.style.setProperty("--tocshift", `${shift.shift}px`);
        root.toggleAttribute("data-toc-hide", shift.hide);
        root.setAttribute("data-toc-yield", "");
      } else {
        root.removeAttribute("data-toc-yield");
        root.removeAttribute("data-toc-hide");
      }
    };

    const clampMargin = (margin: { left: number; right: number }, maxRoom: number | null) => {
      if (maxRoom === null) return margin;
      const side = Math.max(0, Math.min(margin.left, maxRoom));
      return { left: side, right: side };
    };

    const measure = (refresh: boolean) => {
      // Measure the text column, not the whole article grid (which includes the TOC rail).
      const articleBox = (article.querySelector(".markdown-body") ?? article).getBoundingClientRect();
      const viewport = root.clientWidth;
      let docMaxRoom: number | null = null;
      if (docPage) {
        const sidebar = docPage.querySelector<HTMLElement>(".gdoc-sidebar");
        let leftLimit = 24;
        if (sidebar && getComputedStyle(sidebar).position === "sticky") {
          const sbBox = sidebar.getBoundingClientRect();
          if (sbBox.width > 0 && sbBox.right <= articleBox.left + 1) {
            leftLimit = sbBox.right + 16;
          }
        }
        let rightLimit = viewport - 24;
        if (toc && getComputedStyle(toc).display !== "none") {
          const tocBox = toc.getBoundingClientRect();
          if (tocBox.width > 0 && tocBox.left >= articleBox.right - 1) {
            rightLimit = tocBox.left - translatedX(toc) - 16;
          }
        }
        docMaxRoom = Math.max(
          0,
          Math.floor(Math.min(articleBox.left - leftLimit, rightLimit - articleBox.right)),
        );
      }
      const widen = (element: HTMLElement, margin: { left: number; right: number }) => {
        if (margin.left <= 0) return;
        element.style.setProperty("--wl", `${margin.left}px`);
        element.style.setProperty("--wr", `${margin.right}px`);
        element.classList.add("ux-wide");
      };
      // Tables: as wide as their unwrapped content, up to 300px a side.
      article.querySelectorAll<HTMLElement>(".table-wrap").forEach((wrap) => {
        const width = tableWidth(wrap, refresh);
        resetWide(wrap);
        if (!width) return;
        widen(wrap, clampMargin(tableBreakout({
          viewport,
          articleLeft: articleBox.left,
          articleRight: articleBox.right,
          tableClient: wrap.clientWidth,
          tableScroll: width,
        }), docMaxRoom));
      });
      // Images: as wide as they display (2x screenshots at half their pixels), up to 1040px in total.
      article.querySelectorAll<HTMLElement>(".fig").forEach((figure) => {
        const image = figure.querySelector("img");
        resetWide(figure);
        // From here on the browser decides; the build-time breakout CSS steps aside.
        figure.classList.remove("fig-wide");
        if (!image) return;
        // Back to the unwidened size: the build-time width when the size is known
        // (so an image that has not loaded keeps its box), else CSS sizing.
        const baseWidth = Number(image.dataset.bw) || 0;
        if (baseWidth) image.style.width = `${baseWidth}px`;
        else image.style.removeProperty("width");
        // Sizes read at build time let this run before the file arrives; otherwise wait for load.
        const known = Number(image.dataset.nw) || 0;
        const pixels = image.naturalWidth || known;
        if (!pixels) return;
        // width="" written by the build is the pixel size, not an author's choice.
        const attrWidth = known ? Number(image.dataset.aw) || 0 : Number(image.getAttribute("width")) || 0;
        const breakout = clampMargin(figureBreakout({
          viewport,
          articleLeft: articleBox.left,
          articleRight: articleBox.right,
          figureClient: figure.clientWidth,
          imageClient: image.clientWidth,
          naturalWidth: pixels,
          attrWidth,
        }), docMaxRoom);
        widen(figure, breakout);
        // Only a widened image, or one with a width attribute, gets an inline width.
        const width = figureImageWidth({ naturalWidth: pixels, attrWidth, widened: breakout.left > 0 });
        if (width) image.style.width = `${width}px`;
      });
      placeToc();
    };

    // Resize and load refresh the cached widths; the ResizeObserver reuses them.
    const scheduleMeasure = (refresh: boolean) => {
      refreshPending ||= refresh;
      if (measureFrame) return;
      measureFrame = window.requestAnimationFrame(() => {
        measureFrame = 0;
        const shouldRefresh = refreshPending;
        refreshPending = false;
        measure(shouldRefresh);
      });
    };
    const refresh = () => scheduleMeasure(true);
    const reuse = () => scheduleMeasure(false);
    // Scrolling only moves wide elements past the TOC; no width is measured.
    const onScroll = () => {
      if (tocFrame) return;
      tocFrame = window.requestAnimationFrame(() => {
        tocFrame = 0;
        placeToc();
      });
    };

    measure(true);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", refresh);
    const observer = new ResizeObserver(reuse);
    observer.observe(article);
    const images = [...article.querySelectorAll("img")];
    images.forEach((image) => image.addEventListener("load", refresh));
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", refresh);
      images.forEach((image) => image.removeEventListener("load", refresh));
      observer.disconnect();
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      if (tocFrame) window.cancelAnimationFrame(tocFrame);
    };
  }, []);
  return null;
}
