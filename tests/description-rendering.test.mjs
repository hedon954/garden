import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));

test("real reading view and archive omit an empty description paragraph; nonempty text remains", async (t) => {
  const folder = await fs.mkdtemp(path.join(root, ".garden/description-render-"));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const outfile = path.join(folder, "render.mjs");
  await build({
    stdin: { contents: `import {PostReadingView} from './app/components/PostReadingView';
import {BlogArchiveFallback} from './app/components/BlogArchive';
import {createElement} from 'react'; import {renderToStaticMarkup} from 'react-dom/server';
export const render = post => renderToStaticMarkup(createElement(PostReadingView, {post, pathname:'/blog/test',canonicalUrl:'https://example.com/blog/test',commentsSlug:'test'}));
export const archive = post => renderToStaticMarkup(createElement(BlogArchiveFallback, {posts:[post],series:[]}));`, resolveDir: root, loader: "tsx" },
    bundle: true, packages: "external", platform: "node", format: "esm", jsx: "automatic", outfile,
    alias: { "@garden/site-config": path.join(root, ".garden/site-config.ts"), "@garden/generated-content": path.join(root, ".garden/generated-content.ts") },
    plugins: [{ name: "next-node-exports", setup(builder) {
      builder.onResolve({ filter: /^next\// }, ({ path: specifier }) => ({ path: require.resolve(specifier), external: true }));
    } }],
    logLevel: "silent",
  });
  const { render, archive } = await import(outfile);
  const post = { title: "Description fixture", slug: "test", path: "test", date: "2026-07-25", kind: "post", tags: [], content: "## Body\n\nBody stays.", sourcePath: "posts/test.md" };
  const blank = render({ ...post, description: "" });
  assert.match(blank, /Body stays/u);
  assert.doesNotMatch(blank, /<p[^>]*p-summary/u);
  assert.doesNotMatch(blank, /<p[^>]*lead/u);
  const summary = render({ ...post, description: "An explicit summary." });
  assert.match(summary, /<p class="lead quote-plain p-summary">An explicit summary\.<\/p>/u);
  const blankArchive = archive({ ...post, description: "" });
  assert.doesNotMatch(blankArchive, /<p><\/p>/u);
  assert.match(archive({ ...post, description: "An explicit summary." }), /<p>An explicit summary\.<\/p>/u);
});
