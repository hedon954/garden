import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const cli = fs.readFileSync(new URL("../bin/garden.mjs", import.meta.url), "utf8");
// Exercise the real command-dispatch branch without starting OAuth or a server.
const devBranch = cli.match(/case "dev":([\s\S]*?)\n\s*break;/u)?.[1];

test("garden dev defaults to drafts before initial sync and server spawn, preserving opt-out", async () => {
  assert.ok(devBranch);
  for (const explicit of [undefined, "0", "1"]) {
    const env = explicit === undefined ? {} : { CONTENT_INCLUDE_DRAFTS: explicit };
    const observed = [];
    const context = vm.createContext({
      process: { env },
      rest: ["--port", "4321"],
      ensureDevGitHubLogin() { observed.push(env.CONTENT_INCLUDE_DRAFTS); },
      async runVinext(args) {
        observed.push(env.CONTENT_INCLUDE_DRAFTS);
        assert.deepEqual(Array.from(args), ["dev", "--port", "4321"]);
      },
    });
    await vm.runInContext(`(async () => { ${devBranch} })()`, context);
    assert.deepEqual(observed, [explicit ?? "1", explicit ?? "1"]);
  }
});

test("dev default is process-local and sync precedes Vinext with inherited env", () => {
  assert.equal((cli.match(/process\.env\.CONTENT_INCLUDE_DRAFTS \?\?= "1"/gu) ?? []).length, 1);
  const runner = cli.slice(cli.indexOf("async function runVinext("), cli.indexOf("async function runVinext(") + 650);
  assert.ok(runner.indexOf("sync({ refreshLinks: true })") < runner.indexOf("spawnSync("));
  assert.match(runner, /env: siteEnv\(\)/u);
  const watcher = fs.readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(watcher, /env: \{ \.\.\.process\.env, GARDEN_SITE: siteRoot/u);
  assert.match(watcher, /sync\("preview", \{ refreshLinks: true, files \}\)/u);
  assert.match(watcher, /"scripts", "link-assets\.mjs"/u);
  assert.match(watcher, /\}, 800\);/u);
});

test("initial and watched link refresh failures warn without exiting before content sync", () => {
  const initial = cli.slice(cli.indexOf("async function sync("), cli.indexOf("async function runVinext("));
  const watcher = fs.readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  for (const source of [initial, watcher]) {
    assert.match(source, /if \(links.status !== 0\) console.warn\("链接资源：刷新失败，沿用可用缓存"\)/u);
    assert.doesNotMatch(source, /runNode\("scripts\/link-assets.mjs"\)/u);
  }
});
