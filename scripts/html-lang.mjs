#!/usr/bin/env node
/** Static export: English handbook pages get <html lang="en"> (ui/garden/html-lang.mjs). */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { handbookHtmlLang, withHtmlLang } from "../ui/garden/html-lang.mjs";

/** Rewrites every .html under root whose path is an English handbook page; returns the relative paths. */
export function setHandbookHtmlLang(root) {
  const changed = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.name.endsWith(".html")) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        const lang = handbookHtmlLang(relative);
        if (!lang || relative.includes("/media/") || relative.startsWith("media/")) continue;
        const html = fs.readFileSync(absolute, "utf8");
        const next = withHtmlLang(html, lang);
        if (next !== html) {
          fs.writeFileSync(absolute, next);
          changed.push(relative);
        }
      }
    }
  };
  visit(root);
  return changed.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const siteRoot = process.env.GARDEN_SITE ? path.resolve(process.env.GARDEN_SITE) : process.cwd();
  setHandbookHtmlLang(path.join(siteRoot, "dist", "client"));
}
