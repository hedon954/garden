import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawn } from "node:child_process";
import { startDev } from "../scripts/dev-server.mjs";

test("same-runtime replacement exits old server and serves HTTP from new PID", async (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "garden-dev-replace-"));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const executable = path.join(cwd, "vinext.mjs");
  fs.writeFileSync(executable, `import fs from 'node:fs'; import http from 'node:http';
const p='.vinext/dev/lock.json';fs.mkdirSync('.vinext/dev',{recursive:true});
const s=http.createServer((q,r)=>r.end(String(process.pid)+':'+process.env.CONTENT_INCLUDE_DRAFTS));
s.listen(0,'127.0.0.1',()=>fs.writeFileSync(p,JSON.stringify({pid:process.pid,cwd:process.cwd(),startedAt:Date.now(),port:s.address().port})));
process.on('SIGTERM',()=>s.close(()=>{if(JSON.parse(fs.readFileSync(p)).pid===process.pid)fs.unlinkSync(p);process.exit(0)}));`);
  const env = { ...process.env, CONTENT_INCLUDE_DRAFTS: "1" };
  const first = await startDev({ cwd, executable, env, stdio: "ignore" });
  t.after(() => first.child.kill());
  const oldPid = first.child.pid;
  const second = await startDev({ cwd, executable, env, stdio: "ignore" });
  t.after(() => second.child.kill());
  await first.finished;
  assert.notEqual(second.child.pid, oldPid);
  const lock = JSON.parse(fs.readFileSync(path.join(cwd, ".vinext/dev/lock.json")));
  assert.equal(await (await fetch(`http://127.0.0.1:${lock.port}`)).text(), `${second.child.pid}:1`);
  const lockFile = path.join(cwd, ".vinext/dev/lock.json");
  fs.writeFileSync(lockFile, JSON.stringify({ ...lock, startedAt: 1 }));
  await assert.rejects(startDev({ cwd, executable, env, stdio: "ignore" }), /ownership is unproven/);
  assert.equal(second.child.exitCode, null);
  fs.writeFileSync(lockFile, JSON.stringify({ ...lock, cwd: os.tmpdir() }));
  await assert.rejects(startDev({ cwd, executable, env, stdio: "ignore" }), /ownership is unproven/);
  assert.equal(second.child.exitCode, null);
  fs.writeFileSync(lockFile, JSON.stringify(lock));
  second.child.kill("SIGTERM");
  await second.finished;
  // Dead PID lock is safe: Vinext's own stale-lock takeover handles it.
  fs.writeFileSync(path.join(cwd, ".vinext/dev/lock.json"), JSON.stringify({ ...lock, pid: oldPid }));
  const third = await startDev({ cwd, executable, env, stdio: "ignore" });
  third.child.kill("SIGTERM");
  await third.finished;
  const [fourth, fifth] = await Promise.all([
    startDev({ cwd, executable, env, stdio: "ignore" }),
    startDev({ cwd, executable, env, stdio: "ignore" }),
  ]);
  await fourth.finished;
  assert.equal(fifth.child.exitCode, null);
  fifth.child.kill("SIGTERM");
  await fifth.finished;
});

test("unrelated live PID cannot be killed through a fabricated dev lock", async (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "garden-dev-unrelated-"));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  fs.mkdirSync(path.join(cwd, ".vinext/dev"), { recursive: true });
  fs.writeFileSync(path.join(cwd, ".vinext/dev/lock.json"), JSON.stringify({ pid: process.pid, cwd, startedAt: Date.now(), port: 1 }));
  await assert.rejects(startDev({ cwd, executable: process.execPath, stdio: "ignore" }), /Refusing to replace this process/);
  const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { cwd, stdio: "ignore" });
  t.after(() => unrelated.kill("SIGTERM"));
  fs.writeFileSync(path.join(cwd, ".vinext/dev/lock.json"), JSON.stringify({ pid: unrelated.pid, cwd, startedAt: Date.now(), port: 1 }));
  await assert.rejects(startDev({ cwd, executable: process.execPath, stdio: "ignore" }), /not the expected Vinext dev process/);
  assert.equal(unrelated.exitCode, null);
});
