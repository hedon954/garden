#!/usr/bin/env node
/**
 * Static export 404 pages:
 * - vinext writes 404.html at dist/client/404.html.
 * - Write an English 404 at garden/en/404.html (and under basePath/garden/en/404.html)
 *   so static hosts and built-HTML checks have a clean English 404 page.
 * - Copy 404.html into the basePath folder too, so a host that serves only that
 *   folder (or paths under /basePath/…) still has a 404 page next to the site.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { toEnglishNotFoundHtml } from "../ui/garden/html-lang.mjs";

export function writeEnglishNotFoundPage(clientRoot, basePath = "") {
  const source = path.join(clientRoot, "404.html");
  if (!fs.existsSync(source)) return [];
  const enHtml = toEnglishNotFoundHtml(fs.readFileSync(source, "utf8"));
  const written = [];
  const base = String(basePath ?? "").replace(/\/+$/u, "").replace(/^\/+/u, "");
  const targets = [
    path.join(clientRoot, "garden", "en", "404.html"),
    ...(base ? [path.join(clientRoot, base, "garden", "en", "404.html")] : []),
  ];
  for (const target of targets) {
    if (!fs.existsSync(path.dirname(target))) continue;
    fs.writeFileSync(target, enHtml);
    written.push(path.relative(clientRoot, target).split(path.sep).join("/"));
  }
  return written;
}

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
  const clientRoot = path.join(siteRoot, "dist", "client");
  copyNotFoundIntoBasePath(clientRoot, basePath);
  writeEnglishNotFoundPage(clientRoot, basePath);
}
