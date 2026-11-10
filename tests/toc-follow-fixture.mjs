import fs from "node:fs";
import path from "node:path";
export function writeTocFollowFixture(site) {
 fs.mkdirSync(path.join(site,"content/posts"),{recursive:true});
 const config=fs.readFileSync(new URL("../templates/site/site.config.en.yaml",import.meta.url),"utf8");
 fs.writeFileSync(path.join(site,"site.config.yaml"),config.replace(/^name:.*$/m,"name: Garden contents fixture"));
 const paragraph="Neutral reading material for the contents navigation fixture. A reader can move between chapters while the contents follows the current location. Complete headings and comfortable touch targets remain available. This is not an author manuscript.";
 const body=(n=6)=>Array.from({length:n},()=>paragraph).join("\n\n");
 const sections=[[2,"Chapter A"],[3,"Detail A1"],[4,"Deep A1"],[4,"Deep A2｜包含中英文的长标题，用于检查目录换行、层级缩进与点击区域"],[3,"Detail A2"],[2,"Chapter B"],[4,"Detail B1"],[5,"Deeper B1"],[4,"Detail B2"],[2,"Chapter C"],[3,"Detail C1"],[2,"Summary"]];
 const text="---\ntitle: Contents reading fixture\ndate: 2026-01-01\ndescription: Neutral hierarchical navigation test.\n---\n\n"+body(8)+"\n\n"+sections.map(([rank,title])=>"#".repeat(rank)+" "+title+"\n\n"+body()).join("\n\n");
 fs.writeFileSync(path.join(site,"content/posts/toc-fixture.md"),text);
}
