"use client";

import { useEffect } from "react";
import { tableBreakout, tocShift } from "../../ui/garden/enhance.mjs";

function translatedX(element: Element) {
  const value = new DOMMatrix(getComputedStyle(element).transform).m41;
  return Number.isFinite(value) ? value : 0;
}

export function ArticleMeasure() {
  useEffect(() => {
    const article = document.querySelector("article");
    const toc = document.querySelector<HTMLElement>(".toc");
    if (!article) return undefined;
    const root = document.documentElement;
    let frame = 0;

    const layout = () => {
      const articleBox = article.getBoundingClientRect();
      const viewport = root.clientWidth;
      article.querySelectorAll<HTMLElement>(".table-wrap").forEach((wrap) => {
        const table = wrap.querySelector("table");
        wrap.classList.remove("ux-wide");
        wrap.style.removeProperty("--wl");
        wrap.style.removeProperty("--wr");
        if (!table) return;
        const margin = tableBreakout({
          viewport,
          articleLeft: articleBox.left,
          articleRight: articleBox.right,
          tableClient: wrap.clientWidth,
          tableScroll: table.scrollWidth,
        });
        if (margin.left > 0) {
          wrap.style.setProperty("--wl", `${margin.left}px`);
          wrap.style.setProperty("--wr", `${margin.right}px`);
          wrap.classList.add("ux-wide");
        }
      });

      if (!toc) {
        root.removeAttribute("data-toc-yield");
        return;
      }
      const box = toc.getBoundingClientRect();
      const dx = translatedX(toc);
      const originalLeft = box.left - dx;
      const overlapRights: number[] = [];
      article.querySelectorAll<HTMLElement>(".ux-wide").forEach((element) => {
        const wide = element.getBoundingClientRect();
        const overlaps = wide.bottom > box.top - 12 && wide.top < box.bottom + 12 && wide.right > originalLeft - 12;
        if (overlaps) overlapRights.push(wide.right);
      });
      const shift = tocShift({
        tocLeft: originalLeft,
        tocWidth: box.width,
        viewport,
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

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        layout();
      });
    };

    layout();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("load", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(article);
    article.querySelectorAll("img").forEach((image) => image.addEventListener("load", schedule));
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("load", schedule);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
