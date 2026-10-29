import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { coverImageSet, coverWidths, loadSharp } from "../scripts/cover-images.mjs";

test("cover widths: below the original, plus the original when it is small", () => {
  assert.deepEqual(coverWidths(3000), [480, 960, 1440]);
  assert.deepEqual(coverWidths(1200), [480, 960, 1200]);
  assert.deepEqual(coverWidths(960), [480, 960]);
  assert.deepEqual(coverWidths(300), [300]);
  assert.deepEqual(coverWidths(0), []);
});

test("covers get hashed WebP copies; the original is left alone", async (t) => {
  const sharp = await loadSharp();
  if (!sharp) return t.skip("sharp not installed");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-cover-"));
  const source = path.join(dir, "src.jpg");
  const destination = path.join(dir, "out", "big-cover.jpg");
  fs.mkdirSync(path.dirname(destination));
  fs.writeFileSync(source, await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#c96" } }).jpeg().toBuffer());
  fs.copyFileSync(source, destination);
  const before = fs.readFileSync(source);

  const set = await coverImageSet({ sharp, source, destination, url: "/media/covers/big-cover.jpg" });
  assert.equal(set.width, 2000);
  assert.equal(set.height, 1000);
  assert.match(set.src, /^\/media\/covers\/big-cover\.[0-9a-f]{8}-960\.webp$/u);
  assert.deepEqual(set.srcset.split(", ").map((part) => part.split(" ")[1]), ["480w", "960w", "1440w"]);
  for (const part of set.srcset.split(", ")) {
    const file = path.join(path.dirname(destination), decodeURIComponent(part.split(" ")[0].split("/").pop()));
    const meta = await sharp(fs.readFileSync(file)).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(`${meta.width}w`, part.split(" ")[1]);
  }
  assert.deepEqual(fs.readFileSync(source), before);
  assert.deepEqual(fs.readFileSync(destination), before);
});

test("without sharp, or for SVG covers, nothing is made", async () => {
  assert.equal(await coverImageSet({ sharp: null, source: "/x.jpg", destination: "/y.jpg", url: "/media/y.jpg" }), null);
  const sharp = await loadSharp();
  assert.equal(await coverImageSet({ sharp, source: "/x.svg", destination: "/y.svg", url: "/media/y.svg" }), null);
  assert.equal(await coverImageSet({ sharp, source: "/missing.jpg", destination: "/y.jpg", url: "/media/y.jpg" }), null);
});

test("cover markup: one early cover per page, everything else lazy, sizes reserved", () => {
  const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const component = read("app/components/CoverImage.tsx");
  assert.match(component, /loading=\{priority \? "eager" : "lazy"\}/u);
  assert.match(component, /fetchPriority=\{priority \? "high" : undefined\}/u);
  assert.match(component, /decoding="async"/u);
  assert.match(component, /width=\{image\?\.width\}\s*height=\{image\?\.height\}/u);
  assert.match(component, /srcSet=\{image\?\.srcset\}/u);
  for (const page of ["app/page.tsx", "app/components/PostReadingView.tsx"]) {
    assert.equal((read(page).match(/<CoverImage[^>]*\bpriority\b/gu) ?? []).length, 1, page);
  }
  for (const page of ["app/blog/[...path]/page.tsx", "app/columns/[column]/[...path]/page.tsx"]) {
    assert.equal((read(page).match(/<CoverImage/gu) ?? []).length, 0, `${page} uses PostReadingView for the cover`);
  }
  assert.doesNotMatch(read("app/components/BlogArchive.tsx"), /<img/u);
});
