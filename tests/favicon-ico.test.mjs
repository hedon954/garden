import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { ICO_SIZES, icoFromPngs, runFaviconStep } from "../scripts/favicon-ico.mjs";

/** The PNG images inside an ICO file, with the size each directory entry claims. */
function readIco(buffer) {
  assert.equal(buffer.readUInt16LE(0), 0);
  assert.equal(buffer.readUInt16LE(2), 1, "type 1 = icon");
  const count = buffer.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => {
    const at = 6 + 16 * index;
    const size = buffer.readUInt8(at) || 256;
    const length = buffer.readUInt32LE(at + 8);
    const offset = buffer.readUInt32LE(at + 12);
    return { size, png: buffer.subarray(offset, offset + length) };
  });
}

function site({ config = "", files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "garden-ico-"));
  fs.mkdirSync(path.join(root, "dist", "client"), { recursive: true });
  fs.writeFileSync(path.join(root, "site.config.yaml"), config);
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), body);
  }
  return root;
}

const sink = () => { let text = ""; return { write: (chunk) => { text += chunk; }, get text() { return text; } }; };
const gardenIcon = fs.readFileSync(new URL("../public/favicon.svg", import.meta.url));

test("icoFromPngs writes a directory entry per image, pointing at its bytes", () => {
  const ico = icoFromPngs([{ size: 16, png: Buffer.from("aaaa") }, { size: 48, png: Buffer.from("bbbbbb") }]);
  assert.deepEqual(readIco(ico).map(({ size, png }) => [size, png.toString()]), [[16, "aaaa"], [48, "bbbbbb"]]);
});

test("favicon.ico holds 16, 32 and 48 px images of the default icon", async () => {
  const root = site({ files: { "public/favicon.svg": gardenIcon } });
  const out = sink();
  assert.equal(await runFaviconStep({ siteRoot: root, env: {}, out }), 0);
  const images = readIco(fs.readFileSync(path.join(root, "dist", "client", "favicon.ico")));
  assert.deepEqual(images.map((image) => image.size), ICO_SIZES);
  for (const { size, png } of images) {
    const meta = await sharp(png).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ["png", size, size]);
    // Something is drawn: not an empty, fully transparent square.
    const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.ok(data.some((value, index) => index % 4 === 3 && value > 0));
  }
  assert.match(out.text, /favicon\.ico：由 public\/favicon\.svg 生成（16、32、48 px）/u);
});

test("the icon comes from brand.favicon, not a fixed file", async () => {
  const red = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#ff0000"/></svg>';
  const root = site({ config: "brand:\n  favicon: /icons/mark.svg\n", files: { "public/icons/mark.svg": red, "public/favicon.svg": gardenIcon } });
  await runFaviconStep({ siteRoot: root, env: {}, out: sink() });
  const [, image32] = readIco(fs.readFileSync(path.join(root, "dist", "client", "favicon.ico")));
  const { data, info } = await sharp(image32.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const centre = ((info.height / 2) * info.width + info.width / 2) * 4;
  assert.deepEqual([...data.subarray(centre, centre + 4)], [255, 0, 0, 255]);
  // A PNG icon works the same way.
  const png = await sharp({ create: { width: 64, height: 64, channels: 4, background: "#00ff00" } }).png().toBuffer();
  const pngSite = site({ config: "brand:\n  favicon: /mark.png\n", files: { "public/mark.png": png } });
  await runFaviconStep({ siteRoot: pngSite, env: {}, out: sink() });
  assert.deepEqual(readIco(fs.readFileSync(path.join(pngSite, "dist", "client", "favicon.ico"))).map((image) => image.size), ICO_SIZES);
});

test("a site's own favicon.ico wins; an icon from another origin only warns", async () => {
  const own = site({ files: { "public/favicon.svg": gardenIcon, "public/favicon.ico": "mine", "dist/client/favicon.ico": "mine" } });
  const out = sink();
  await runFaviconStep({ siteRoot: own, env: {}, out });
  assert.equal(fs.readFileSync(path.join(own, "dist", "client", "favicon.ico"), "utf8"), "mine");
  assert.match(out.text, /使用 public\/favicon\.ico/u);

  const remote = site({ config: "brand:\n  favicon: https://cdn.example.com/icon.svg\n" });
  const warn = sink();
  assert.equal(await runFaviconStep({ siteRoot: remote, env: {}, out: warn }), 0);
  assert.equal(fs.existsSync(path.join(remote, "dist", "client", "favicon.ico")), false);
  assert.match(warn.text, /外部地址/u);

  const missing = site({ config: "brand:\n  favicon: /nope.svg\n" });
  const warnMissing = sink();
  assert.equal(await runFaviconStep({ siteRoot: missing, env: {}, out: warnMissing }), 0);
  assert.match(warnMissing.text, /找不到图标文件 \/nope\.svg/u);
});

test("a base path is stripped before looking in public/", async () => {
  const root = site({ config: "brand:\n  favicon: /mark.svg\n", files: { "public/mark.svg": gardenIcon } });
  await runFaviconStep({ siteRoot: root, env: { NEXT_PUBLIC_BASE_PATH: "/blog" }, out: sink() });
  assert.ok(fs.existsSync(path.join(root, "dist", "client", "favicon.ico")));
});

test("every build writes favicon.ico, static export or not", () => {
  const cli = fs.readFileSync(new URL("../bin/garden.mjs", import.meta.url), "utf8");
  const build = cli.slice(cli.indexOf('case "build":'), cli.indexOf('case "links":'));
  const step = build.indexOf('runNode("scripts/favicon-ico.mjs")');
  assert.ok(step > build.indexOf("runVinext([\"build\"") && step < build.indexOf('process.env.STATIC_EXPORT === "1"'));
  // sharp is a direct dependency: the step must not lean on another package's copy.
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok(pkg.dependencies.sharp);
});

// After `garden build` (the verify workflow's static export step): the real file, from the site's real icon.
const built = new URL("../dist/client/favicon.ico", import.meta.url);
const builtIndex = new URL("../dist/client/index.html", import.meta.url);
test("the build output serves /favicon.ico made from the site's icon", { skip: !fs.existsSync(builtIndex) && "needs a build in dist/client" }, async () => {
  assert.ok(fs.existsSync(built), "dist/client/favicon.ico");
  const images = readIco(fs.readFileSync(built));
  assert.deepEqual(images.map((image) => image.size), ICO_SIZES);
  const expected = await sharp(gardenIcon, { density: 144 }).resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const [a, b] = await Promise.all([images[1].png, expected].map((png) => sharp(png).ensureAlpha().raw().toBuffer()));
  assert.ok(a.equals(b), "the 32 px image is the site's favicon.svg");
});
