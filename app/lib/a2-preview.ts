import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const dir = path.join(process.cwd(), "parity", "articles");

const originals: Record<string, string> = {
  "ai-agent-react-vs-workflow": "https://hedon.top/blog/ai-agent/ai-agent-react-vs-workflow/",
  "rust-action-spinlock": "https://hedon.top/blog/rust-action-spinlock/",
  "claude-code-source": "https://hedon.top/blog/claude-code-source/",
  "go-gc-tri-color-marking": "https://hedon.top/blog/go/go-gc-tri-color-marking/",
  "kv-cache-interactive": "https://hedon.top/blog/llm-kv-cache/",
};

export type A2Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
  topic: string;
  cover: string;
  original: string;
  content: string;
};

export function a2Slugs() {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -3)).sort();
}

export function readA2Article(slug: string): A2Article | null {
  const file = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const parsed = matter(fs.readFileSync(file, "utf8"));
  const data = parsed.data ?? {};
  const cover = typeof data.cover === "string" ? data.cover : "";
  const date = data.date instanceof Date && !Number.isNaN(data.date.getTime())
    ? data.date.toISOString()
    : typeof data.date === "string" ? data.date : "";
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date,
    topic: String(data.topic ?? ""),
    cover: cover && !/^https?:/iu.test(cover) ? `https://hedon.top/media/covers/${cover}` : cover,
    original: originals[slug] ?? "",
    content: parsed.content,
  };
}
