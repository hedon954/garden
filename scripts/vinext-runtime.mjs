import fs from "node:fs";
import path from "node:path";

export function samePath(left, right) {
  return path.resolve(left) === path.resolve(right);
}

export function resolveRuntimeNodeModules(siteRoot, gardenPackageRoot) {
  const packageModules = path.join(gardenPackageRoot, "node_modules");
  const siteModules = path.join(siteRoot, "node_modules");
  if (fs.existsSync(path.join(packageModules, "vinext"))) return packageModules;
  if (fs.existsSync(path.join(siteModules, "vinext"))) return siteModules;
  return packageModules;
}

export function ensureLink(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    const stat = fs.lstatSync(to);
    if (stat.isSymbolicLink() && fs.readlinkSync(to) === from) return;
    if (stat.isSymbolicLink()) fs.unlinkSync(to);
    else return;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  fs.symlinkSync(from, to);
}

/** Overlay Vinext's cwd so file: and npm installs share one layout. */
export function ensureVinextRuntime({ siteRoot, gardenPackageRoot, lang = "zh" }) {
  if (samePath(siteRoot, gardenPackageRoot)) return gardenPackageRoot;

  const runtime = path.join(siteRoot, ".garden", "runtime");
  fs.mkdirSync(runtime, { recursive: true });

  const links = [
    ["app", path.join(gardenPackageRoot, "app")],
    ["ui", path.join(gardenPackageRoot, "ui")],
    ["scripts", path.join(gardenPackageRoot, "scripts")],
    ["docs", path.join(gardenPackageRoot, "docs")],
    ["build", path.join(gardenPackageRoot, "build")],
    ["worker", path.join(gardenPackageRoot, "worker")],
    [".openai", path.join(gardenPackageRoot, ".openai")],
    ["vite.config.ts", path.join(gardenPackageRoot, "vite.config.ts")],
    ["next.config.ts", path.join(gardenPackageRoot, "next.config.ts")],
    ["postcss.config.mjs", path.join(gardenPackageRoot, "postcss.config.mjs")],
    ["tsconfig.json", path.join(gardenPackageRoot, "tsconfig.json")],
    ["package.json", path.join(gardenPackageRoot, "package.json")],
    ["node_modules", resolveRuntimeNodeModules(siteRoot, gardenPackageRoot)],
    ["public", path.join(siteRoot, "public")],
    ["content", path.join(siteRoot, "content")],
    ["site.config.yaml", path.join(siteRoot, "site.config.yaml")],
  ];

  for (const name of [".env", ".env.local"]) {
    const from = path.join(siteRoot, name);
    if (fs.existsSync(from)) links.push([name, from]);
  }

  for (const [name, from] of links) {
    if (fs.existsSync(from) || name === "public" || name === "content") {
      if ((name === "public" || name === "content") && !fs.existsSync(from)) {
        fs.mkdirSync(from, { recursive: true });
      }
      ensureLink(from, path.join(runtime, name));
    }
  }

  // English sites: the runtime manifest is a copy with the English description, not a link.
  // Remove the link first so the write never goes through it into the engine's own package.json.
  if (lang === "en") {
    const target = path.join(runtime, "package.json");
    const manifest = JSON.parse(fs.readFileSync(path.join(gardenPackageRoot, "package.json"), "utf8"));
    manifest.description = "A personal blog engine: write in Markdown, publish with GitHub Pages.";
    fs.rmSync(target, { force: true });
    fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return runtime;
}
