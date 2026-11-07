import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gardenPackageRoot, gardenSiteRoot } from './garden-paths.mjs';

const root = gardenSiteRoot();
const args = process.argv.slice(2);
const diffMode = args.length === 1 && args[0] === '--diff';
if (args.length > 1 || (!diffMode && args[0]?.startsWith('--'))) {
  console.error('Usage: garden verify [post.md | --diff] (default: all content, including drafts and untracked files)');
  process.exit(2);
}
const selected = diffMode ? null : args[0] || process.env.GARDEN_CHECK_FILE || null;
function changedMarkdown() {
  const git = parameters => {
    const result = spawnSync('git', parameters, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.status !== 0) throw new Error((result.stderr || result.error?.message || 'Git command failed').trim());
    return result.stdout;
  };
  git(['rev-parse', '--verify', 'HEAD']);
  const tracked = git(['diff', '--relative', '--name-only', '-z', '--find-renames', '--diff-filter=d', 'HEAD', '--', '.']);
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z', '--', '.']);
  return [...new Set([...tracked.split('\0'), ...untracked.split('\0')])]
    .filter(file => file.startsWith('content/') && file.endsWith('.md') && fs.existsSync(path.join(root, file)) && fs.lstatSync(path.join(root, file)).isFile())
    .sort();
}
let changed = null;
if (diffMode) {
  try { changed = changedMarkdown(); } catch (error) {
    console.error(`Cannot select changed Markdown from Git HEAD: ${error.message}`);
    process.exit(2);
  }
  console.log(`Garden diff preflight: ${changed.length} changed Markdown document(s)`);
  for (const file of changed) console.log(`  ${file}`);
  if (!changed.length) { console.log('No changed Markdown documents to check.'); process.exit(0); }
}
// Match build-content's article discovery: post.md + post/ means sidecar assets,
// not another collection of articles requiring post front matter.
function articles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return fs.existsSync(full + '.md') ? [] : articles(full);
    return entry.name.endsWith('.md') ? [path.relative(root, full)] : [];
  });
}
const posts = diffMode ? changed : selected ? [selected] : articles(path.join(root, 'content/posts'));
const env = { ...process.env, GARDEN_SITE: root, GARDEN_UI_NO_COPY: '1' };
function run(script, parameters) {
  const result = spawnSync(process.execPath, [path.join(gardenPackageRoot, 'scripts', script), ...parameters], { cwd: root, env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}
if (!diffMode) console.log(selected ? `Garden preflight: ${selected}` : 'Garden preflight: all content (drafts + working-tree/untracked files included)');
// These are independent: structural failures must never suppress the AI repair prompt.
let structure = 0;
if (posts.length) {
  // check-post's JSON remains unchanged for machine consumers; this human-facing
  // workflow renders its structured diagnostics rather than dumping every result.
  const result = spawnSync(process.execPath, [path.join(gardenPackageRoot, 'scripts/check-post.mjs'), ...posts], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  structure = result.status ?? 1;
  try {
    const report = JSON.parse(result.stdout);
    const errors = report.results.reduce((n, item) => n + item.errors.length, 0);
    console.log(`结构检查：${report.results.length} 篇，${errors} 个错误`);
    for (const item of report.results) for (const diagnostic of [...item.errors, ...(item.warnings ?? [])]) {
      console.log(`${item.file}:${diagnostic.line}  ${diagnostic.code}  ${diagnostic.message}`);
    }
  } catch {
    structure = structure || 1;
    const log = path.join(root, '.garden/check-structure-error.log');
    fs.mkdirSync(path.dirname(log), { recursive: true });
    fs.writeFileSync(log, `${result.stdout ?? ''}\n${result.stderr ?? result.error?.message ?? ''}`);
    console.error('结构检查异常，详情：.garden/check-structure-error.log');
  }
}
const compose = run('ui-cli.mjs', ['check', ...(diffMode ? changed : selected ? [selected] : ['--all']), '--standalone', '--no-copy']);
if (structure || compose) console.error('Content checks failed; build/lint stages were not started. Compose repair prompt (when needed): .garden/ui-fix-prompt.md');
process.exit(structure || compose ? 1 : 0);
