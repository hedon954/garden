import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";

// Real elapsed time, not Chrome virtual time: an isolated iframe runs in a
// separate lifecycle/process and need not finish before --dump-dom exits.
export async function probeBrowser({ chrome, url, profileDir, width, height, screenshot, timeoutMs = 30_000 }) {
  const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu",
    "--disable-dev-shm-usage", "--no-first-run", "--disable-background-networking",
    "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  let ws;
  browser.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-16_000); });
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Chrome startup timed out: ${stderr}`)), 15_000);
      const onData = () => {
        const found = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (found) { clearTimeout(timer); browser.stderr.off("data", onData); resolve(found[1]); }
      };
      browser.stderr.on("data", onData);
      browser.once("error", error => { clearTimeout(timer); reject(error); });
      browser.once("exit", code => { clearTimeout(timer); reject(new Error(`Chrome exited ${code}: ${stderr}`)); });
      onData();
    });
    ws = new WebSocket(endpoint);
    await once(ws, "open");
    let id = 0;
    const pending = new Map();
    const exceptions = [];
    const logs = [];
    ws.addEventListener("message", event => {
      const message = JSON.parse(String(event.data));
      if (message.method === "Log.entryAdded") logs.push(message.params.entry);
      if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails);
      const call = pending.get(message.id);
      if (!call) return;
      pending.delete(message.id);
      clearTimeout(call.timer);
      if (message.error) call.reject(new Error(JSON.stringify(message.error)));
      else call.resolve(message.result);
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const callId = ++id;
      const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`CDP timed out: ${method}`)); }, timeoutMs);
      pending.set(callId, { resolve, reject, timer });
      ws.send(JSON.stringify({ id: callId, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    await page("Page.enable");
    await page("Runtime.enable");
    await page("Log.enable");
    await page("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await page("Page.navigate", { url });
    const deadline = Date.now() + timeoutMs;
    let value;
    while (Date.now() < deadline) {
      const evaluated = await page("Runtime.evaluate", { expression: "window.__gardenProbeResult", returnByValue: true });
      value = evaluated.result?.value;
      if (value) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(value, `Browser readiness timed out (${url}): ${JSON.stringify(exceptions)}; ${stderr}`);
    assert.equal(value.probeError, undefined, JSON.stringify({ value, logs }));
    assert.deepEqual(exceptions, [], "Uncaught browser exceptions");
    if (screenshot) {
      const { data } = await page("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(screenshot, Buffer.from(data, "base64"));
    }
    return value;
  } finally {
    ws?.close();
    if (browser.exitCode === null && browser.signalCode === null) {
      const exited = once(browser, "exit");
      browser.kill("SIGKILL");
      await exited;
    }
  }
}

// Shared by the two real browser fixtures. Every failure names the actual
// condition that failed; the deadline never stands in for successful output.
export const waitForBrowserCondition = `async function waitFor(predicate, label) {
  const deadline = Date.now() + 20000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Readiness timed out: ' + label);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}`;
