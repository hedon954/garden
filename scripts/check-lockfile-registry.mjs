#!/usr/bin/env node
// Fails when package-lock.json downloads anything from somewhere other than the
// public npm registry. A mirror (for example a China mirror) belongs in your own
// ~/.npmrc or a project .npmrc that you keep out of git, never in the lockfile:
// CI runners elsewhere may not reach it, and `npm ci` then hangs without output.
// Usage: node scripts/check-lockfile-registry.mjs [path/to/package-lock.json]
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const ALLOWED_REGISTRY = "https://registry.npmjs.org/";

/** Entries of a lockfile whose `resolved` URL is not on registry.npmjs.org. */
export function foreignResolved(lock) {
  const out = [];
  for (const [name, entry] of Object.entries(lock?.packages ?? {})) {
    const resolved = entry?.resolved;
    // Workspace links and the root package have no download URL.
    if (typeof resolved !== "string" || entry.link) continue;
    if (!resolved.startsWith(ALLOWED_REGISTRY)) out.push({ name: name || "(root)", resolved });
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const file = process.argv[2] ?? "package-lock.json";
  const offenders = foreignResolved(JSON.parse(fs.readFileSync(file, "utf8")));
  if (offenders.length) {
    console.error(`${file}: ${offenders.length} 个包的 resolved 不在 ${ALLOWED_REGISTRY}：`);
    for (const { name, resolved } of offenders.slice(0, 20)) console.error(`  ${name}  ${resolved}`);
    if (offenders.length > 20) console.error(`  …… 另外 ${offenders.length - 20} 个`);
    console.error("镜像请写在自己的 .npmrc 里，不要进锁文件。把这些地址改回 registry.npmjs.org 后再提交。");
    process.exit(1);
  }
  console.log(`${file}: 全部 resolved 都在 ${ALLOWED_REGISTRY}`);
}
