import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Chinese release report for one version, plus the compare link. Empty or English-only notes fail. */
export function releaseNotes({ changelog, version, repo = "hedon954/garden" }) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    throw new Error(`版本号必须是 major.minor.patch，收到 ${version}`);
  }
  const lines = String(changelog).replace(/^\uFEFF/u, "").split(/\r?\n/u);
  const heading = new RegExp(`^##\\s+${version.replaceAll(".", "\\.")}\\s*$`, "u");
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) {
    throw new Error(`CHANGELOG.md 缺少 ## ${version}。发版前先写中文发布报告。`);
  }
  const next = lines.findIndex((line, index) => index > start && /^##\s+\d+\.\d+\.\d+\s*$/u.test(line));
  const body = lines.slice(start + 1, next < 0 ? lines.length : next).join("\n").trim();
  if (!body || !/\p{Script=Han}/u.test(body)) {
    throw new Error(`## ${version} 的发布报告不能为空，并且必须用中文写给读者。`);
  }
  const previous = next < 0 ? "" : lines[next].replace(/^##\s+/u, "").trim();
  const compare = previous
    ? `https://github.com/${repo}/compare/v${previous}...v${version}`
    : `https://github.com/${repo}/releases/tag/v${version}`;
  return `${body}\n\n**Full Changelog**: ${compare}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  process.stdout.write(releaseNotes({ changelog, version }));
}
