import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const alive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; }
};
const read = (file) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
};
const ps = (pid, field) => execFileSync("ps", ["-p", String(pid), "-o", `${field}=`], { encoding: "utf8", env: { ...process.env, LC_ALL: "C" } }).trim();
function identity(pid, executable) {
  if (process.platform !== "linux" && process.platform !== "darwin") throw new Error("Automatic dev replacement requires Linux or macOS process inspection.");
  if (Number(ps(pid, "uid")) !== process.getuid()) throw new Error("Dev process belongs to another user; nothing was stopped.");
  const start = Date.parse(ps(pid, "lstart"));
  let cwd;
  let matches;
  if (process.platform === "linux") {
    cwd = fs.realpathSync(`/proc/${pid}/cwd`);
    const args = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
    matches = args[1] === executable && args[2] === "dev";
  } else {
    const entries = execFileSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], { encoding: "utf8" });
    cwd = fs.realpathSync(entries.split("\n").find((line) => line.startsWith("n"))?.slice(1) ?? "");
    const command = ps(pid, "command");
    // Exact script path and subcommand, not a substring such as `node -e ...`.
    const node = ps(pid, "comm");
    matches = command.startsWith(`${node} ${executable} dev`) && /^(?:\s|$)/u.test(command.slice(`${node} ${executable} dev`.length));
  }
  if (!matches || !Number.isFinite(start)) throw new Error(`PID ${pid} is not the expected Vinext dev process.`);
  return { cwd, start };
}
async function portFree(lock) {
  if (!Number.isInteger(lock.port) || lock.port < 1 || lock.port > 65535) return true;
  // Only probe loopback; never connect to a target supplied by lock metadata.
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: lock.port });
    socket.setTimeout(200);
    socket.once("connect", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
  });
}

/** Serialize same-runtime replacement/startup. Never infer ownership from a port. */
export async function startDev({ cwd, executable, args = [], env = process.env, prepare = async () => {}, timeoutMs = 15000, stdio = "inherit" }) {
  cwd = fs.realpathSync(cwd);
  executable = fs.realpathSync(executable);
  const guard = path.join(cwd, ".garden-dev-start");
  const lockPath = path.join(cwd, ".vinext/dev/lock.json");
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      fs.mkdirSync(guard);
      fs.writeFileSync(path.join(guard, "owner.json"), JSON.stringify({ pid: process.pid }));
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const owner = read(path.join(guard, "owner.json"));
      if (owner && !alive(owner.pid)) throw new Error(`Interrupted Garden startup guard at ${guard}; no process was stopped. Remove this guard only after confirming no startup is in progress.`);
      if (Date.now() >= deadline) throw new Error("Another Garden dev start is in progress; ownership could not be safely resolved.");
      await delay(100);
    }
  }
  let child;
  try {
    const lock = read(lockPath);
    if (lock && alive(lock.pid)) {
      if (lock.pid === process.pid) throw new Error("Refusing to replace this process.");
      const previous = identity(lock.pid, executable);
      if (previous.cwd !== cwd || fs.realpathSync(lock.cwd) !== cwd || !Number.isFinite(lock.startedAt) || previous.start > lock.startedAt + 1000 || lock.startedAt - previous.start > 120000) {
        throw new Error("Dev lock ownership is unproven (runtime or process start time mismatch); nothing was stopped.");
      }
      // Recheck identity immediately before signalling to reduce PID-reuse races.
      const current = identity(lock.pid, executable);
      if (current.start !== previous.start || current.cwd !== cwd || read(lockPath)?.startedAt !== lock.startedAt) throw new Error("Dev owner changed during replacement; nothing was stopped.");
      process.kill(lock.pid, "SIGTERM");
      while (alive(lock.pid) || !(await portFree(lock))) {
        if (Date.now() >= deadline) throw new Error("Previous dev server did not release its process/port in time; no force-kill attempted.");
        await delay(100);
      }
      const remaining = read(lockPath);
      if (remaining && remaining.pid !== lock.pid) throw new Error("Dev lock changed during shutdown; refusing to replace another owner.");
    }
    // Vinext itself takes over dead-PID locks. Do not unlink someone else's lock.
    await prepare();
    child = spawn(process.execPath, [executable, "dev", ...args], { cwd, env, stdio });
    const exited = new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => resolve({ status: code, signal })); });
    const forward = (signal) => { if (child.exitCode === null && child.signalCode === null) child.kill(signal); };
    const interrupt = () => forward("SIGINT");
    const terminate = () => forward("SIGTERM");
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    const finished = exited.finally(() => { process.off("SIGINT", interrupt); process.off("SIGTERM", terminate); });
    // The guard only covers startup, not the server's whole lifetime.
    const startupDeadline = Date.now() + timeoutMs;
    while (child.exitCode === null && child.signalCode === null) {
      if (read(lockPath)?.pid === child.pid) break;
      if (Date.now() >= startupDeadline) {
        child.kill("SIGTERM");
        await Promise.race([finished, delay(1000)]);
        throw new Error("Dev server did not establish its runtime lock in time; graceful stop requested (no force kill).");
      }
      await delay(100);
    }
    return { child, finished };
  } finally {
    fs.rmSync(guard, { recursive: true });
  }
}
