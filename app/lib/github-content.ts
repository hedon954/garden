import { withPostPinned } from "../../ui/garden/post-frontmatter.mjs";
import { isRepositoryManuscript, repositoryPostPath } from "./repository-path.mjs";

// GITHUB_API_URL lets GitHub Enterprise (and local mocks) replace the public API.
const githubApi = () => (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/+$/u, "");

type RepositoryFile = {
  content?: string;
  encoding?: string;
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

function fileStem(filePath: string) {
  return (filePath.split("/").pop() ?? "").replace(/\.md$/u, "");
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

export async function updateRepositoryPostPinned(input: {
  sourcePath: string;
  slug: string;
  title: string;
  pinned: boolean;
}) {
  const repositoryPath = repositoryPostPath(input.sourcePath);
  const existing = await readRepositoryFile(repositoryPath);
  if (!existing) throw new Error("未找到对应博文。");
  if (fileStem(repositoryPath) !== input.slug) {
    throw new Error("博文标识不匹配，已拒绝修改。");
  }
  const source = withPostPinned(existing.source, input.pinned);
  if (source === existing.source) return { slug: input.slug, pinned: input.pinned };
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
  const entries = (tree.tree ?? []).filter((entry) => entry.type === "blob");
  const paths = new Set(entries.map((entry) => entry.path));
  return entries
    .filter((entry) => isRepositoryManuscript(entry.path, paths))
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
