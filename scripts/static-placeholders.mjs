#!/usr/bin/env node
/**
 * Deletes what the static export wrote for STATIC_PLACEHOLDER (see
 * ui/garden/static-params.mjs): the directory or file of every path segment
 * named after it. Runs after the build, on dist/client.
 *
 * Also deletes 404/index.html when it is a copy of 404.html: with trailingSlash
 * vinext writes both, and on a static host the copy makes /404/ answer 200.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { STATIC_PLACEHOLDER } from "../ui/garden/static-params.mjs";

/** Removes placeholder output under root and returns the removed paths, relative to root. */
export function removeStaticPlaceholders(root) {
  const removed = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.name === STATIC_PLACEHOLDER || entry.name.startsWith(`${STATIC_PLACEHOLDER}.`)) {
        fs.rmSync(absolute, { recursive: true, force: true });
        removed.push(path.relative(root, absolute).split(path.sep).join("/"));
      } else if (entry.isDirectory()) {
        visit(absolute);
      }
    }
  };
  visit(root);
  return removed.sort();
}

/** Deletes 404/index.html (and the then empty 404/) when it is byte-for-byte 404.html. Returns whether it did. */
export function removeNotFoundCopy(root) {
  const page = path.join(root, "404.html");
  const copy = path.join(root, "404", "index.html");
  if (!fs.existsSync(page) || !fs.existsSync(copy) || !fs.readFileSync(page).equals(fs.readFileSync(copy))) return false;
  fs.rmSync(copy);
  if (!fs.readdirSync(path.dirname(copy)).length) fs.rmdirSync(path.dirname(copy));
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  removeStaticPlaceholders(path.join(siteRoot, "dist", "client"));
  removeNotFoundCopy(path.join(siteRoot, "dist", "client"));
}
