import assert from "node:assert/strict";
import test from "node:test";
import { repositoryContentPath } from "../app/lib/repository-path.mjs";
import { resolveSidecarPath } from "../ui/core/fence.mjs";

test("admin reads only Markdown under content/posts or content/thoughts", () => {
  assert.equal(repositoryContentPath("posts/llm/kv.md"), "content/posts/llm/kv.md");
  assert.equal(repositoryContentPath("/content/thoughts/2026/a.md"), "content/thoughts/2026/a.md");
  for (const value of [
    "content/posts/../../.env.md",
    "posts/%2e%2e/secret.md",
    "posts/a%2fb.md",
    "posts/a\\b.md",
    "content/drafts/a.md",
    "content/posts/a.txt",
    "content/posts.md",
    "",
  ]) {
    assert.throws(() => repositoryContentPath(value), Error, value);
  }
});

test("resolves files inside the post's same-name directory", () => {
  assert.deepEqual(resolveSidecarPath("posts/llm/kv.md", "./kv/bench.csv"), { path: "posts/llm/kv/bench.csv" });
  assert.deepEqual(resolveSidecarPath("posts/llm/kv.md", "kv/img/a.png"), { path: "posts/llm/kv/img/a.png" });
  assert.deepEqual(resolveSidecarPath("content/posts/a.md", "./a/x.json"), { path: "content/posts/a/x.json" });
});

test("rejects anything outside that directory", () => {
  for (const relative of [
    "../kv/bench.csv",
    "./other/bench.csv",
    "./kv/../../secret.csv",
    "/etc/passwd",
    "https://example.com/a.csv",
    "file:///etc/passwd",
    "./kv",
    "./kv/",
    "",
  ]) {
    assert.ok(resolveSidecarPath("posts/llm/kv.md", relative).error, relative);
  }
  assert.ok(resolveSidecarPath("posts/llm/kv.txt", "./kv/a.csv").error);
});
