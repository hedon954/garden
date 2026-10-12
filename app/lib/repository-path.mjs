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

const unsafeSegment = (segment) => {
  if (!segment || segment === "." || segment === ".." || segment.includes("\\") || segment.includes("\0")) return true;
  try {
    const decoded = decodeURIComponent(segment);
    return decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\") || decoded.includes("\0");
  } catch {
    return true;
  }
};

/**
 * Repository path of a Markdown file the admin may read: inside content/posts
 * or content/thoughts, never escaping it.
 *
 * @param {string} value
 */
export function repositoryContentPath(value) {
  const path = String(value ?? "").replace(/^\/+/u, "");
  const withRoot = path.startsWith("content/") ? path : `content/${path}`;
  const segments = withRoot.split("/");
  if (
    segments.length < 3 ||
    !["posts", "thoughts"].includes(segments[1]) ||
    !withRoot.endsWith(".md") ||
    segments.some(unsafeSegment)
  ) {
    throw new Error("稿件路径不合法。");
  }
  return withRoot;
}

const ASSET_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  html: "text/html; charset=utf-8",
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
  json: "application/json; charset=utf-8",
};

/**
 * Content type for a same-name-directory file the draft preview may proxy,
 * or null when the extension is not allowed.
 *
 * @param {string} path
 */
export function previewAssetType(path) {
  const extension = String(path).split(".").pop()?.toLowerCase() ?? "";
  return Object.hasOwn(ASSET_TYPES, extension) ? ASSET_TYPES[extension] : null;
}
