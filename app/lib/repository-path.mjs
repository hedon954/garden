const invalidPostPathMessage = "博文路径不合法，无法修改置顶状态。";

/**
 * Content entries store paths relative to `content/`, while GitHub's Contents
 * API expects paths relative to the repository root. Normalize that boundary
 * without allowing a generated or legacy path to escape `content/posts/`.
 *
 * @param {string} sourcePath
 */
export function repositoryPostPath(sourcePath) {
  const relativePath = sourcePath.startsWith("content/")
    ? sourcePath.slice("content/".length)
    : sourcePath;
  const segments = relativePath.split("/");
  const fileName = segments.at(-1) ?? "";
  const hasUnsafeSegment = segments.some((segment) => {
    if (!segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes("\0")) {
      return true;
    }
    try {
      const decoded = decodeURIComponent(segment);
      return decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\") || decoded.includes("\0");
    } catch {
      return true;
    }
  });

  if (segments.length < 2 || segments[0] !== "posts" || !fileName.endsWith(".md") || hasUnsafeSegment) {
    throw new Error(invalidPostPathMessage);
  }
  return `content/${relativePath}`;
}
