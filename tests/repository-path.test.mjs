import assert from "node:assert/strict";
import test from "node:test";
import { repositoryPostPath } from "../app/lib/repository-path.mjs";

test("maps content-relative post paths to repository-root paths", () => {
  assert.equal(repositoryPostPath("posts/hello.md"), "content/posts/hello.md");
  assert.equal(repositoryPostPath("posts/go/runtime/gc.md"), "content/posts/go/runtime/gc.md");
  assert.equal(repositoryPostPath("content/posts/legacy.md"), "content/posts/legacy.md");
});

test("rejects post paths that can leave the content/posts boundary", () => {
  for (const sourcePath of [
    "thoughts/hello.md",
    "posts/../README.md",
    "posts/%2e%2e/README.md",
    "posts/nested%2Fescape.md",
    "posts\\windows.md",
    "posts/not-markdown.txt",
    "content/posts//empty-segment.md",
  ]) {
    assert.throws(
      () => repositoryPostPath(sourcePath),
      /博文路径不合法，无法修改置顶状态。/u,
      sourcePath,
    );
  }
});
