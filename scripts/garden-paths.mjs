import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const gardenPackageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function gardenSiteRoot() {
  if (process.env.GARDEN_SITE) return path.resolve(process.env.GARDEN_SITE);
  const yaml = path.join(process.cwd(), "site.config.yaml");
  if (fs.existsSync(yaml)) {
    return path.dirname(fs.realpathSync(yaml));
  }
  return process.cwd();
}

export function gardenCacheDir(root = gardenSiteRoot()) {
  return path.join(root, ".garden");
}
