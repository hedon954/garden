// The static export's client navigation data (cloudflare/vinext#4094). vinext 1.x
// writes every page's Flight payload as index.txt next to its index.html, the home
// page's as /index.txt, and the browser accepts it as text/plain, which is how
// GitHub Pages serves .txt. With vinext 0.0.50 the home payload was asked for at
// /.rsc (404) and .rsc came as application/octet-stream, so client navigation fell
// back to full page loads; garden patched vinext for that until 0.6.0.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { clientAssetText } from "./client-assets.mjs";

const out = fileURLToPath(new URL("../dist/client/", import.meta.url));
const staticExport = fs.existsSync(path.join(out, "index.txt"));
const skip = !staticExport && "needs a static export in dist/client";

const files = (dir) => fs.readdirSync(dir, { recursive: true }).map(String).map((name) => name.split(path.sep).join("/"));

test("every exported page has its payload next to it, the home page at /index.txt, and none is .rsc", { skip }, () => {
  const all = files(out);
  assert.deepEqual(all.filter((name) => name.endsWith(".rsc")), []);
  const pages = all.filter((name) => name.endsWith("index.html"))
    // Redirect pages for old addresses are plain HTML that sends the reader on; 404/ is vinext's copy of 404.html.
    .filter((name) => !/http-equiv="refresh"/u.test(fs.readFileSync(path.join(out, name), "utf8")) && name !== "404/index.html");
  assert.ok(pages.includes("index.html"));
  const missing = pages.filter((name) => !fs.existsSync(path.join(out, name.replace(/index\.html$/u, "index.txt"))));
  assert.deepEqual(missing, []);
});

test("the exported client bundle asks for index.txt and takes text/plain as a payload", { skip }, () => {
  const scripts = clientAssetText(/\.js$/u);
  assert.match(scripts, /index\.txt/u);
  assert.match(scripts, /text\/plain/u);
});
