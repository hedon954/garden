import fs from'node:fs';import path from'node:path';import postcss from'postcss';
/** Keep article/native styles in editor fences, never style the editor's own document. */
export function editorPreviewCss(root){
 const read=f=>fs.readFileSync(path.join(root,f),'utf8');
 const tokens=postcss.parse(read('app/styles/tokens.css'));
 tokens.walkRules(rule=>{rule.selectors=rule.selectors.map(s=>s.replace(/:root/gu,'.garden-ui-preview'));});
 tokens.walkDecls("--fs-body",decl=>decl.remove());
 const article=postcss.parse(read('app/styles/a2.css'));
 article.walkRules(rule=>{
  if(rule.parent.type==='atrule'&&/keyframes$/u.test(rule.parent.name))return;
  rule.selectors=rule.selectors.map(selector=>`.garden-ui-preview ${selector}`);
 });
 return [read('ui/react/ui.css'),read('ui/compose/compose.css'),tokens.toString(),article.toString(),'.garden-ui-preview {font:inherit}.garden-ui-preview .markdown-body {font:inherit}'].join('\n');
}
