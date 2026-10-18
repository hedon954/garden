/**
 * Background loading of the full-text index, in the browser.
 *
 * The file name carries a hash, but GitHub Pages only lets browsers cache it
 * for ten minutes, so the parsed docs are also kept in IndexedDB under that
 * hash. Pages after the first read them from there without a request. Any
 * storage problem quietly falls back to the network.
 */

const STORE = "full";

/**
 * `[[path, text], ...]` from the file's contents (`{ hash, texts, docs }`).
 *
 * @returns {Array<[string, string]>}
 */
export function expandFullIndex(data) {
  if (!Array.isArray(data?.texts) || !Array.isArray(data?.docs)) throw new Error("full-text index is malformed");
  return data.docs.map(([url, index]) => [url, String(data.texts[index] ?? "")]);
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * IndexedDB holding one entry: the docs for the current hash. One database per site path.
 *
 * @param {string} [scope]
 * @param {IDBFactory | undefined} [idb]
 */
export function createIdbStore(scope = "", idb = globalThis.indexedDB) {
  let opened = null;
  const open = () => {
    if (!idb) return Promise.reject(new Error("no IndexedDB"));
    opened ??= new Promise((resolve, reject) => {
      const req = idb.open(`garden-search${scope}`, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("blocked"));
    }).catch((error) => {
      opened = null;
      throw error;
    });
    return opened;
  };
  return {
    async get(hash) {
      const db = await open();
      return (await request(db.transaction(STORE, "readonly").objectStore(STORE).get(hash))) ?? null;
    },
    /** Store the docs for this hash and drop every other entry. */
    async replace(hash, docs) {
      const db = await open();
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      store.put(docs, hash);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
  };
}

/**
 * `[[path, text], ...]` for this hash: from the store when it has it, otherwise from the network.
 *
 * @param {{ url: string; hash: string; store?: { get(hash: string): Promise<unknown>; replace(hash: string, docs: unknown): Promise<void> } | null; fetcher?: typeof fetch }} options
 * @returns {Promise<Array<[string, string]>>}
 */
export async function loadFullIndex({ url, hash, store, fetcher = globalThis.fetch }) {
  try {
    const cached = await store?.get(hash);
    if (cached) return expandFullIndex(cached);
  } catch {
    // Storage unavailable or entry unreadable: use the network.
  }
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`full-text index ${response.status}`);
  const data = await response.json();
  const docs = expandFullIndex(data);
  try {
    await store?.replace(data.hash ?? hash, data);
  } catch {
    // Not cached this time; the next page fetches it again.
  }
  return docs;
}

/** The reader asked their browser to save data. */
export function saveDataOn(nav = globalThis.navigator) {
  return Boolean(nav?.connection?.saveData);
}

/**
 * Run `task` once the page has fully loaded and the browser is idle, so it
 * never competes with rendering. Falls back to a timer where
 * requestIdleCallback is missing. Returns a cancel function.
 */
/**
 * @param {() => void} task
 * @param {{ win?: any; timeout?: number; fallbackDelay?: number }} [options]
 */
export function whenIdleAfterLoad(task, { win = globalThis.window, timeout = 4000, fallbackDelay = 1200 } = {}) {
  let cancelled = false;
  let handle = null;
  const run = () => {
    if (!cancelled) task();
  };
  const schedule = () => {
    if (cancelled) return;
    handle = typeof win.requestIdleCallback === "function"
      ? { idle: win.requestIdleCallback(run, { timeout }) }
      : { timer: win.setTimeout(run, fallbackDelay) };
  };
  if (win.document?.readyState === "complete") schedule();
  else win.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    win.removeEventListener?.("load", schedule);
    if (handle?.idle != null) win.cancelIdleCallback?.(handle.idle);
    if (handle?.timer != null) win.clearTimeout?.(handle.timer);
  };
}
