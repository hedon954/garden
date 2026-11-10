import fs from 'node:fs';
import path from 'node:path';
export const titleCases = {
 short:'Reading notes',
 medium:'读书记录｜设计更易理解的数字产品',
 long:'读书记录｜一本关于设计研究与团队协作以及持续改进方法的完整中性测试标题',
 english:'Understanding research and collaborative design',
 word:'PneumonoultramicroscopicsilicovolcanoconiosisRepeatedWithoutAnySpaces',
 punctuation:'《》：「」『』，。！？；：（）【】《》：「」『』，。！？；：（）【】',
};
export function writeFeatureTitleFixture(site){
 fs.mkdirSync(path.join(site,'content/posts'),{recursive:true});
 fs.mkdirSync(path.join(site,'public'),{recursive:true});
 const template=fs.readFileSync(new URL('../templates/site/site.config.en.yaml',import.meta.url),'utf8');
 fs.writeFileSync(path.join(site,'site.config.yaml'),template.replace(/^name:.*$/m,'name: Neutral title fit regression'));
 fs.copyFileSync(new URL('../node_modules/katex/dist/fonts/KaTeX_Typewriter-Regular.woff2',import.meta.url),path.join(site,'public/feature-test-font.woff2'));
 fs.writeFileSync(path.join(site,'public/title-cover.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#d1d5db"/><path d="M0 210h640M320 0v420" stroke="#64748b"/><text x="24" y="48" font-family="sans-serif" font-size="24">Neutral cover 640 × 420</text></svg>');
 fs.writeFileSync(path.join(site,'content/posts/title-fixture.md'),`---\ntitle: ${titleCases.medium}\ndate: 2026-01-01\ndescription: Neutral summary stays readable beneath the complete heading.\ncover: /title-cover.svg\ntags: [test]\n---\n\nThis is neutral test content, not an author manuscript.\n`);
}
