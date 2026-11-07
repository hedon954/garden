import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { gardenPackageRoot, gardenSiteRoot } from './garden-paths.mjs';

const root = gardenSiteRoot();
const args = process.argv.slice(2);
if (args.length > 1 || args[0]?.startsWith('--')) {
  console.error('Usage: garden verify [post.md] (default: all content, including drafts and untracked files)');
  process.exit(2);
}
const selected = args[0] || process.env.GARDEN_CHECK_FILE || null;
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
const posts = selected ? [selected] : articles(path.join(root, 'content/posts'));
const env = { ...process.env, GARDEN_SITE: root, GARDEN_UI_NO_COPY: '1' };
function run(script, parameters) {
  const result = spawnSync(process.execPath, [path.join(gardenPackageRoot, 'scripts', script), ...parameters], { cwd: root, env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}
console.log(selected ? `Garden preflight: ${selected}` : 'Garden preflight: all content (drafts + working-tree/untracked files included)');
// These are independent: structural failures must never suppress the AI repair prompt.
const structure = posts.length ? run('check-post.mjs', posts) : 0;
const compose = run('ui-cli.mjs', ['check', ...(selected ? [selected] : ['--all']), '--standalone', '--no-copy']);
if (structure || compose) console.error('Content checks failed; build/lint stages were not started. Compose repair prompt (when needed): .garden/ui-fix-prompt.md');
process.exit(structure || compose ? 1 : 0);
