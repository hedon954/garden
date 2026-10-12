import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import type { ContentEntry, MediaItem } from "./content";
import { repositoryPostPath } from "./repository-path.mjs";
import { canonicalSiteDate, formatAuthorDate } from "../../scripts/site-date.mjs";

const matterOptions = {
  engines: {
    yaml: {
      parse: (input: string) => parseYaml(input) ?? {},
    },
  },
};

// GITHUB_API_URL lets GitHub Enterprise (and local mocks) replace the public API.
const githubApi = () => (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/+$/u, "");

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
  tags: string[];
  media: MediaItem[];
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

function fileStem(filePath: string) {
  return (filePath.split("/").pop() ?? "").replace(/\.md$/u, "");
}

function normalizeThought(source: string, filePath: string, sha?: string): RepositoryThought | null {
  const parsed = matter(source, matterOptions);
  const data = parsed.data;
  const slug = fileStem(filePath);
  if (typeof data.title !== "string" || typeof data.date !== "string" || !canonicalSiteDate(data.date) || !slug) {
    return null;
  }
  if (data.slug !== undefined && data.slug !== slug) return null;
  const media = isMedia(data.media) ? data.media : [];
  const status = data.draft === true ? "draft" : "published";
  return {
    id: slug,
    slug,
    path: slug,
    title: data.title,
    date: data.date,
    tags: isStringArray(data.tags) ? data.tags : [],
    mediaType: media[0]?.type ?? "text",
    media,
    kind: "thought",
    draft: status === "draft",
    sourcePath: filePath,
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
    date: thought.date ?? formatAuthorDate(),
    tags: thought.tags,
    mediaType: thought.media[0]?.type ?? "text",
    media: thought.media,
    draft: thought.status === "draft",
  });
}

async function requestRepository(path: string, init?: RequestInit) {
  const config = repositoryConfig();
  if (!config) throw new Error("未配置 CONTENT_REPOSITORY 或 CONTENT_GITHUB_TOKEN。");
  // Encode each segment: the URL parser would otherwise resolve "%2e%2e" as ".." and treat "?" / "#" as delimiters.
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`${githubApi()}/repos/${config.repository}/contents/${encoded}`);
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

export async function readRepositoryFile(path: string) {
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
    .sort((left, right) => {
      const rightTime = Date.parse(canonicalSiteDate(right.date) ?? "");
      const leftTime = Date.parse(canonicalSiteDate(left.date) ?? "");
      return rightTime - leftTime;
    });
}

export async function createRepositoryThought(input: Omit<RepositoryThought, "id" | "kind" | "path" | "sourcePath" | "draft" | "sha" | "mediaType">) {
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
  const source = serializeThought({ ...thought, status, date: status === "published" ? formatAuthorDate() : thought.date });
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

export async function updateRepositoryPostPinned(input: {
  sourcePath: string;
  slug: string;
  title: string;
  pinned: boolean;
}) {
  const repositoryPath = repositoryPostPath(input.sourcePath);
  const existing = await readRepositoryFile(repositoryPath);
  if (!existing) throw new Error("未找到对应博文。");
  const parsed = matter(existing.source);
  if (fileStem(repositoryPath) !== input.slug) {
    throw new Error("博文标识不匹配，已拒绝修改。");
  }
  const data = { ...parsed.data } as Record<string, unknown>;
  if (input.pinned) data.pinned = true;
  else delete data.pinned;
  const source = matter.stringify(`${parsed.content.trim()}\n`, data);
  const { response } = await mutateRepository(repositoryPath, "PUT", {
    message: `content: ${input.pinned ? "置顶" : "取消置顶"}博文 ${input.title}`,
    content: utf8ToBase64(source),
    sha: existing.sha,
  });
  if (!response.ok) throw new Error("GitHub 未接受这次置顶状态更新。");
  return { slug: input.slug, pinned: input.pinned };
}

const blobCache = new Map<string, string>();

/** Every Markdown file under content/ with its blob sha, from one tree request. */
export async function listContentMarkdown() {
  const config = repositoryConfig();
  if (!config) throw new Error("未配置 CONTENT_REPOSITORY 或 CONTENT_GITHUB_TOKEN。");
  const url = `${githubApi()}/repos/${config.repository}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`;
  const response = await fetch(url, { headers: headers(config.token), cache: "no-store" });
  if (!response.ok) throw new Error("无法读取 GitHub 仓库目录。");
  const tree = (await response.json()) as { tree?: Array<{ path: string; type: string; sha: string }> };
  return (tree.tree ?? [])
    .filter((entry) => entry.type === "blob" && /^content\/(?:posts|thoughts)\/.+\.md$/u.test(entry.path))
    .map((entry) => ({ path: entry.path, sha: entry.sha }));
}

/** Blob text by sha; blobs never change, so they are cached for the process lifetime. */
export async function readRepositoryBlob(sha: string) {
  const cached = blobCache.get(sha);
  if (cached !== undefined) return cached;
  const config = repositoryConfig();
  if (!config) throw new Error("未配置 CONTENT_REPOSITORY 或 CONTENT_GITHUB_TOKEN。");
  const response = await fetch(`${githubApi()}/repos/${config.repository}/git/blobs/${sha}`, { headers: headers(config.token), cache: "no-store" });
  if (!response.ok) throw new Error("无法读取 GitHub 文件内容。");
  const blob = (await response.json()) as { content?: string; encoding?: string };
  const text = blob.encoding === "base64" && blob.content ? base64ToUtf8(blob.content) : "";
  blobCache.set(sha, text);
  return text;
}

/** Raw bytes of a repository file (images, HTML, data) for the draft preview proxy. */
export async function readRepositoryRaw(path: string) {
  const { response } = await requestRepository(path, { headers: { Accept: "application/vnd.github.raw" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("无法读取 GitHub 文件。");
  return response.arrayBuffer();
}
