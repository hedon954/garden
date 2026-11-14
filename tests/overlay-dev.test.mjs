import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const engine = fileURLToPath(new URL("../", import.meta.url));
const gardenBin = path.join(engine, "bin", "garden.mjs");

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("no port"));
        return;
      }
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function writePreviewSite() {
  const site = mkdtempSync(path.join(tmpdir(), "garden-overlay-dev-"));
  fs.mkdirSync(path.join(site, "content", "posts"), { recursive: true });
  fs.copyFileSync(path.join(engine, "templates", "site", "site.config.yaml"), path.join(site, "site.config.yaml"));
  fs.writeFileSync(
    path.join(site, "content", "posts", "hello.md"),
    [
      "---",
      "title: Overlay Hello",
      "date: 2026-11-14 15:00:00",
      "description: Overlay contract post.",
      "---",
      "",
      "Hello from the overlay preview.",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(path.join(site, "content", "columns.yaml"), "columns: []\n");
  return site;
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = "unreached";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      last = String(response.status);
      const text = await response.text();
      if (response.status === 200 || response.status === 500) return { status: response.status, text };
    } catch (error) {
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`timeout waiting for ${url} (${last})`);
}

function installPackedEngine(site) {
  const packDir = mkdtempSync(path.join(tmpdir(), "garden-pack-overlay-"));
  try {
    const packed = execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", packDir], {
      cwd: engine,
      encoding: "utf8",
    });
    const [{ filename }] = JSON.parse(packed);
    const modules = path.join(site, "node_modules");
    fs.mkdirSync(modules, { recursive: true });
    execFileSync("tar", ["-xzf", path.join(packDir, filename), "-C", modules]);
    fs.renameSync(path.join(modules, "package"), path.join(modules, "hd-garden"));
    for (const name of fs.readdirSync(path.join(engine, "node_modules"))) {
      if (name === ".bin" || name === "hd-garden") continue;
      const from = path.join(engine, "node_modules", name);
      const to = path.join(modules, name);
      if (!fs.existsSync(to)) fs.symlinkSync(from, to);
    }
    const bin = path.join(modules, ".bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.symlinkSync(path.join("..", "hd-garden", "bin", "garden.mjs"), path.join(bin, "garden"));
    return path.join(modules, "hd-garden", "bin", "garden.mjs");
  } finally {
    rmSync(packDir, { recursive: true, force: true });
  }
}

async function preview(site, extraArgs, bin = gardenBin) {
  const port = await freePort();
  const logs = [];
  const child = spawn(process.execPath, [bin, "dev", ...extraArgs, "--port", String(port), "--host", "127.0.0.1"], {
    cwd: site,
    env: {
      ...process.env,
      GARDEN_SITE: site,
      GARDEN_OFFLINE: "1",
      CONTENT_INCLUDE_DRAFTS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const onLog = (chunk) => logs.push(String(chunk));
  child.stdout.on("data", onLog);
  child.stderr.on("data", onLog);
  const finished = new Promise((resolve) => child.once("exit", resolve));
  try {
    const home = await waitFor(`http://127.0.0.1:${port}/`, 90000);
    const post = await waitFor(`http://127.0.0.1:${port}/blog/hello`, 30000);
    const handbook = await waitFor(`http://127.0.0.1:${port}/garden`, 30000);
    return { home, post, handbook, logs: logs.join("") };
  } finally {
    child.kill("SIGTERM");
    await Promise.race([finished, new Promise((resolve) => setTimeout(resolve, 3000))]);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
}

test("home page source does not import article bodies", () => {
  const page = fs.readFileSync(path.join(engine, "app", "page.tsx"), "utf8");
  assert.doesNotMatch(page, /content-body|generated-post-bodies|generated-handbook-bodies/u);
});

test("file: overlay garden dev --worker serves home and a post without Denied ID", { timeout: 120000 }, async () => {
  const site = writePreviewSite();
  try {
    const { home, post, handbook, logs } = await preview(site, ["--worker"]);
    assert.equal(home.status, 200, logs);
    assert.match(home.text, /data-feature-title|Overlay home|Overlay Hello/u);
    assert.equal(post.status, 200, logs);
    assert.match(post.text, /Overlay Hello/u);
    assert.equal(handbook.status, 200, logs);
    assert.doesNotMatch(logs, /ERR_DENIED_ID|Denied ID/u);
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

test("file: overlay garden dev Node preview serves home and a post", { timeout: 120000 }, async () => {
  const site = writePreviewSite();
  try {
    const { home, post, handbook, logs } = await preview(site, []);
    assert.equal(home.status, 200, logs);
    assert.match(home.text, /data-feature-title|Overlay home|Overlay Hello/u);
    assert.equal(post.status, 200, logs);
    assert.match(post.text, /Overlay Hello/u);
    assert.equal(handbook.status, 200, logs);
    assert.doesNotMatch(logs, /ERR_DENIED_ID|Denied ID/u);
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

test("npm pack overlay garden dev Node preview serves home, a post, and the handbook", { timeout: 180000 }, async () => {
  const site = writePreviewSite();
  try {
    const packedBin = installPackedEngine(site);
    const { home, post, handbook, logs } = await preview(site, [], packedBin);
    assert.ok(fs.existsSync(path.join(site, ".garden", "generated-post-bodies.ts")), logs);
    assert.ok(fs.existsSync(path.join(site, ".garden", "generated-handbook-bodies.ts")), logs);
    assert.equal(
      fs.realpathSync(path.join(site, ".garden", "runtime", "ui")),
      fs.realpathSync(path.join(site, "node_modules", "hd-garden", "ui")),
    );
    assert.equal(home.status, 200, logs);
    assert.match(home.text, /data-feature-title|Overlay home|Overlay Hello/u);
    assert.equal(post.status, 200, logs);
    assert.match(post.text, /Overlay Hello/u);
    assert.equal(handbook.status, 200, logs);
    assert.doesNotMatch(logs, /ERR_DENIED_ID|Denied ID|Cannot find module '@garden\/generated-/u);
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});
