import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { gardenSiteRoot } from "../../scripts/garden-paths.mjs";
import { bookshelfMountFromFile, normalizeBookshelfPostPath } from "../components/bookshelf/catalog.mjs";
import { BookshelfConfigError, parseBookshelfConfig } from "../components/bookshelf/schema.mjs";

export function bookshelfConfigPath(root = gardenSiteRoot()) {
  return path.join(root, "content", "bookshelf.yaml");
}

/**
 * The site shelf, or null when `content/bookshelf.yaml` is absent.
 * Absent means the package demo (click-test only). A file here is the live shelf:
 * each book's `post` is read from `content/posts` and turned into note HTML.
 * `preparedPosts`, when passed, are the sync pipeline's posts (rewritten asset
 * URLs). Otherwise the markdown files are read directly.
 * Throws `BookshelfConfigError` when the file, a cover, or a post path is broken.
 */
export function loadBookshelf(root = gardenSiteRoot(), preparedPosts) {
  const file = bookshelfConfigPath(root);
  if (!fs.existsSync(file)) return null;
  let parsed;
  try {
    parsed = parseYaml(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "无法解析";
    throw new BookshelfConfigError("invalid-root", `content/bookshelf.yaml 无法解析：${detail}`);
  }
  const config = parseBookshelfConfig(parsed);
  const sources = preparedPosts
    ? preparedPosts.map((post) => ({
      path: post.path,
      title: post.title,
      description: post.description,
      cover: post.cover,
      content: post.content,
    }))
    : readReferencedPosts(root, config);
  return bookshelfMountFromFile(config, sources);
}

function readReferencedPosts(root, config) {
  const seen = new Set();
  const posts = [];
  for (const shelf of config.shelves) {
    for (const book of shelf.books) {
      if (!book.post) continue;
      const relative = normalizeBookshelfPostPath(book.post);
      if (seen.has(relative)) continue;
      seen.add(relative);
      posts.push(readPost(root, relative));
    }
  }
  return posts;
}

function readPost(root, postPath) {
  const relative = normalizeBookshelfPostPath(postPath);
  const postsRoot = path.resolve(root, "content", "posts");
  const file = `${path.resolve(postsRoot, ...relative.split("/"))}.md`;
  if (!file.startsWith(`${postsRoot}${path.sep}`)) {
    throw new BookshelfConfigError("post", `post「${postPath}」必须是 content/posts 下的路径，不带 .md。`);
  }
  if (!fs.existsSync(file)) {
    throw new BookshelfConfigError("post", `content/bookshelf.yaml 引用的博文 ${relative} 不存在。`);
  }
  let parsed;
  try {
    parsed = matter(fs.readFileSync(file, "utf8"), {
      engines: {
        yaml: {
          parse: (input) => parseYaml(input) ?? {},
        },
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "无法解析";
    throw new BookshelfConfigError("post", `博文 ${relative} 无法解析：${detail}`);
  }
  const data = parsed.data && typeof parsed.data === "object" ? parsed.data : {};
  return {
    path: relative,
    title: optionalString(data.title),
    description: optionalString(data.description),
    cover: optionalString(data.cover),
    content: parsed.content,
  };
}

function optionalString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
