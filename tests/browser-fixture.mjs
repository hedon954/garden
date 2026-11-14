import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";

const DEVTOOLS = /DevTools listening on (ws:\/\/[^\s]+)/;

async function killChrome(browser) {
  if (browser.exitCode === null && browser.signalCode === null) {
    const exited = once(browser, "exit");
    browser.kill("SIGKILL");
    await exited;
  }
}

async function startChrome(chrome, profileDir) {
  const env = { ...process.env };
  delete env.DBUS_SESSION_BUS_ADDRESS;
  let last;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const browser = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu",
      "--disable-dev-shm-usage", "--no-first-run", "--disable-background-networking",
      "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "about:blank"],
      { stdio: ["ignore", "ignore", "pipe"], env });
    let stderr = "";
    let endpoint = "";
    const onData = chunk => {
      const text = String(chunk);
      stderr = (stderr + text).slice(-16_000);
      endpoint ||= text.match(DEVTOOLS)?.[1] || stderr.match(DEVTOOLS)?.[1] || "";
    };
    browser.stderr.on("data", onData);
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Chrome startup timed out: ${stderr}`)), 45_000);
        const check = () => { if (endpoint) { clearTimeout(timer); resolve(); } };
        browser.stderr.on("data", check);
        browser.once("error", error => { clearTimeout(timer); reject(error); });
        browser.once("exit", code => { clearTimeout(timer); reject(new Error(`Chrome exited ${code}: ${stderr}`)); });
        check();
      });
      return { browser, endpoint, stderr };
    } catch (error) {
      last = error;
      browser.stderr.off("data", onData);
      await killChrome(browser);
      if (!String(error.message).startsWith("Chrome startup timed out") || attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw last;
}

// Real elapsed time, not Chrome virtual time: an isolated iframe runs in a
// separate lifecycle/process and need not finish before --dump-dom exits.
export async function probeBrowser({ chrome, url, profileDir, width, height, screenshot, initScript, includeDiagnostics = false, scriptingEnabled = true, mobile = false, safeAreaInsets, reducedMotion = false, cpuThrottlingRate, probeExpression = "window.__gardenProbeResult", timeoutMs = 30_000 }) {
  const { browser, endpoint, stderr } = await startChrome(chrome, profileDir);
  let ws;
  try {
    ws = new WebSocket(endpoint);
    await once(ws, "open");
    let id = 0;
    const pending = new Map();
    const exceptions = [];
    const logs = [];
    const frameEvents = [];
    ws.addEventListener("message", event => {
      const message = JSON.parse(String(event.data));
      if (includeDiagnostics && /^Page\.frame|^Network\.loadingFailed/u.test(message.method ?? "")) frameEvents.push({method:message.method,...message.params});
      if (message.method === "Log.entryAdded") logs.push(message.params.entry);
      if (includeDiagnostics && message.method === "Runtime.consoleAPICalled") logs.push({ source: "console-api", level: message.params.type, text: message.params.args.map(arg => arg.value ?? arg.description ?? "").join(" ") });
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
    if (!scriptingEnabled) await page("Emulation.setScriptExecutionDisabled", { value: true });
    await page("Log.enable");
    if (includeDiagnostics) await page("Network.enable");
    await page("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    if (reducedMotion) await page("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    if (safeAreaInsets) await page("Emulation.setSafeAreaInsetsOverride", { insets: safeAreaInsets });
    if (cpuThrottlingRate) await page("Emulation.setCPUThrottlingRate", { rate: cpuThrottlingRate });
    if (initScript) await page("Page.addScriptToEvaluateOnNewDocument", { source: initScript });
    await page("Page.navigate", { url });
    const deadline = Date.now() + timeoutMs;
    let value;
    while (Date.now() < deadline) {
      const evaluated = await page("Runtime.evaluate", { expression: probeExpression, returnByValue: true });
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
    if (includeDiagnostics) value.browserDiagnostics = {logs,frameEvents,frameTree:await page("Page.getFrameTree")};
    return value;
  } finally {
    ws?.close();
    await killChrome(browser);
  }
}

/** Chrome on Linux can still write into user-data-dir after SIGKILL; Node then throws ENOTEMPTY. */
export async function removeFixtureDir(dir) {
  if (process.env.GARDEN_KEEP_BROWSER_FIXTURE === "1") return;
  let last;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      last = error;
      if (!["ENOTEMPTY", "EBUSY", "EPERM"].includes(error.code)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
  throw last;
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
