/**
 * Small explicit allowlist for the handbook fact-check gate.
 * Only external tools or standard non-Garden tokens that cannot be derived
 * from repository source files belong here. Every entry requires a comment.
 */

export const ALLOWED_EXTERNAL_BINARIES = {
  // Node.js package manager used to install hd-garden and run package scripts
  npm: "Node.js package manager CLI",
  // Node.js package runner used to invoke `npx garden` / `npx hd-garden`
  npx: "Node.js package runner CLI",
  // Node.js runtime CLI
  node: "Node.js runtime CLI",
  // Git version control CLI used in authoring and deployment workflows
  git: "Git CLI",
  // POSIX shell builtin for changing the working directory
  cd: "POSIX shell directory builtin",
  // OpenSSH key generator used when creating a GitHub Pages deploy key
  "ssh-keygen": "OpenSSH key generation tool for deploy keys",
};

export const ALLOWED_EXTERNAL_FLAGS = {
  // `npm install --save-exact` pins the exact hd-garden version in a site repo
  "--save-exact": "npm install flag to pin exact dependency version",
  // `ssh-keygen -t ed25519 -C ... -f ...` standard OpenSSH flags
  "-t": "ssh-keygen key type flag",
  "-C": "ssh-keygen comment flag",
  "-f": "ssh-keygen output file flag",
  // `git commit -m` / `git add -A` standard git flags
  "-m": "git commit message flag",
  "-A": "git add all tracked/untracked files flag",
};

export const ALLOWED_NON_ENV_UPPER_SNAKE = {
  // Placeholder token shown in ssh-keygen / GitHub Actions prose or HTTP/DOM acronyms
  GFM: "GitHub Flavored Markdown acronym",
  YAML: "YAML Ain't Markup Language acronym",
  HTML: "HyperText Markup Language acronym",
  CSS: "Cascading Style Sheets acronym",
  SVG: "Scalable Vector Graphics acronym",
  JSON: "JavaScript Object Notation acronym",
  CSV: "Comma-Separated Values acronym",
  TSV: "Tab-Separated Values acronym",
  URL: "Uniform Resource Locator acronym / Makefile URL parameter",
  RSS: "Really Simple Syndication acronym",
  TOC: "Table of Contents acronym",
  CJK: "Chinese, Japanese, Korean typography acronym",
  LIGHT: "Theme label in prose/diagrams",
  DARK: "Theme label in prose/diagrams",
  UTF: "Unicode Transformation Format prefix",
  DOM: "Document Object Model acronym",
  HTTP: "Hypertext Transfer Protocol acronym",
  HTTPS: "Hypertext Transfer Protocol Secure acronym",
  SSH: "Secure Shell acronym",
  PAT: "Personal Access Token acronym",
  OAuth: "Open Authorization acronym",
  API: "Application Programming Interface acronym",
  CDN: "Content Delivery Network acronym",
  DNS: "Domain Name System acronym",
  CI: "Continuous Integration acronym",
  PR: "Pull Request acronym",
  ID: "Identifier acronym",
  UI: "User Interface acronym",
  AI: "Artificial Intelligence acronym",
  MB: "Megabyte unit",
  KB: "Kilobyte unit",
  GB: "Gigabyte unit",
};

/**
 * Explicit allowlist of CJK characters permitted on English handbook pages:
 * - "中": the "中 / EN" language switcher in the header
 * - "丨" / "｜": the two-line title split delimiter character where explained in prose
 * - figureAllKeyword: the literal config value `"全部"` ONLY in
 *   docs/handbook/en/components/figure.md on the `parts[].id` field row
 */
export const ALLOWED_EN_HANDBOOK_CJK = {
  switcher: "中",
  titleSplitChars: new Set(["丨", "｜"]),
  figureAllKeyword: {
    file: "docs/handbook/en/components/figure.md",
    routePattern: /(?:^|\/)garden\/en\/components\/figure(?:\/index\.html|\/)?$/u,
    linePattern: /^\|\s*`parts\[\]\.id`\s*\|/u,
    literal: '"全部"',
  },
};
