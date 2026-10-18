/**
 * Pure helpers for refreshing link cards in the browser. The DOM side lives in
 * app/components/LinkCardRefresh.tsx.
 */

/** "2025-01-30" → "2025 年 1 月 30 日"; anything else → "". */
export function cardDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(value ?? "");
  return match ? `${match[1]} 年 ${Number(match[2])} 月 ${Number(match[3])} 日` : "";
}

const LIMITS = { title: 200, description: 300, siteName: 80, author: 80 };

/**
 * Which text fields to change. Only fields the card already shows are
 * touched, and empty answers never blank a field, so a refresh never adds or
 * removes a line.
 */
export function cardUpdates(current, fresh) {
  if (!fresh || typeof fresh !== "object") return {};
  const changes = {};
  for (const [field, shown] of Object.entries(current)) {
    let next = fresh[field];
    if (typeof next !== "string" || !next.trim()) continue;
    next = next.replace(/\s+/gu, " ").trim();
    if (field === "publishedTime") next = cardDate(next);
    else if (LIMITS[field] && next.length > LIMITS[field]) next = `${next.slice(0, LIMITS[field] - 1)}…`;
    if (next && next !== shown) changes[field] = next;
  }
  return changes;
}

/** Only cards the reader has not reached yet change, so nothing moves under their eyes. */
export function safeToUpdate(cardTop, viewportHeight) {
  return cardTop > viewportHeight;
}

/** The Worker URL for one card. */
export function refreshUrl(endpoint, cardUrl) {
  const base = String(endpoint ?? "").replace(/\/+$/u, "");
  if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/u.test(base)) return "";
  return `${base}/?url=${encodeURIComponent(cardUrl)}`;
}

/**
 * A signal for one request: aborted when this request takes longer than
 * `ms`, or when `shared` aborts (the page goes away). Each card gets its own,
 * so one slow card never cancels the others. Uses AbortSignal.any/timeout when
 * the browser has them, a controller and a timer otherwise.
 *
 * @param {AbortSignal} shared
 * @param {number} ms
 * @returns {{ signal: AbortSignal; done: () => void }}
 */
export function requestSignal(shared, ms, { Signal = globalThis.AbortSignal, Controller = globalThis.AbortController } = {}) {
  if (typeof Signal?.any === "function" && typeof Signal?.timeout === "function") {
    return { signal: Signal.any([shared, Signal.timeout(ms)]), done: () => {} };
  }
  const controller = new Controller();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, ms);
  if (shared.aborted) abort();
  else shared.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      shared.removeEventListener("abort", abort);
    },
  };
}

export const CARD_TIMEOUT_MS = 6000;

/**
 * Ask the Worker for one card's current text. Resolves to the JSON answer, or
 * null on any failure, timeout or abort.
 *
 * @param {string} target
 * @param {{ shared: AbortSignal; fetcher?: typeof fetch; timeoutMs?: number; signalOptions?: object }} options
 */
export async function fetchCardText(target, { shared, fetcher = globalThis.fetch, timeoutMs = CARD_TIMEOUT_MS, signalOptions } = {}) {
  const { signal, done } = requestSignal(shared, timeoutMs, signalOptions);
  try {
    const response = await fetcher(target, { mode: "cors", credentials: "omit", signal });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  } finally {
    done();
  }
}
