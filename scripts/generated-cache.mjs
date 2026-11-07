import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { gardenCacheDir } from './garden-paths.mjs';

/** Generated metadata is private build input, never a source edit or public asset. */
export function generatedCachePath(siteRoot, name) {
  if (path.basename(name) !== name) throw new Error('Expected a cache basename');
  return path.join(gardenCacheDir(siteRoot), name);
}
export function readGeneratedCache(siteRoot, name, fallback) {
  const file = generatedCachePath(siteRoot, name);
  try {
    if (!fs.existsSync(file)) {
      const legacy = path.join(siteRoot, name);
      if (fs.existsSync(legacy)) {
        // Validate before importing; preserve exact bytes and never replace a newer cache.
        JSON.parse(fs.readFileSync(legacy, 'utf8'));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        try { fs.copyFileSync(legacy, file, fs.constants.COPYFILE_EXCL); }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}
export function writeGeneratedCache(siteRoot, name, value) {
  const file = generatedCachePath(siteRoot, name);
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === next) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temporary, next, { flag: 'wx' }); fs.renameSync(temporary, file); }
  finally { fs.rmSync(temporary, { force: true }); }
  return true;
}
