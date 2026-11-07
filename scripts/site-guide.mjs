import fs from 'node:fs';
import path from 'node:path';

/** Missing-only site entry point; never replaces files, directories or symlinks. */
export function installSiteGuide({ engineRoot, siteRoot, lang = 'zh' }) {
  const destination = path.resolve(siteRoot);
  // Refuse an aliased destination directory; a pre-existing guide (including
  // dangling symlinks) is preserved without opening or following it.
  try { if (fs.lstatSync(destination).isSymbolicLink()) throw new Error(`Refusing symlink destination: ${destination}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const target = path.join(destination, 'AGENTS.md');
  try { fs.lstatSync(target); return false; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const template = path.join(engineRoot, 'templates/site', lang === 'en' ? 'AGENTS.en.md' : 'AGENTS.md');
  fs.mkdirSync(destination, { recursive: true });
  try { fs.copyFileSync(template, target, fs.constants.COPYFILE_EXCL); }
  catch (error) { if (error.code === 'EEXIST') return false; throw error; }
  return true;
}
