import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { RECIPE_FILES } from "../../ui/prompt/build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const recipes = RECIPE_FILES.map((file) => ({
  file,
  markdown: fs.readFileSync(path.join(root, "ui", "prompt", "recipes", file), "utf8"),
}));

await build({
  entryPoints: [path.join(here, "src", "main.ts")],
  outfile: path.join(out, "main.js"),
  bundle: true,
  minify: true,
  platform: "browser",
  format: "cjs",
  target: "es2020",
  jsx: "automatic",
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  alias: { mermaid: path.join(root, "ui", "preview", "mermaid-shim.ts") },
  define: { __GARDEN_RECIPES__: JSON.stringify(recipes), "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "warning",
});

const css = [fs.readFileSync(path.join(root, "ui", "react", "ui.css"), "utf8"), fs.readFileSync(path.join(here, "src", "styles.css"), "utf8")];
fs.writeFileSync(path.join(out, "styles.css"), css.join("\n"));
fs.copyFileSync(path.join(here, "manifest.json"), path.join(out, "manifest.json"));

process.stdout.write(`Obsidian 插件已构建：${path.relative(root, out)}（main.js、manifest.json、styles.css）\n`);
