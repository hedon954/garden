#!/usr/bin/env node
/**
 * Assembles the standalone documentation static export (`dist/docs-client`) for
 * GitHub Project Pages (`https://hedon.top/garden/`).
 *
 * When NEXT_PUBLIC_BASE_PATH="/garden", vinext exports HTML/RSC routes into
 * `<clientDir>/garden/...` while public assets and `_next/static` sit in
 * `<clientDir>/`. GitHub Project Pages mounts the artifact root itself at
 * `/garden/`, so we merge `<clientDir>/garden/*` onto the root of
 * `dist/docs-client/` to prevent `/garden/garden/` double prefixes, then run
 * placeholder cleanup, html lang tagging, asset integrity check, and Pages validation.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { removeNotFoundCopy, removeStaticPlaceholders } from "./static-placeholders.mjs";
import { setHandbookHtmlLang } from "./html-lang.mjs";
import { verifyRenderedSite } from "./rendered-site.mjs";
import { validateStaticOutput } from "./prepare-pages-output.mjs";

export async function prepareDocsPagesOutput({
  rawClientDir,
  outputDir,
  basePath = "/garden",
}) {
  const source = path.resolve(rawClientDir);
  const dest = path.resolve(outputDir);
  const subDirName = basePath.replace(/^\/+|\/+$/gu, "");

  if (!fs.existsSync(source)) {
    throw new Error(`Docs raw client directory not found: ${source}`);
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (subDirName && entry.name === subDirName && entry.isDirectory()) continue;
    fs.cpSync(path.join(source, entry.name), path.join(dest, entry.name), { recursive: true });
  }

  const nestedBaseDir = subDirName ? path.join(source, subDirName) : null;
  if (nestedBaseDir && fs.existsSync(nestedBaseDir)) {
    for (const entry of fs.readdirSync(nestedBaseDir, { withFileTypes: true })) {
      fs.cpSync(path.join(nestedBaseDir, entry.name), path.join(dest, entry.name), { recursive: true, force: true });
    }
  }

  removeStaticPlaceholders(dest);
  removeNotFoundCopy(dest);
  setHandbookHtmlLang(dest);
  fs.writeFileSync(path.join(dest, ".nojekyll"), "");

  const integrity = verifyRenderedSite(dest, { basePath });
  if (integrity.errors.length > 0) {
    throw new Error(
      `Docs rendered-site integrity failed:\n${JSON.stringify(integrity.errors, null, 2)}`,
    );
  }
  await validateStaticOutput(dest);
  return { pages: integrity.pages, assets: integrity.assets, outputDir: dest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , rawClientDir, outputDir] = process.argv;
  if (!rawClientDir || !outputDir) {
    throw new Error("Usage: node scripts/prepare-docs-pages.mjs <rawClientDir> <outputDir>");
  }
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/garden").replace(/\/+$/u, "");
  const result = await prepareDocsPagesOutput({ rawClientDir, outputDir, basePath });
  process.stdout.write(`Prepared standalone docs site: ${result.pages} pages, ${result.assets} assets -> ${result.outputDir}\n`);
}
