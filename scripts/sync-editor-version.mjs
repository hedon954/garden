import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Root Garden version is authoritative. npm version runs this before its release commit. */
export function syncEditorVersion({ root = defaultRoot, check = false } = {}) {
  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error("Garden editor releases require a stable major.minor.patch version.");
  for (const name of ["package.json", "package-lock.json"]) {
    const file = path.join(root, "editors/vscode", name);
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    const versions = name === "package-lock.json" ? [value, value.packages[""]] : [value];
    if (versions.every((item) => item.version === version)) continue;
    if (check) throw new Error(`${file} must match Garden ${version}; run node scripts/sync-editor-version.mjs and commit both editor manifests.`);
    for (const item of versions) item.version = version;
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  }
  return version;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = syncEditorVersion({ check: process.argv.includes("--check") });
  if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME !== `v${version}`)
    throw new Error(`Release tag ${process.env.GITHUB_REF_NAME} does not match Garden v${version}`);
  process.stdout.write(`Garden / VS Code extension version: ${version}\n`);
}
