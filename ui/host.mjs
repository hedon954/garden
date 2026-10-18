/**
 * Host contract for the Intelligent UI module.
 *
 * The module (`ui/`) parses, checks, and draws blocks. It does not know about
 * Garden posts, Git, admin sessions, or which model is configured. A host
 * supplies those edges. The public blog host leaves `issuePrompt` unset, so a
 * sandbox cannot start a model turn. A chat host may implement it.
 */

export const SANDBOX_SOURCE = "garden-ui-sandbox";

/** @typedef {{
 *   openUrl?: (url: string) => void,
 *   issuePrompt?: (text: string) => void,
 *   copy?: (text: string) => void,
 * }} UiHost
 */

export function createHost(partial = {}) {
  return {
    openUrl: typeof partial.openUrl === "function" ? partial.openUrl : null,
    issuePrompt: typeof partial.issuePrompt === "function" ? partial.issuePrompt : null,
    copy: typeof partial.copy === "function" ? partial.copy : null,
  };
}

const LIMITS = { html: 12000, css: 8000, js: 8000 };

export function sandboxLimit(kind) {
  return LIMITS[kind] ?? 0;
}

/** Rejects anything that would pull a remote resource into the frame. */
export function sandboxRemote(source) {
  const text = String(source ?? "");
  if (/<script\b[^>]*\bsrc\s*=/iu.test(text)) return "不能加载远程脚本";
  if (/\b(?:import|require)\s*\(/u.test(text)) return "不能动态加载模块";
  if (/url\(\s*['"]?https?:/iu.test(text)) return "样式不能引用远程地址";
  if (/<(?:img|iframe|object|embed|link|video|audio)\b[^>]+(?:src|href)\s*=\s*['"]https?:/iu.test(text)) {
    return "不能嵌入远程地址";
  }
  return null;
}

export function isHttpsUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

const THEMES = {
  light: {
    ink: "#1B1A18",
    text: "#2D2C29",
    soft: "#4A4844",
    muted: "#6E6B64",
    grey: "#737069",
    rule: "#E6E3DC",
    ruleStrong: "#D6D2C9",
    card: "#FFFFFF",
    paper: "#FAF9F5",
    well: "#F0EEE6",
    blue: "#30302E",
    blueTint: "#F0EEE6",
    blueLine: "rgba(20,20,19,.22)",
  },
  dark: {
    ink: "#EEECE7",
    text: "#DCD9D2",
    soft: "#BDB9B0",
    muted: "#A09B91",
    grey: "#A09B91",
    rule: "#3D3D3A",
    ruleStrong: "#4D4C48",
    card: "#262624",
    paper: "#1F1E1D",
    well: "#262624",
    blue: "#EEECE7",
    blueTint: "#30302E",
    blueLine: "rgba(238,236,231,.25)",
  },
};

function tokenCss(theme) {
  const token = THEMES[theme] ?? THEMES.light;
  return `
:root {
  color: ${token.text};
  color-scheme: ${theme === "dark" ? "dark" : "light"};
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
  --ink: ${token.ink};
  --text: ${token.text};
  --soft: ${token.soft};
  --muted: ${token.muted};
  --grey: ${token.grey};
  --rule: ${token.rule};
  --rule-strong: ${token.ruleStrong};
  --card: ${token.card};
  --paper: ${token.paper};
  --well: ${token.well};
  --blue: ${token.blue};
  --blue-tint: ${token.blueTint};
  --blue-line: ${token.blueLine};
}
html, body { background: transparent !important; overflow: hidden !important; height: auto !important; }
body { margin: 0; }
body > :first-child { padding-right: 44px; box-sizing: border-box; }
svg { max-width: 100%; height: auto; }
`;
}

/** Keeps author CSS and script inside their own tags. */
function keepInside(source, closing) {
  return String(source ?? "").replaceAll(closing, `${closing.slice(0, 1)}\\${closing.slice(1)}`);
}

/**
 * Document for a sandboxed AppBlock. Scripts are inline only. The frame has
 * no network. `canPrompt` is true only when the host implements `issuePrompt`.
 */
export function buildSrcdoc({ html = "", css = "", js = "", canPrompt = false, theme = "light" } = {}) {
  const bridge = `
    const GardenUI = {
      canPrompt: ${canPrompt ? "true" : "false"},
      openUrl(url) {
        parent.postMessage({ source: ${JSON.stringify(SANDBOX_SOURCE)}, type: "openUrl", url: String(url) }, "*");
      },
      issuePrompt(text) {
        if (!GardenUI.canPrompt) return false;
        parent.postMessage({ source: ${JSON.stringify(SANDBOX_SOURCE)}, type: "issuePrompt", text: String(text).slice(0, 500) }, "*");
        return true;
      },
      copy(text) {
        parent.postMessage({ source: ${JSON.stringify(SANDBOX_SOURCE)}, type: "copy", text: String(text).slice(0, 4000) }, "*");
        return true;
      }
    };
    const report = () => {
      let bottom = 0;
      for (const el of document.body.children) {
        if (el.tagName === "SCRIPT") continue;
        bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
      }
      parent.postMessage({ source: ${JSON.stringify(SANDBOX_SOURCE)}, type: "height", height: Math.ceil(bottom + 8) }, "*");
    };
    addEventListener("load", report);
    if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
  `;
  const safeCss = keepInside(css, "</style");
  const safeHtml = keepInside(html, "</script");
  const safeJs = keepInside(js, "</script");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;"><style>${tokenCss(theme)}${safeCss}</style></head><body>${safeHtml}<script>${bridge}<\/script><script>${safeJs}<\/script></body></html>`;
}

export function readSandboxMessage(data) {
  if (!data || typeof data !== "object" || data.source !== SANDBOX_SOURCE) return null;
  if (data.type === "height" && typeof data.height === "number" && data.height > 0 && data.height < 4000) {
    return { type: "height", height: Math.round(data.height) };
  }
  if (data.type === "openUrl" && isHttpsUrl(data.url)) return { type: "openUrl", url: String(data.url) };
  if (data.type === "issuePrompt" && typeof data.text === "string" && data.text.trim()) {
    return { type: "issuePrompt", text: data.text.trim().slice(0, 500) };
  }
  if (data.type === "copy" && typeof data.text === "string") {
    return { type: "copy", text: data.text.slice(0, 4000) };
  }
  return null;
}
