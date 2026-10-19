/**
 * The label a code block shows for its fence language. The article, the preview
 * drawer and the standalone preview page all go through here, so ```py and
 * ```python read the same everywhere. Common aliases map to one language; JS and
 * TS use their abbreviations, every other language its full name in capitals
 * (PYTHON, GO, RUST), every shell (sh, zsh, bash, shell) reads SHELL, and an
 * unknown fence language is shown in capitals.
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
  bash: "shell",
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
  "c#": "csharp",
  cc: "cpp",
  hpp: "cpp",
  cs: "csharp",
  docker: "dockerfile",
  ps1: "powershell",
  plaintext: "text",
  txt: "text",
};

/** JavaScript and TypeScript go by their common abbreviations; everything else by its full name. */
const NAMES = { javascript: "JS", typescript: "TS", cpp: "C++", csharp: "C#" };

/**
 * The fence language from a code element's class (`language-c#` → `c#`). Takes
 * a class string or a class list. The name is everything after `language-` up
 * to the next space, so symbols stay: c#, c++, f#, objective-c, shell-session.
 */
export function fenceLanguage(className) {
  const names = Array.isArray(className) ? className.map(String) : String(className ?? "").split(/\s+/u);
  const token = names.find((name) => name.startsWith("language-") && name.length > 9);
  return token ? token.slice(9) : "";
}

/** Display label for a fence language, or "" when there is none. */
export function codeLanguageLabel(language) {
  const raw = String(language ?? "").trim().toLowerCase();
  if (!raw) return "";
  const name = ALIASES[raw] ?? raw;
  return NAMES[name] ?? name.toUpperCase();
}
