// Node-only catalog enrichment. Never import this module from the browser renderer.
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
const SOURCES=['ui/react/ui.css','ui/compose/compose.css','app/globals.css','app/styles/tokens.css','app/styles/a2.css','app/styles/shell.css'];
const PROPERTIES=new Set('font font-family font-size font-weight font-style line-height text-align display flex flex-basis flex-shrink flex-grow flex-wrap flex-direction align-items align-self justify-content width min-width max-width gap row-gap column-gap padding padding-top padding-bottom margin margin-top margin-bottom'.split(' '));
/** Source declarations, not computed styles: ancestry, site configuration and theme still matter. */
export function composeStyleReference(packageRoot){
 const rules=[];
 for(const source of SOURCES){
  const file=path.join(packageRoot,source);
  const css=postcss.parse(fs.readFileSync(file,'utf8'),{from:file});
  css.walkRules(rule=>{
   const relevant=/(?:\.g-compose|\.garden-ui|\.g-(?:stat|cmp|verdict|choice|list|rel|tl|entity|file)|\.markdown-body|\.prose)/u.test(rule.selector);
   const declarations=rule.nodes.filter(n=>n.type==='decl'&&(relevant&&PROPERTIES.has(n.prop)||/^--(?:fs-|sans$|mono$|serif$)/u.test(n.prop))).map(({prop,value,important})=>({property:prop,value,important:Boolean(important)}));
   if(!declarations.length)return;
   const context=[];for(let parent=rule.parent;parent;parent=parent.parent)if(parent.type==='atrule')context.unshift({name:parent.name,params:parent.params});
   rules.push({source,line:rule.source.start.line,selector:rule.selector,context,declarations});
  });
 }
 return {kind:'source-declarations-not-computed',context:'Installed engine stylesheet declarations in import/theme order. Actual article configuration, DOM ancestry and site CSS can override these; inspect complete-theme computed styles.',cascadeOrder:SOURCES,rules};
}
