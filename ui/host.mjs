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
    color: "#0d0d0d",
    text: "#0d0d0d",
    muted: "#5d5d5d",
    subtle: "#8f8f8f",
    panel: "#ffffff",
    border: "#0000001a",
    accent: "#0169cc",
    series: "#0285ff",
    track: "#0d0d0d1f",
  },
  dark: {
    color: "#ededed",
    text: "#ededed",
    muted: "#cdcdcd",
    subtle: "#afafaf",
    panel: "#212121",
    border: "#ffffff1a",
    accent: "#66b5ff",
    series: "#0285ff",
    track: "#ffffff26",
  },
};

function tokenCss(theme) {
  const token = THEMES[theme] ?? THEMES.light;
  return `
:root {
  color: ${token.color};
  background: transparent;
  font-family: -apple-system-body, ui-sans-serif, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
  --viz-text: ${token.text};
  --viz-muted: ${token.muted};
  --viz-subtle: ${token.subtle};
  --viz-panel: ${token.panel};
  --viz-border: ${token.border};
  --viz-accent: ${token.accent};
  --viz-series: ${token.series};
  --viz-track: ${token.track};
}
body { margin: 0; }
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
