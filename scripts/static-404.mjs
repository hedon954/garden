#!/usr/bin/env node
/**
 * Static export with a basePath: vinext writes 404.html at dist/client/404.html.
 * Copy it into the basePath folder too, so a host that serves only that folder
 * (or Paths under /basePath/…) still has a 404 page next to the site.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function copyNotFoundIntoBasePath(clientRoot, basePath = "") {
  const base = String(basePath ?? "").replace(/\/+$/u, "").replace(/^\/+/u, "");
  if (!base) return null;
  const source = path.join(clientRoot, "404.html");
  const destination = path.join(clientRoot, base, "404.html");
  if (!fs.existsSync(source) || !fs.existsSync(path.dirname(destination))) return null;
  fs.copyFileSync(source, destination);
  return path.relative(clientRoot, destination).split(path.sep).join("/");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/u, "");
  copyNotFoundIntoBasePath(path.join(siteRoot, "dist", "client"), basePath);
}
