import fs from "node:fs";
import path from "node:path";
import { writeRenderingFixture } from "./rendering-fixture.mjs";

export function writeReadingNavigationFixture(site) {
  const post = writeRenderingFixture(site);
  const config = path.join(site, "site.config.yaml");
  fs.writeFileSync(config, fs.readFileSync(config, "utf8").replace(/^name:.*$/m, "name: Garden"));
  fs.appendFileSync(post, "\n\n" + Array.from({ length: 32 }, (_, index) => {
    const section = String(index + 1).padStart(2, "0");
    return `## Reading section ${section}\n\n` + Array.from({ length: 5 }, () =>
      `Neutral long-reading test paragraph for section ${section}. The contents entry must remain available while reading, without floating over these words. This is test material, not a private article.`
    ).join("\n\n") + `\n\n### Detail ${section}\n\nNeutral subsection text for navigation and keyboard focus testing.\n`;
  }).join("\n\n"));
  return post;
}
