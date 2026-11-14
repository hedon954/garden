import fs from "node:fs";
import path from "node:path";

export function parseGeneratedPosts(generated) {
  return JSON.parse(generated.match(/export const posts = ([\s\S]*?) as ContentEntry\[\];/u)[1]);
}

export function parsePostBodies(source) {
  return JSON.parse(source.match(/export const postBodies = ([\s\S]*?) as Record<string, string>;/u)[1]);
}

export function postBodyFromSite(site, slug) {
  const generated = fs.readFileSync(path.join(site, ".garden", "generated-content.ts"), "utf8");
  const bodies = fs.readFileSync(path.join(site, ".garden", "generated-post-bodies.ts"), "utf8");
  const posts = parseGeneratedPosts(generated);
  const map = parsePostBodies(bodies);
  const entry = posts.find((post) => post.slug === slug);
  if (!entry) throw new Error(`no post ${slug}`);
  return map[entry.path];
}
