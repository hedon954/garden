import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  preparePagesOutput,
  validateStaticOutput,
} from "../scripts/prepare-pages-output.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "garden-pages-"));
  const source = path.join(root, "site");
  const destination = path.join(root, "repository");
  await mkdir(path.join(source, "assets"), { recursive: true });
  await mkdir(path.join(destination, ".git"), { recursive: true });
  await writeFile(path.join(source, "index.html"), "<!doctype html><title>Garden</title>");
  await writeFile(path.join(source, ".assetsignore"), "");
  await writeFile(path.join(source, "CNAME"), "blog.example.com\n");
  await writeFile(path.join(source, "assets", "app.js"), "console.log('garden')\n");
  await writeFile(path.join(destination, "stale.html"), "stale");
  return { root, source, destination };
}

test("prepares a generated-only Pages tree and preserves the Git checkout", async () => {
  const { source, destination } = await fixture();
  await preparePagesOutput(source, destination);

  assert.equal(await readFile(path.join(destination, "CNAME"), "utf8"), "blog.example.com\n");
  assert.equal(await readFile(path.join(destination, ".assetsignore"), "utf8"), "");
  assert.equal(await readFile(path.join(destination, ".nojekyll"), "utf8"), "");
  assert.match(await readFile(path.join(destination, "README.md"), "utf8"), /自动生成/);
  await access(path.join(destination, ".git"));
  await assert.rejects(access(path.join(destination, "stale.html")));
});

test("rejects source files and symbolic links in Pages output", async () => {
  const sourceFixture = await fixture();
  await writeFile(path.join(sourceFixture.source, "source.ts"), "export {}\n");
  await assert.rejects(validateStaticOutput(sourceFixture.source), /source\.ts/);

  const configFixture = await fixture();
  await writeFile(path.join(configFixture.source, "site.config.yaml"), "name: leaked\n");
  await assert.rejects(validateStaticOutput(configFixture.source), /site\.config\.yaml/);

  const sourceDirectoryFixture = await fixture();
  await mkdir(path.join(sourceDirectoryFixture.source, "app"));
  await assert.rejects(validateStaticOutput(sourceDirectoryFixture.source), /app/);

  const linkFixture = await fixture();
  await symlink(path.join(linkFixture.source, "index.html"), path.join(linkFixture.source, "linked.html"));
  await assert.rejects(validateStaticOutput(linkFixture.source), /linked\.html/);
});

test("refuses to clean a destination without Git metadata", async () => {
  const { root, source } = await fixture();
  const unsafeDestination = path.join(root, "not-a-repository");
  await mkdir(unsafeDestination);
  await assert.rejects(
    preparePagesOutput(source, unsafeDestination),
    /目标不是 Git 仓库/,
  );
});

test("normalizes Vinext deployment IDs so unchanged output has the same tree", async () => {
  const first = await fixture();
  const second = await fixture();
  await writeFile(
    path.join(first.source, "index.html"),
    '<script>{"deploymentVersion":"11111111-1111-4111-8111-111111111111"}</script>',
  );
  await writeFile(
    path.join(second.source, "index.html"),
    '<script>{"deploymentVersion":"22222222-2222-4222-8222-222222222222"}</script>',
  );

  await preparePagesOutput(first.source, first.destination);
  await preparePagesOutput(second.source, second.destination);

  const firstOutput = await readFile(path.join(first.destination, "index.html"), "utf8");
  const secondOutput = await readFile(path.join(second.destination, "index.html"), "utf8");
  assert.equal(firstOutput, secondOutput);
  assert.doesNotMatch(firstOutput, /11111111|22222222/);
});
