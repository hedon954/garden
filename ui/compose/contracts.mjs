import {ARTICLE_TAGS,ARTICLE_ATTRIBUTES,ARTICLE_CSS_PROPERTIES} from '../garden/article-content.mjs';
import {CATALOG_TAGS} from './markup.mjs';
import {FEATURE_FIELDS,FEATURE_TAGS,FEATURE_PARTS} from './features.mjs';
import {AUTHOR_PLAY_TAGS} from './dil.mjs';
import {COMPONENTS} from '../core/catalog.mjs';
import {ICON_NAMES} from './icons.mjs';
/** Demand-loaded schema; parser/compiler catalogs remain the source of truth. */
export function composeSchema(){return {
 entry:'garden compose',
 static:{tags:CATALOG_TAGS,propertyPolicy:'Use the normalized parse tree: some layout attributes are ignored unless implemented. Unknown tags and icon names fail.'},
 semantic:Object.fromEntries(Object.entries(FEATURE_FIELDS).map(([tag,fields])=>[tag,{kind:FEATURE_TAGS.has(tag)?'scene':FEATURE_PARTS.has(tag)?'part':'unknown',properties:fields.filter(p=>p!=='resolved'),unknownProperties:'error'}])),
 play:Object.fromEntries(Object.entries(AUTHOR_PLAY_TAGS).map(([tag,name])=>[tag,{summary:COMPONENTS[name]?.summary,properties:COMPONENTS[name]?.props??{},children:Array.isArray(COMPONENTS[name]?.children)?COMPONENTS[name].children.map(n=>Object.entries(AUTHOR_PLAY_TAGS).find(([,target])=>target===n)?.[0]??n):COMPONENTS[name]?.children}])),
 typography:{body:'Inherit actual article family and size; no universal pixel baseline.',textSize:{sm:0.875,lg:1.125,xl:1.25},semantic:'Graph labels, metric values, captions and controls keep their own hierarchy; inspect the complete theme.'},
 content:{htmlTags:[...ARTICLE_TAGS],htmlAttributes:[...ARTICLE_ATTRIBUTES],cssProperties:[...ARTICLE_CSS_PROPERTIES],islands:['markdown','html'],inline:'Shared article Markdown and safe HTML; no executable content or interpolation inside islands.',execution:'sandbox: isolated offline iframe with explicit HTML/CSS/JS literals'},
 icons:ICON_NAMES,
};}
