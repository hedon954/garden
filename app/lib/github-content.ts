import matter from "gray-matter";
import type { ContentEntry, MediaItem } from "./content";

const apiBase = "https://api.github.com";

type RepositoryFile = {
  content?: string;
  encoding?: string;
  sha?: string;
};

type RepositoryDirectoryEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
};

export type RepositoryThought = ContentEntry & {
  id: string;
  status: "draft" | "published";
  sha?: string;
};

function repositoryConfig() {
  const repository = process.env.CONTENT_REPOSITORY;
  const token = process.env.CONTENT_GITHUB_TOKEN;
  const branch = process.env.CONTENT_BRANCH ?? "main";
  if (!repository || !token) return null;
  return { repository, token, branch };
}

export function isContentRepositoryConfigured() {
  return Boolean(repositoryConfig());
}

function headers(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "Markdown-Blog-Admin",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function utf8ToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToUtf8(value: string) {
  const binary = atob(value.replace(/\s/gu, ""));
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMedia(value: unknown): value is MediaItem[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Record<string, unknown>;
    return ["image", "audio", "video", "link"].includes(String(candidate.type)) &&
      typeof candidate.src === "string";
  });
}

function normalizeThought(source: string, path: string, sha?: string): RepositoryThought | null {
  const parsed = matter(source);
  const data = parsed.data;
  if (typeof data.title !== "string" || typeof data.slug !== "string" || typeof data.date !== "string") {
    return null;
  }
  const media = isMedia(data.media) ? data.media : [];
  const status = data.draft === true ? "draft" : "published";
  return {
    id: data.slug,
    slug: data.slug,
    title: data.title,
    date: data.date,
    tags: isStringArray(data.tags) ? data.tags : [],
    mediaType: media[0]?.type ?? "text",
    media,
    kind: "thought",
    draft: status === "draft",
    sourcePath: path,
    content: parsed.content.trim(),
    status,
    sha,
  };
}

function serializeThought(thought: {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  media: MediaItem[];
  status: "draft" | "published";
  date?: string;
}) {
  return matter.stringify(thought.content.trim().concat("\n"), {
    title: thought.title,
    slug: thought.slug,
    date: thought.date ?? new Date().toISOString(),
    tags: thought.tags,
    mediaType: thought.media[0]?.type ?? "text",
    media: thought.media,
    draft: thought.status === "draft",
  });
}

async function requestRepository(path: string, init?: RequestInit) {
  const config = repositoryConfig();
  if (!config) throw new Error("未配置 CONTENT_REPOSITORY 或 CONTENT_GITHUB_TOKEN。");
  const url = new URL(`${apiBase}/repos/${config.repository}/contents/${path}`);
  if (!init?.method || init.method === "GET") url.searchParams.set("ref", config.branch);
  return {
    config,
    response: await fetch(url, {
      ...init,
      headers: { ...headers(config.token), ...init?.headers },
      cache: "no-store",
    }),
  };
}

async function mutateRepository(
  path: string,
  method: "PUT" | "DELETE",
  payload: Record<string, unknown>,
) {
  const config = repositoryConfig();
  if (!config) throw new Error("未配置 CONTENT_REPOSITORY 或 CONTENT_GITHUB_TOKEN。");
  return requestRepository(path, {
    method,
    body: JSON.stringify({ ...payload, branch: config.branch }),
  });
}

async function readRepositoryFile(path: string) {
  const { response } = await requestRepository(path);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("无法读取 GitHub 内容仓库。");
  const file = (await response.json()) as RepositoryFile;
  if (file.encoding !== "base64" || !file.content || !file.sha) {
    throw new Error("GitHub 返回的内容文件格式不正确。");
  }
  return { source: base64ToUtf8(file.content), sha: file.sha };
}

export async function listRepositoryThoughts() {
  const config = repositoryConfig();
  if (!config) return [] as RepositoryThought[];
  const { response } = await requestRepository("content/thoughts");
  if (response.status === 404) return [] as RepositoryThought[];
  if (!response.ok) throw new Error("无法读取 GitHub 随想目录。");
  const entries = (await response.json()) as RepositoryDirectoryEntry[];
  const thoughts = await Promise.all(
    entries
      .filter((entry) => entry.type === "file" && entry.name.endsWith(".md"))
      .map(async (entry) => {
        const file = await readRepositoryFile(entry.path);
        return file ? normalizeThought(file.source, entry.path, file.sha) : null;
      }),
  );
  return thoughts
    .filter((thought): thought is RepositoryThought => Boolean(thought))
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

export async function createRepositoryThought(input: Omit<RepositoryThought, "id" | "kind" | "sourcePath" | "draft" | "sha" | "mediaType">) {
  const path = `content/thoughts/${input.slug}.md`;
  const existing = await readRepositoryFile(path);
  if (existing) throw new Error("这个随想 slug 已存在，请稍后重试。");
  const source = serializeThought(input);
  const { response } = await mutateRepository(path, "PUT", {
    message: `content: 发布随想 ${input.title}`,
    content: utf8ToBase64(source),
  });
  if (!response.ok) throw new Error("GitHub 未接受这次随想提交。");
  const result = (await response.json()) as { content?: { sha?: string } };
  return normalizeThought(source, path, result.content?.sha) as RepositoryThought;
}

export async function updateRepositoryThought(slug: string, status: "draft" | "published") {
  const path = `content/thoughts/${slug}.md`;
  const existing = await readRepositoryFile(path);
  if (!existing) throw new Error("未找到对应随想。");
  const thought = normalizeThought(existing.source, path, existing.sha);
  if (!thought) throw new Error("随想内容格式不正确。");
  const source = serializeThought({ ...thought, status, date: status === "published" ? new Date().toISOString() : thought.date });
  const { response } = await mutateRepository(path, "PUT", {
    message: `content: ${status === "published" ? "发布" : "撤回"}随想 ${thought.title}`,
    content: utf8ToBase64(source),
    sha: existing.sha,
  });
  if (!response.ok) throw new Error("GitHub 未接受这次状态更新。");
  return normalizeThought(source, path) as RepositoryThought;
}

export async function deleteRepositoryThought(slug: string) {
  const path = `content/thoughts/${slug}.md`;
  const existing = await readRepositoryFile(path);
  if (!existing) throw new Error("未找到对应随想。");
  const { response } = await mutateRepository(path, "DELETE", {
    message: `content: 删除随想 ${slug}`,
    sha: existing.sha,
  });
  if (!response.ok) throw new Error("GitHub 未接受这次删除请求。");
}
