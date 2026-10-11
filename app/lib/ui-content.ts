import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { scanMarkdown } from "../../ui/core/scan.mjs";
import { canonicalSiteDate } from "../../scripts/site-date.mjs";
import {
  isContentRepositoryConfigured,
  listContentMarkdown,
  readRepositoryBlob,
  readRepositoryFile,
  readRepositoryRaw,
} from "./github-content";

const matterOptions = { engines: { yaml: { parse: (input: string) => parseYaml(input) ?? {} } } };

export const REPOSITORY_REQUIRED = "这一页从内容仓库读取稿件：请配置 CONTENT_REPOSITORY 和 CONTENT_GITHUB_TOKEN。";

function requireRepository() {
  if (!isContentRepositoryConfigured()) throw new Error(REPOSITORY_REQUIRED);
}

export async function readMarkdown(repoPath: string, sha?: string) {
  requireRepository();
  if (sha) return { source: await readRepositoryBlob(sha), sha };
  return readRepositoryFile(repoPath);
}

export async function readRaw(repoPath: string): Promise<ArrayBuffer | null> {
  requireRepository();
  return readRepositoryRaw(repoPath);
}

export async function readText(repoPath: string) {
  const raw = await readRaw(repoPath);
  return raw ? new TextDecoder().decode(raw) : undefined;
}

export function frontMatterOf(source: string) {
  try {
    const { data } = matter(source, matterOptions);
    const publish = canonicalSiteDate(data.publishAt ?? data.date);
    return {
      title: typeof data.title === "string" ? data.title : null,
      draft: data.draft === true || (Boolean(publish) && Date.parse(publish as string) > Date.now()),
    };
  } catch {
    return { title: null, draft: false };
  }
}

type BlockSummary = ReturnType<typeof scanMarkdown>[number];
export type FileBlocks = { path: string; sha: string; title: string | null; draft: boolean; blocks: BlockSummary[] };

const scanCache = new Map<string, FileBlocks>();

/** All blocks in the repository, scanned once per blob sha. */
export async function scanRepositoryBlocks() {
  requireRepository();
  const files = await listContentMarkdown();
  const results: FileBlocks[] = [];
  const queue = [...files];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const file = queue.shift();
      if (!file) break;
      const cached = scanCache.get(file.sha);
      if (cached) {
        results.push(cached);
        continue;
      }
      const source = await readRepositoryBlob(file.sha);
      const blocks = scanMarkdown(source, { markdownPath: file.path, skipData: true });
      const entry: FileBlocks = { path: file.path, sha: file.sha, ...frontMatterOf(source), blocks };
      scanCache.set(file.sha, entry);
      results.push(entry);
    }
  });
  await Promise.all(workers);
  return results.filter((file) => file.blocks.length).sort((a, b) => a.path.localeCompare(b.path));
}
