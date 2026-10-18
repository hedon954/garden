/**
 * The label a code block shows for its fence language. The article, the preview
 * drawer and the standalone preview page all go through here, so ```py and
 * ```python read the same everywhere. Common aliases map to one name; anything
 * else is the fence language in capitals.
 */
const ALIASES = {
  py: "python",
  python3: "python",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  mts: "typescript",
  tsx: "tsx",
  sh: "shell",
  zsh: "shell",
  shell: "shell",
  console: "shell",
  golang: "go",
  rs: "rust",
  rb: "ruby",
  kt: "kotlin",
  yml: "yaml",
  md: "markdown",
  htm: "html",
  "c++": "cpp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  docker: "dockerfile",
  ps1: "powershell",
  plaintext: "text",
  txt: "text",
};

const NAMES = { cpp: "C++", csharp: "C#" };

/** Display label for a fence language, or "" when there is none. */
export function codeLanguageLabel(language) {
  const raw = String(language ?? "").trim().toLowerCase();
  if (!raw) return "";
  const name = ALIASES[raw] ?? raw;
  return NAMES[name] ?? name.toUpperCase();
}
