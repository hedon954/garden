import {editorPreviewCss} from "../../scripts/editor-preview-css.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(here, "src", "main.ts")],
  outfile: path.join(out, "main.js"),
  bundle: true,
  minify: true,
  platform: "browser",
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  alias: { "@garden/site-config":path.join(root,"ui","preview","site-config.ts"), mermaid: path.join(root, "ui", "preview", "mermaid-shim.ts") },
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_BASE_PATH":'""' },
  legalComments: "none",
  logLevel: "warning",
});

const css = [
  editorPreviewCss(root),
  ".garden-ui-typora { margin: 0.25em 0; text-align: left; white-space: normal; }",
  ".garden-suggest { display: flex; align-items: center; gap: 8px; }",
  ".garden-suggest-thumb { width: 72px; height: 48px; object-fit: cover; border-radius: 4px; background: #f6f3ec; flex: none; }",
  ".garden-suggest-label { font-size: 13px; line-height: 1.3; }",
  ".garden-suggest-hint { opacity: 0.65; font-size: 12px; }",
  ".garden-suggest-copy { display: flex; flex-direction: column; min-width: 0; gap: 1px; }",
];
fs.writeFileSync(path.join(out, "style.css"), css.join("\n"));
fs.copyFileSync(path.join(here, "manifest.json"), path.join(out, "manifest.json"));

process.stdout.write(`Typora 插件已构建：${path.relative(root, out)}（main.js、manifest.json、style.css）\n`);
