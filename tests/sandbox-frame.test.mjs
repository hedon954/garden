import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { acceptSandboxSizeMessage } from "../app/components/garden/sandbox-message.ts";

const fid = "ux1";
const frame = { name: "frame" };
const other = { name: "other" };

test("SandboxFrame accepts a size only when the source window and fid both match", () => {
  assert.equal(acceptSandboxSizeMessage({ type: "ux:size", fid, height: 320 }, fid, frame, frame), true);
  assert.equal(acceptSandboxSizeMessage({ type: "garden:resize", fid, height: 320 }, fid, frame, frame), true);
  assert.equal(acceptSandboxSizeMessage({ type: "ux:size", fid, height: 320 }, fid, other, frame), false);
  assert.equal(acceptSandboxSizeMessage({ type: "ux:size", fid: "ux2", height: 320 }, fid, frame, frame), false);
  assert.equal(acceptSandboxSizeMessage({ type: "garden:resize", height: 320 }, fid, frame, frame), false);
  assert.equal(acceptSandboxSizeMessage({ type: "ux:size", fid, height: 320 }, fid, null, null), false);
  assert.equal(acceptSandboxSizeMessage({ type: "ux:ack", fid }, fid, frame, frame), false);
  assert.equal(acceptSandboxSizeMessage(null, fid, frame, frame), false);
});

test("SandboxFrame wires the combined source and fid check", async () => {
  const source = await readFile(new URL("../app/components/garden/chrome.tsx", import.meta.url), "utf8");
  assert.match(source, /acceptSandboxSizeMessage\(data, fid, event\.source, frame\.contentWindow\)/);
  assert.doesNotMatch(source, /data\.fid !== fid && event\.source !== frame\.contentWindow/);
});
