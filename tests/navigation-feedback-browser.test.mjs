import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { probeBrowser, removeFixtureDir, waitForBrowserCondition } from "./browser-fixture.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const docsClient = path.join(root, "dist", "docs-client");
const chrome = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/chromium",
].find((p) => p && fs.existsSync(p));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function startDelayedDocsServer(delayTutorialRscMs = 3800) {
  const server = http.createServer((req, res) => {
    const reqPath = new URL(req.url || "/", "http://127.0.0.1").pathname;
    if (!reqPath.startsWith("/garden")) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const rel = reqPath.slice("/garden".length).replace(/^\/+/u, "");
    let file = path.join(docsClient, rel);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    const send = () => fs.createReadStream(file).pipe(res);
    if (reqPath.endsWith("/guide/tutorial/index.txt") || reqPath.endsWith("/guide/tutorial.rsc")) {
      setTimeout(send, delayTutorialRscMs);
    } else {
      send();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

test(
  "slow navigation keeps immediate link feedback, shows progress bar and slow-network fallback, then completes",
  { skip: !chrome || !fs.existsSync(path.join(docsClient, "index.html")), timeout: 90_000 },
  async () => {
    const { server, baseUrl } = await startDelayedDocsServer(3800);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "garden-nav-fb-"));
    const shot = path.join(root, ".garden", "nav-feedback-mobile.png");
    try {
      const result = await probeBrowser({
        chrome,
        url: `${baseUrl}/garden/guide/ai-collaboration/`,
        profileDir: path.join(dir, "profile"),
        width: 375,
        height: 812,
        mobile: true,
        screenshot: shot,
        timeoutMs: 30_000,
        initScript: `${waitForBrowserCondition}
          addEventListener('load', async () => {
            try {
              await waitFor(() => {
                const btn = document.querySelector('.gdoc-mobile-trigger');
                return btn && Object.keys(btn).some((k) => k.startsWith('__reactProps'));
              }, 'mobile trigger hydrated');
              const trigger = document.querySelector('.gdoc-mobile-trigger');
              trigger.click();
              await waitFor(() => document.querySelector('.gdoc-sidebar')?.dataset.open === 'true', 'drawer open');

              const target = [...document.querySelectorAll('.gdoc-nav-list a')].find(a => a.textContent.includes('详细教程'));
              if (!target) throw new Error('missing target link');
              target.click();

              const immediatePending = target.getAttribute('data-nav-pending');
              const drawerStaysOpen = document.querySelector('.gdoc-sidebar')?.dataset.open;

              await waitFor(() => document.querySelector('.sh-nav-progress'), 'progress bar');
              await waitFor(() => document.getElementById('main-content')?.getAttribute('data-nav-pending') === 'true', 'main dimmed');
              await waitFor(() => document.querySelector('.sh-nav-toast'), 'slow network toast');

              const toastText = document.querySelector('.sh-nav-toast')?.textContent || '';
              const directBtn = [...document.querySelectorAll('.sh-nav-toast-btn')].map(b => b.textContent.trim());

              await waitFor(() => document.querySelector('h1')?.textContent?.includes('详细教程'), 'destination committed');
              await waitFor(() => document.querySelector('.gdoc-sidebar')?.dataset.open === 'false', 'drawer closed after commit');

              window.__gardenProbeResult = {
                immediatePending,
                drawerStaysOpen,
                toastText,
                directBtn,
                finalH1: document.querySelector('h1')?.textContent?.trim(),
                finalPending: target.getAttribute('data-nav-pending'),
              };
            } catch (err) {
              window.__gardenProbeResult = { probeError: err.stack || String(err) };
            }
          }, { once: true });`,
      });
      assert.equal(result.probeError, undefined, result.probeError);
      assert.equal(result.immediatePending, "true");
      assert.equal(result.drawerStaysOpen, "true");
      assert.match(result.toastText, /网络较慢/u);
      assert.deepEqual(result.directBtn, ["改用整页打开", "留在本页"]);
      assert.equal(result.finalH1, "详细教程");
      assert.equal(result.finalPending, null);
    } finally {
      server.close();
      await removeFixtureDir(dir);
    }
  },
);
