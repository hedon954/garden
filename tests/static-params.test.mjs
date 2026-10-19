import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../ui/garden/static-params.mjs";
import { removeStaticPlaceholders } from "../scripts/static-placeholders.mjs";
import { validateStaticOutput } from "../scripts/prepare-pages-output.mjs";

const withStaticExport = (value, fn) => {
  const before = process.env.STATIC_EXPORT;
  if (value === undefined) delete process.env.STATIC_EXPORT;
  else process.env.STATIC_EXPORT = value;
  try { return fn(); } finally {
    if (before === undefined) delete process.env.STATIC_EXPORT;
    else process.env.STATIC_EXPORT = before;
  }
};

test("an empty dynamic route gets one placeholder entry, only in a static export", () => {
  const placeholder = { slug: STATIC_PLACEHOLDER };
  withStaticExport("1", () => {
    assert.deepEqual(staticParams([], placeholder), [placeholder]);
    assert.deepEqual(staticParams([{ slug: "a" }], placeholder), [{ slug: "a" }], "real entries are left alone");
  });
  withStaticExport(undefined, () => assert.deepEqual(staticParams([], placeholder), [], "the worker build keeps the empty list"));
});

test("every generateStaticParams in app/ goes through staticParams", () => {
  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(tsx?|mjs)$/u.test(entry.name) && /export (?:async )?function generateStaticParams/u.test(fs.readFileSync(file, "utf8"))) pages.push(file);
    }
  };
  walk(new URL("../app", import.meta.url).pathname);
  assert.ok(pages.length >= 5, `found ${pages.length}`);
  for (const file of pages) {
    const body = fs.readFileSync(file, "utf8").match(/export (?:async )?function generateStaticParams\(\)[^{]*\{([\s\S]*?)\n\}/u)[1];
    assert.match(body, /staticParams\(/u, path.relative(process.cwd(), file));
    // The prerender fails a route whose page answers 404, so the placeholder renders nothing before notFound().
    const source = fs.readFileSync(file, "utf8");
    if (/notFound\(\)/u.test(source)) assert.match(source, /if \(isStaticPlaceholder\([^)]*\)\) return null;\s*notFound\(\);/u, `${path.relative(process.cwd(), file)} renders the placeholder`);
  }
});

test("isStaticPlaceholder knows the placeholder slug and a catch-all path starting with it", () => {
  assert.equal(isStaticPlaceholder(STATIC_PLACEHOLDER), true);
  assert.equal(isStaticPlaceholder([STATIC_PLACEHOLDER]), true);
  assert.equal(isStaticPlaceholder("go-lock"), false);
  assert.equal(isStaticPlaceholder(["go", "go-lock"]), false);
  assert.equal(isStaticPlaceholder(undefined), false);
});

test("the build step deletes what the export wrote for the placeholder and nothing else", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "garden-placeholder-"));
  const write = (file) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), "x"); };
  for (const file of [
    `thoughts/${STATIC_PLACEHOLDER}/index.html`,
    `thoughts/${STATIC_PLACEHOLDER}/index.txt`,
    `columns/${STATIC_PLACEHOLDER}/${STATIC_PLACEHOLDER}/index.html`,
    `blog/${STATIC_PLACEHOLDER}.txt`,
    "thoughts/index.html",
    "thoughts/index.txt",
    "blog/a/index.html",
  ]) write(file);
  assert.deepEqual(removeStaticPlaceholders(root), [
    `blog/${STATIC_PLACEHOLDER}.txt`,
    `columns/${STATIC_PLACEHOLDER}`,
    `thoughts/${STATIC_PLACEHOLDER}`,
  ]);
  assert.ok(fs.existsSync(path.join(root, "thoughts/index.html")));
  assert.ok(fs.existsSync(path.join(root, "thoughts/index.txt")));
  assert.ok(fs.existsSync(path.join(root, "blog/a/index.html")));
  assert.deepEqual(removeStaticPlaceholders(path.join(root, "missing")), []);
});

test("Pages validation refuses output that still has a placeholder page", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "garden-placeholder-"));
  fs.writeFileSync(path.join(root, "index.html"), "<!doctype html>");
  fs.mkdirSync(path.join(root, "thoughts", STATIC_PLACEHOLDER), { recursive: true });
  fs.writeFileSync(path.join(root, "thoughts", STATIC_PLACEHOLDER, "index.html"), "x");
  await assert.rejects(validateStaticOutput(root), /占位页/u);
});

// Only a static export (STATIC_EXPORT=1) runs the cleanup; the test build is not one.
const staticExport = fs.existsSync(new URL("../dist/client/index.txt", import.meta.url));
test("the static export has no placeholder pages", { skip: !staticExport && "dist is not a static export" }, () => {
  const found = [];
  const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { if (entry.name.startsWith(STATIC_PLACEHOLDER)) found.push(entry.name); else if (entry.isDirectory()) walk(path.join(dir, entry.name)); } };
  walk(new URL("../dist/client", import.meta.url).pathname);
  assert.deepEqual(found, []);
});
