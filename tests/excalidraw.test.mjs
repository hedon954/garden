import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ensureExcalidrawSvg,
  ExcalidrawExportError,
  isExcalidrawPath,
  siblingSvgPath,
  sourceHash,
} from "../scripts/excalidraw.mjs";

const projectRoot = path.resolve(new URL("../", import.meta.url).pathname);
const fixture = path.join(projectRoot, "tests", "fixtures", "excalidraw-note.excalidraw");

function tempDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}

function writeFlat(file, label) {
  fs.writeFileSync(
    file,
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><text>${label}</text></svg>`,
  );
}

test("sibling SVG names drop only the .excalidraw suffix", () => {
  assert.equal(siblingSvgPath("posts/flow.excalidraw"), "posts/flow.svg");
  assert.equal(siblingSvgPath("posts/my.flow.EXCALIDRAW"), "posts/my.flow.svg");
  assert.equal(isExcalidrawPath("./assets/flow.excalidraw?v=1"), true);
  assert.equal(isExcalidrawPath("./assets/flow.excalidraw.svg"), false);
  assert.equal(isExcalidrawPath("./assets/flow.svg"), false);
});

test("a stale sibling SVG is deleted before it is regenerated", () => {
  const dir = tempDir("excal-stale-");
  try {
    const source = path.join(dir, "box.excalidraw");
    const svg = siblingSvgPath(source);
    fs.writeFileSync(source, "{\"type\":\"excalidraw\"}\n");
    fs.writeFileSync(svg, `<svg xmlns="http://www.w3.org/2000/svg"><text>STALE</text></svg>`);
    let sawMissing = false;
    ensureExcalidrawSvg(source, {
      render(_input, output) {
        sawMissing = !fs.existsSync(output);
        writeFlat(output, "NEW");
      },
    });
    assert.equal(sawMissing, true);
    const text = fs.readFileSync(svg, "utf8");
    assert.match(text, />NEW</u);
    assert.doesNotMatch(text, /STALE/u);
    assert.match(text, new RegExp(`garden-excalidraw-source:${sourceHash(fs.readFileSync(source))}`, "u"));
    let called = false;
    ensureExcalidrawSvg(source, {
      render() {
        called = true;
      },
    });
    assert.equal(called, false);
    assert.equal(fs.readFileSync(svg, "utf8"), text);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("an embedded scene with a matching stamp is still replaced", () => {
  const dir = tempDir("excal-embed-");
  try {
    const source = path.join(dir, "box.excalidraw");
    const svg = siblingSvgPath(source);
    const bytes = Buffer.from("{\"type\":\"excalidraw\",\"elements\":[]}\n");
    fs.writeFileSync(source, bytes);
    const hash = sourceHash(bytes);
    fs.writeFileSync(
      svg,
      `<!-- garden-excalidraw-source:${hash} --><svg xmlns="http://www.w3.org/2000/svg"><metadata><!-- payload-start -->abc</metadata></svg>`,
    );
    ensureExcalidrawSvg(source, {
      render(_input, output) {
        writeFlat(output, "FLAT");
      },
    });
    const text = fs.readFileSync(svg, "utf8");
    assert.match(text, />FLAT</u);
    assert.doesNotMatch(text, /payload-start/u);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a failed export removes the sibling SVG and records the source path", () => {
  const dir = tempDir("excal-fail-");
  try {
    const source = path.join(dir, "box.excalidraw");
    const svg = siblingSvgPath(source);
    fs.writeFileSync(source, "{}\n");
    fs.writeFileSync(svg, `<svg xmlns="http://www.w3.org/2000/svg"><text>STALE</text></svg>`);
    assert.throws(
      () => ensureExcalidrawSvg(source, {
        render() {
          throw new Error("renderer exploded");
        },
      }),
      (error) => {
        assert.ok(error instanceof ExcalidrawExportError);
        assert.equal(error.code, "export-failed");
        assert.equal(error.file, source);
        return true;
      },
    );
    assert.equal(fs.existsSync(svg), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing source fails before any SVG is written", () => {
  const dir = tempDir("excal-missing-");
  try {
    const source = path.join(dir, "gone.excalidraw");
    assert.throws(
      () => ensureExcalidrawSvg(source, {
        render() {
          throw new Error("should not render");
        },
      }),
      (error) => {
        assert.ok(error instanceof ExcalidrawExportError);
        assert.equal(error.code, "missing-source");
        assert.equal(error.file, source);
        return true;
      },
    );
    assert.equal(fs.existsSync(siblingSvgPath(source)), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("offline mode does not download a missing exporter", () => {
  const dir = tempDir("excal-offline-");
  const home = tempDir("excal-home-");
  try {
    const source = path.join(dir, "box.excalidraw");
    fs.writeFileSync(source, "{}\n");
    assert.throws(
      () => ensureExcalidrawSvg(source, { env: { GARDEN_OFFLINE: "1" }, homedir: home }),
      (error) => {
        assert.ok(error instanceof ExcalidrawExportError);
        assert.equal(error.code, "offline");
        return true;
      },
    );
    assert.equal(fs.existsSync(siblingSvgPath(source)), false);
    assert.equal(fs.readdirSync(home).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("a fixture .excalidraw exports a flat SVG with the label and inlined fonts", { timeout: 180_000 }, () => {
  const dir = tempDir("excal-smoke-");
  try {
    const source = path.join(dir, "note.excalidraw");
    fs.copyFileSync(fixture, source);
    const svg = ensureExcalidrawSvg(source);
    const text = fs.readFileSync(svg, "utf8");
    assert.match(text, /<svg[\s>]/u);
    assert.match(text, /园子/u);
    assert.match(text, /data:font\/woff2/u);
    assert.doesNotMatch(text, /payload-start/u);
    assert.doesNotMatch(text, /application\/vnd\.excalidraw\+json/u);
    assert.doesNotMatch(text, /excalidraw\.com|unpkg\.com|jsdelivr\.net|fonts\.googleapis\.com/u);
    assert.match(text, new RegExp(`garden-excalidraw-source:${sourceHash(fs.readFileSync(source))}`, "u"));
    const again = fs.readFileSync(svg, "utf8");
    ensureExcalidrawSvg(source);
    assert.equal(fs.readFileSync(svg, "utf8"), again);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("article code does not import the Excalidraw editor", () => {
  const app = path.join(projectRoot, "app");
  const files = [];
  const stack = [app];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(?:tsx?|jsx?|mjs)$/u.test(entry.name)) files.push(full);
    }
  }
  assert.ok(files.length > 10);
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /@excalidraw\/excalidraw/u, file);
  }
});
