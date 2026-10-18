/**
 * `garden file`: downloadable files in a post.
 *
 * Authors write a short YAML fence:
 *
 *   src: ./post-name/spec.zip        one file
 *   title: 规格包                     optional, defaults to the file name
 *   note: 一句话说明                   optional
 *
 * or a group:
 *
 *   title: 规格文档                    optional
 *   files:
 *     - src: ./post-name/01-prd.md
 *       note: 产品定位与验收标准
 *
 * The build resolves every `src` next to the Markdown file, copies repo files
 * to the public folder and replaces the fence with `resolved:` data (format,
 * size, preview kind, public URL, and for Markdown the source to render). The
 * page never parses Markdown in the browser.
 *
 * Everything here is plain data work shared by the build, `garden check`, the
 * page and the tests.
 */
/** Repo files above this size get a `garden check` warning suggesting OSS. */
export const LARGE_FILE_BYTES = 5 * 1024 * 1024;

export const FILE_KEYS = ["src", "title", "note", "files"];
export const FILE_ITEM_KEYS = ["src", "title", "note"];

const FORMATS = {
  md: { label: "Markdown", preview: "md", icon: "doc" },
  markdown: { label: "Markdown", preview: "md", icon: "doc" },
  html: { label: "HTML", preview: "html", icon: "code" },
  htm: { label: "HTML", preview: "html", icon: "code" },
  pdf: { label: "PDF", preview: "pdf", icon: "doc" },
  zip: { label: "ZIP", preview: "", icon: "archive" },
  gz: { label: "GZ", preview: "", icon: "archive" },
  tgz: { label: "TGZ", preview: "", icon: "archive" },
  "7z": { label: "7Z", preview: "", icon: "archive" },
  rar: { label: "RAR", preview: "", icon: "archive" },
  tar: { label: "TAR", preview: "", icon: "archive" },
};

/**
 * HTML comments blanked out, line breaks kept, so fences inside a comment (the
 * component cheat sheet in a new draft) are not mistaken for real blocks.
 */
export function maskHtmlComments(markdown) {
  return String(markdown ?? "").replace(/<!--[\s\S]*?-->/gu, (comment) => comment.replace(/[^\n]/gu, " "));
}

/** Extension of a path or URL, lower case, without the dot. */
export function fileExtension(src) {
  const clean = String(src ?? "").split(/[?#]/u, 1)[0];
  const base = clean.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** File name shown on the card: the last path segment, decoded. */
export function fileName(src) {
  const clean = String(src ?? "").split(/[?#]/u, 1)[0].replace(/\/+$/u, "");
  const base = clean.split("/").pop() ?? "";
  try {
    return decodeURIComponent(base);
  } catch {
    return base;
  }
}

/** Format label: Markdown, HTML, PDF, ZIP, or the extension in capitals. */
export function formatLabel(src) {
  const ext = fileExtension(src);
  return FORMATS[ext]?.label ?? (ext ? ext.toUpperCase() : "文件");
}

/** Icon family for the card: doc, code, archive or file. */
export function fileIcon(src) {
  return FORMATS[fileExtension(src)]?.icon ?? "file";
}

export const isRemoteSrc = (src) => /^https?:\/\//iu.test(String(src ?? "").trim());

/**
 * How the drawer previews a file: "md", "html", "pdf", or "" for download only.
 * Remote files have no preview in this version.
 */
export function previewKind(src, { remote = isRemoteSrc(src) } = {}) {
  if (remote) return "";
  return FORMATS[fileExtension(src)]?.preview ?? "";
}

/**
 * Sandbox for an HTML preview. Scripts may run so prototypes work, but the
 * page never gets the site's origin: no allow-same-origin.
 */
export const HTML_PREVIEW_SANDBOX = "allow-scripts allow-popups allow-forms";

/**
 * Attributes of the drawer's iframe, or null for a Markdown preview (rendered
 * on the server, no frame). HTML gets the sandbox; PDF gets none, because the
 * browser's PDF viewer does not run inside a sandboxed frame.
 */
export function previewFrameProps(file) {
  const kind = file?.preview;
  if (kind !== "html" && kind !== "pdf") return null;
  const props = { src: String(file.url ?? ""), title: `预览 ${file.name ?? ""}`.trim(), referrerPolicy: "no-referrer" };
  return kind === "html" ? { ...props, sandbox: HTML_PREVIEW_SANDBOX } : props;
}

/** Only web and site paths become links; anything else (javascript:, data:, //host) is dropped. */
export function safeFileHref(url) {
  const value = typeof url === "string" ? url.trim() : "";
  if (/^https?:\/\//iu.test(value)) return value;
  if (/^[a-z][a-z\d+.-]*:/iu.test(value) || value.startsWith("//")) return "";
  return value;
}

/** 12 KB, 1.4 MB: one decimal below 10, whole numbers above. */
export function formatSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "";
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const text = size < 10 ? size.toFixed(1).replace(/\.0$/u, "") : String(Math.round(size));
  return `${text} ${units[unit]}`;
}

/** 「Markdown · 12 KB」, or just the format when the size is unknown. */
export function fileMeta(file) {
  const size = formatSize(file?.size);
  return [file?.format, size].filter(Boolean).join(" · ");
}

const text = (value) => (typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value).trim());

/**
 * Validates authored props. Returns `{ layout, title, files, errors }` where
 * `layout` is "single" for one `src`, "group" for a `files` list.
 */
export function readFileProps(props) {
  const errors = [];
  const data = props && typeof props === "object" && !Array.isArray(props) ? props : {};
  const item = (raw, where) => {
    if (typeof raw === "string") return { src: raw.trim(), title: "", note: "" };
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push(`${where} 要写成带 src 的一项`);
      return null;
    }
    const unknown = Object.keys(raw).filter((key) => !FILE_ITEM_KEYS.includes(key));
    if (unknown.length) errors.push(`${where} 不支持的键：${unknown.join("、")}`);
    const src = text(raw.src);
    if (!src) errors.push(`${where} 缺少 src`);
    return { src, title: text(raw.title), note: text(raw.note) };
  };
  if (data.files !== undefined) {
    if (data.src !== undefined || data.note !== undefined) errors.push("files 和 src / note 不能同时写：一组文件的说明写在每一项里");
    if (!Array.isArray(data.files) || !data.files.length) {
      errors.push("files 要写成至少一项的列表");
      return { layout: "group", title: text(data.title), files: [], errors };
    }
    const files = data.files.map((raw, index) => item(raw, `files 第 ${index + 1} 项`)).filter(Boolean);
    return { layout: "group", title: text(data.title), files, errors };
  }
  const single = item({ src: data.src, title: data.title, note: data.note }, "文件");
  return { layout: "single", title: "", files: single ? [single] : [], errors };
}

/** Files of a built or authored block, whichever the fence holds. */
export function blockFiles(props) {
  if (props?.resolved && Array.isArray(props.resolved.files)) return props.resolved;
  const read = readFileProps(props);
  return {
    layout: read.layout,
    title: read.title,
    files: read.files.map((file) => ({
      ...file,
      name: fileName(file.src),
      title: file.title || fileName(file.src),
      url: file.src,
      format: formatLabel(file.src),
      icon: fileIcon(file.src),
      remote: isRemoteSrc(file.src),
      preview: "",
    })),
  };
}

/** Words a reader sees on the card: group title, file titles and notes. */
export function fileSearchText(props) {
  const block = blockFiles(props);
  return [block.title, ...block.files.flatMap((file) => [file.title || file.name, file.note])]
    .filter(Boolean)
    .join(" ");
}

const absolute = (url, siteUrl) => {
  if (!siteUrl || /^[a-z][a-z\d+.-]*:/iu.test(url)) return url;
  try {
    return new URL(url, `${siteUrl.replace(/\/+$/u, "")}/`).toString();
  } catch {
    return url;
  }
};

// Plain text inside a Markdown link: one line, every character that could start markup escaped.
const mdText = (value) => String(value ?? "").replace(/\s+/gu, " ").trim().replace(/([\\[\]()*_`<>!~|])/gu, "\\$1");

/** RSS and distribution: a plain list of download links. */
export function fileFeedMarkdown(props, { siteUrl = "" } = {}) {
  const block = blockFiles(props);
  const lines = block.files.map((file) => {
    const meta = fileMeta(file);
    const note = file.note ? `：${mdText(file.note)}` : "";
    const href = absolute(file.url, siteUrl).replace(/[<>\s]/gu, (char) => encodeURIComponent(char));
    return `- [${mdText(file.title || file.name)}](<${href}>)${meta ? `（${meta}）` : ""}${note}`;
  });
  return [block.title ? `**${mdText(block.title)}**\n` : "", ...lines].filter(Boolean).join("\n");
}
