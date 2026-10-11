import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { RECIPE_FILES } from "../../ui/prompt/build.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, "dist");
const preview = path.join(root, "ui", "preview", "dist");

execFileSync(process.execPath, [path.join(root, "scripts", "build-ui-preview.mjs")], { stdio: "inherit" });
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const recipes = RECIPE_FILES.map((file) => ({
  file,
  markdown: fs.readFileSync(path.join(root, "ui", "prompt", "recipes", file), "utf8"),
}));

await build({
  entryPoints: [path.join(here, "src", "extension.ts")],
  outfile: path.join(out, "extension.js"),
  bundle: true,
  minify: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  external: ["vscode"],
  define: { __GARDEN_RECIPES__: JSON.stringify(recipes) },
  legalComments: "none",
  logLevel: "warning",
});

for (const file of ["garden-ui.iife.js", "garden-ui.css"]) fs.copyFileSync(path.join(preview, file), path.join(out, file));
for (const file of ["preview.js", "preview.css"]) fs.copyFileSync(path.join(here, "media", file), path.join(out, file));
for (const file of ["LICENSE"]) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(here, file));
}

process.stdout.write(`VS Code 扩展已构建：${path.relative(root, out)}\n`);
