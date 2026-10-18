// Node only: where a `garden file` src points on disk. Kept apart from
// file-block.mjs so the page bundle never pulls in node:path.
import fs from "node:fs";
import path from "node:path";
import { isRemoteSrc, LARGE_FILE_BYTES, formatSize, maskHtmlComments, readFileProps } from "./file-block.mjs";
import { parseGardenBlock, parseGardenInfo, scanFences } from "./parse.mjs";

/**
 * Absolute path of a repo file named by a relative `src`, resolved next to the
 * Markdown file.
 * Returns `{ path }` or `{ error }` when it leaves the content root.
 */
export function resolveRepoFile(src, markdownPath, contentRoot) {
  const [assetPath] = String(src ?? "").trim().replace(/^<|>$/gu, "").split(/(?=[?#])/u, 1);
  let decoded = assetPath;
  try {
    decoded = decodeURIComponent(assetPath);
  } catch {
    // Keep the raw path; a missing file is reported by the caller.
  }
  const absolute = path.resolve(path.dirname(markdownPath), decoded);
  const relative = path.relative(contentRoot, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return { error: `文件必须放在 content 目录里：${src}` };
  }
  return { path: absolute };
}

/**
 * `garden check` for the files a post links: every repo file must exist
 * inside content/, and one above 5 MB gets a warning (Git keeps every version
 * forever; object storage suits big files). Remote URLs are not fetched here.
 * `line` is 1-based in `markdown`.
 */
export function checkFileSources(markdown, markdownPath, contentRoot) {
  const diagnostics = [];
  for (const fence of scanFences(maskHtmlComments(markdown))) {
    if (parseGardenInfo(fence.info)?.name !== "file") continue;
    const block = parseGardenBlock(fence.info, fence.body);
    if (!block || block.error || block.props.resolved !== undefined) continue;
    for (const file of readFileProps(block.props).files) {
      if (!file.src || isRemoteSrc(file.src) || file.src.startsWith("/")) continue;
      const resolved = resolveRepoFile(file.src, markdownPath, contentRoot);
      if (resolved.error) {
        diagnostics.push({ line: fence.line, code: "file-outside", severity: "error", message: resolved.error, suggestion: `把文件放进同名目录，例如 ./${path.basename(markdownPath, ".md")}/文件名` });
        continue;
      }
      if (!fs.existsSync(resolved.path) || !fs.statSync(resolved.path).isFile()) {
        diagnostics.push({ line: fence.line, code: "missing-asset", severity: "error", message: `找不到文件 ${file.src}`, suggestion: "src 相对这篇 Markdown 所在的目录。" });
        continue;
      }
      const size = fs.statSync(resolved.path).size;
      if (size > LARGE_FILE_BYTES) {
        diagnostics.push({
          line: fence.line,
          code: "file-large",
          severity: "warning",
          message: `${file.src} 有 ${formatSize(size)}，超过 5 MB。`,
          suggestion: "大文件放到对象存储（如阿里云 OSS），src 写完整的 https 地址；Git 会永久保存每个版本。",
        });
      }
    }
  }
  return diagnostics;
}
