import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { gardenPackageRoot } from "./garden-paths.mjs";

const root = gardenPackageRoot;
const out = path.join(root, "ui", "preview", "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const shared = {
  entryPoints: [path.join(root, "ui", "preview", "index.tsx")],
  bundle: true,
  minify: true,
  jsx: "automatic",
  platform: "browser",
  target: ["es2020"],
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { mermaid: path.join(root, "ui", "preview", "mermaid-shim.ts") },
  legalComments: "none",
  logLevel: "warning",
};

await build({ ...shared, format: "iife", globalName: "GardenUI", outfile: path.join(out, "garden-ui.iife.js") });
await build({ ...shared, format: "esm", outfile: path.join(out, "garden-ui.esm.js") });
fs.copyFileSync(path.join(root, "ui", "react", "ui.css"), path.join(out, "garden-ui.css"));

const size = (file) => `${(fs.statSync(path.join(out, file)).size / 1024).toFixed(0)} KB`;
process.stdout.write(`预览包已生成：garden-ui.iife.js ${size("garden-ui.iife.js")}，garden-ui.esm.js ${size("garden-ui.esm.js")}，garden-ui.css\n`);
