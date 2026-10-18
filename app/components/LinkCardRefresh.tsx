"use client";

import { useEffect } from "react";
import { cardUpdates, refreshUrl, safeToUpdate } from "../../ui/garden/card-refresh.mjs";

/**
 * After the page is idle, ask the link-card Worker for each card's current
 * text and swap it in for cards below the fold. Any failure leaves the
 * build-time card as it is.
 */
export function LinkCardRefresh({ endpoint }: { endpoint: string }) {
  useEffect(() => {
    const cards = [...document.querySelectorAll<HTMLElement>(".link-cards[data-card-url]")];
    if (!cards.length || !refreshUrl(endpoint, "https://example.com/")) return;
    const controller = new AbortController();
    const run = () => {
      for (const card of cards) {
        const target = refreshUrl(endpoint, card.dataset.cardUrl ?? "");
        if (!target) continue;
        const timer = setTimeout(() => controller.abort(), 6000);
        fetch(target, { mode: "cors", credentials: "omit", signal: controller.signal })
          .then((response) => (response.ok ? response.json() : null))
          .then((fresh) => {
            if (!fresh || !safeToUpdate(card.getBoundingClientRect().top, window.innerHeight)) return;
            const fields = new Map(
              [...card.querySelectorAll<HTMLElement>("[data-field]")].map((node) => [node.dataset.field ?? "", node]),
            );
            const current = Object.fromEntries([...fields].map(([field, node]) => [field, node.textContent ?? ""]));
            for (const [field, text] of Object.entries(cardUpdates(current, fresh))) {
              const node = fields.get(field);
              if (node) node.textContent = text;
            }
          })
          .catch(() => {})
          .finally(() => clearTimeout(timer));
      }
    };
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500));
    const handle = idle(run);
    return () => {
      controller.abort();
      (window.cancelIdleCallback ?? window.clearTimeout)(handle as number);
    };
  }, [endpoint]);
  return null;
}
