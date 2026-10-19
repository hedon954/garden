// The browser's built JS and CSS. vinext 1.x writes them under dist/client/_next/static/
// (chunks/*.js, css/*.css), as Next.js does; vinext 0.0.x used dist/client/assets/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const clientAssetsDir = fileURLToPath(new URL("../dist/client/_next/static/", import.meta.url));

/** Absolute paths of the built client files whose name matches pattern, sorted; [] before a build. */
export function clientAssetFiles(pattern) {
  if (!fs.existsSync(clientAssetsDir)) return [];
  return fs.readdirSync(clientAssetsDir, { recursive: true })
    .map(String)
    .filter((name) => pattern.test(name))
    .sort()
    .map((name) => path.join(clientAssetsDir, name));
}

/** The text of every built file matching pattern, joined. */
export const clientAssetText = (pattern) => clientAssetFiles(pattern).map((file) => fs.readFileSync(file, "utf8")).join("\n");
