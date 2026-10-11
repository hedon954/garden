// Runs inside the Markdown preview. VS Code may reload this script and patch the
// DOM on every edit, so mounting is idempotent and keyed by each host's content.
(() => {
  if (typeof window.__gardenPreviewSync === "function") {
    window.__gardenPreviewSync();
    return;
  }

  const mounted = new Map();

  const decode = (value) => {
    if (!value) return "";
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  const theme = () => {
    const classes = document.body.classList;
    if (classes.contains("vscode-high-contrast-light") || classes.contains("vscode-light")) return "light";
    return classes.contains("vscode-dark") || classes.contains("vscode-high-contrast") ? "dark" : "light";
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  };

  const release = (host) => {
    const entry = mounted.get(host);
    if (!entry) return;
    mounted.delete(host);
    try {
      entry.handle.destroy();
    } catch {
      // The preview already replaced the host's children; nothing left to unmount.
    }
  };

  function sync() {
    if (!window.GardenUI) return;
    for (const host of mounted.keys()) if (!host.isConnected) release(host);
    const currentTheme = theme();
    for (const host of document.querySelectorAll(".garden-ui-host")) {
      const source = host.getAttribute("data-garden-source") || "";
      const files = host.getAttribute("data-garden-files") || "";
      const key = `${source}\n${files}\n${currentTheme}\n${host.getAttribute("data-garden-fence-line")}`;
      const entry = mounted.get(host);
      if (entry && entry.key === key && host.querySelector(".garden-ui-preview")) continue;
      release(host);
      host.replaceChildren();
      const text = decode(source);
      let handle;
      if (host.getAttribute("data-garden-lang") === "intent") {
        const prompt = host.getAttribute("data-garden-prompt");
        handle = window.GardenUI.renderIntent(host, text, {
          id: host.getAttribute("data-garden-id") || null,
          theme: currentTheme,
          onCopyPrompt: prompt ? () => copy(prompt) : undefined,
        });
      } else {
        const data = files ? JSON.parse(decode(files)) : {};
        handle = window.GardenUI.render(host, text, {
          theme: currentTheme,
          fenceLine: Number(host.getAttribute("data-garden-fence-line")) || 1,
          readFile: (src) => data[src],
        });
      }
      mounted.set(host, { key, handle });
    }
  }

  window.__gardenPreviewSync = sync;
  window.addEventListener("vscode.markdown.updateContent", sync);
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync);
  else sync();
})();
