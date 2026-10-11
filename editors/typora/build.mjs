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
  alias: { mermaid: path.join(root, "ui", "preview", "mermaid-shim.ts") },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "warning",
});

const css = [
  fs.readFileSync(path.join(root, "ui", "react", "ui.css"), "utf8"),
  ".garden-ui-typora { margin: 0.25em 0; text-align: left; white-space: normal; }",
];
fs.writeFileSync(path.join(out, "style.css"), css.join("\n"));
fs.copyFileSync(path.join(here, "manifest.json"), path.join(out, "manifest.json"));

process.stdout.write(`Typora 插件已构建：${path.relative(root, out)}（main.js、manifest.json、style.css）\n`);
