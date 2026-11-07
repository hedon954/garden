import { spawnSync } from 'node:child_process';
export function run(command, defaults = [], requireTarget = false) {
  const args = process.argv.slice(2);
  if (requireTarget && args.length === 0) {
    console.error('Provide a post path, --all or --staged as supported by the Garden CLI. Run from the site root.');
    process.exit(2);
  }
  // No shell, no network install, no duplicate parser; cwd is the author's site root.
  const result = spawnSync('npx', ['--no-install', 'garden', 'ui', command, ...args, ...defaults], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
