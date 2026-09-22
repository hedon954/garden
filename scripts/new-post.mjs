import { randomUUID } from "node:crypto";
import { lstat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatAuthorDate } from "./site-date.mjs";

const root = path.resolve(process.env.GARDEN_SITE || process.cwd());
const option = (name) => (process.env[`GARDEN_NEW_${name}`] ?? "").trim();

async function main() {
  const title = option("TITLE") || "新文章";
  const date = formatAuthorDate();
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  const slug = option("SLUG") || titleSlug || `post-${date.slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  const directory = option("DIR");
  const topic = option("TOPIC") || "未分类";

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    throw new Error("SLUG 只能包含小写字母、数字和连字符，不含 .md 后缀。");
  }
  const segments = directory ? directory.split("/") : [];
  if (segments.some((segment) => !/^[\p{L}\p{N}_-]+$/u.test(segment))) {
    throw new Error("DIR 应为 content/posts 下的相对目录，各级只使用文字、数字、下划线或连字符，例如 go/runtime。");
  }

  let parent = root;
  for (const segment of ["content", "posts", ...segments]) {
    parent = path.join(parent, segment);
    try {
      await mkdir(parent);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    if (!(await lstat(parent)).isDirectory()) {
      throw new Error(`目录不可用（不支持符号链接）：${parent}`);
    }
  }

  const destination = path.join(parent, `${slug}.md`);
  // JSON strings are valid YAML scalars, including quotes, colons and newlines.
  const markdown = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `date: ${date}`,
    `description: ${JSON.stringify("请填写一句话摘要。")}`,
    `topic: ${JSON.stringify(topic)}`,
    "tags: []",
    "draft: true",
    "---",
    "",
    "## 起因",
    "",
    "从这里开始写正文。",
    "",
  ].join("\n");
  try {
    await writeFile(destination, markdown, { flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(`文章已存在，未覆盖：${path.relative(root, destination)}。请换一个 SLUG。`);
    }
    throw error;
  }

  console.log(`已创建草稿：${path.relative(root, destination)}`);
  console.log(`文章路径：/blog/${[...segments, slug].join("/")}/`);
  console.log("预览：CONTENT_INCLUDE_DRAFTS=1 make dev");
  console.log("发布前请完善摘要、分类与正文，并将 draft 改为 false，再运行 make update。");
}

main().catch((error) => {
  console.error(`创建失败：${error.message}`);
  process.exitCode = 1;
});
