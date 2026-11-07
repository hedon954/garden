import {composeMarkdown} from "../compose/distribution.mjs";
import {stripCardMarkers} from "../garden/markdown-links.mjs";
import {parseUiBody} from "./parse.mjs";
import {compileUiBlock,readPayload} from "./compile.mjs";
import {findBlocks,scanFences} from "./fence.mjs";
import {gardenInfoId} from "./garden-fence.mjs";
import {renderStatic} from "./static.mjs";
import {composeText,parseCompose,renderCompose} from "../compose/index.mjs";
import {looksLikePlayCompose,parsePlayCompose} from "../compose/dil.mjs";
import {fileFeedMarkdown} from "../garden/file-block.mjs";
import {renderArticleContent} from "../garden/article-content.mjs";

/** Build-only serialization, consumed by the existing article component host. */
const element = block => `<garden-block data-payload="${encodeURIComponent(JSON.stringify(block))}"></garden-block>`;
function compiledCompose(fence,options={}) {
  const block=parsePlayCompose({id:gardenInfoId(fence.info)},fence.body);
  if(block.error)return {payload:null,check:{header:block.props,diagnostics:[{...block.error,line:fence.startLine??1,severity:"error"}]}};
  return compileUiBlock(block.uiSource,options);
}
export function transformUiContent(markdown,options={}) {
  const {mode="publish",lineOffset=0,...compileOptions}=options;
  const errors=[];let content=markdown;
  for(const fence of [...findBlocks(markdown)].reverse()) {
    if(!looksLikePlayCompose(fence.body)) {
      const parsed=parseCompose(fence.body);
      if(!parsed.ok&&mode==="publish")errors.push({code:parsed.error?.code??"compose-uncompiled",line:fence.startLine+lineOffset,message:parsed.error?.message??"Compose 原话尚未编译",severity:"error"});
      continue;
    }
    const {payload,check}=compiledCompose(fence,compileOptions);
    const diagnostics=check.diagnostics.filter(d=>d.severity==="error").map(d=>({...d,line:fence.startLine+lineOffset}));
    if(!payload&&mode==="publish"){errors.push(...diagnostics);continue;}
    const block=payload?{name:"compose",mode:"play",props:{caption:payload.caption},payload}:{name:"compose",error:{code:"compose-invalid",message:diagnostics.map(d=>d.message).join("；")},props:{}};
    content=content.slice(0,fence.start)+element(block)+content.slice(fence.end);
  }
  return {content,errors:errors.sort((a,b)=>a.line-b.line)};
}

function replaceFences(content, replacer) {
  let output = content;
  for (const fence of [...scanFences(content)].reverse()) {
    const replacement = replacer(fence);
    if (replacement === undefined) continue;
    output = `${output.slice(0, fence.start)}${replacement}${output.slice(fence.end)}`;
  }
  return output;
}

const escapeHtml = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Text a reader can select inside an inlined Excalidraw SVG; path data and fonts stay out of search. */
function excalidrawVisibleText(svg) {
  const parts = [];
  for (const match of svg.matchAll(/<(?:text|title)\b[^>]*>([^<]*)<\/(?:text|title)>/giu)) parts.push(match[1]);
  return parts.join(" ");
}

function readCompose(fence) {
  if(fence.lang!=="garden"||!/^compose(?:\s|$)/iu.test(fence.info))return null;
  if(looksLikePlayCompose(fence.body)){const result=compiledCompose(fence,{skipData:true});return {play:true,...result};}
  return parseCompose(fence.body);
}
function replaceElements(content,visit) {
  return String(content).replace(/<garden-block data-payload="([^"]+)">([\s\S]*?)<\/garden-block>/gu,(raw,encoded,fallback)=>{
    try {const block=JSON.parse(decodeURIComponent(encoded));return visit(block,fallback)??raw;}catch{return raw;}
  });
}
function readableHtml(html,{siteUrl=""}={}) {
  return replaceElements(html,(block,fallback)=>{
    if(block.composeFeature&&block.name==="file")return renderArticleContent(fileFeedMarkdown(block.props,{siteUrl}));
    if(block.composeFeature)return fallback;
    return undefined;
  });
}
export function contentToSearchText(content) {
  const source=replaceElements(content,block=>{const p=block.payload?readPayload(JSON.stringify(block.payload)):null;return p?` ${p.caption} ${renderStatic(p,"text")} `:undefined;});
  const withoutDiagramMarkup=String(source).replace(/<svg\b[^>]*class="[^"]*\bexcalidraw\b[^"]*"[\s\S]*?<\/svg>/giu,svg=>` ${excalidrawVisibleText(svg)} `);
  return replaceFences(stripCardMarkers(withoutDiagramMarkup),fence=>{const c=readCompose(fence);return c?c.play?(c.payload?` ${c.payload.caption} ${renderStatic(c.payload,"text")} `:" "):c.ok?` ${composeText(c.doc)} `:" ":undefined;});
}
export function contentForFeed(content,{pageUrl="",siteUrl=""}={}) {
  const snapshot=p=>`<figure>${readableHtml(renderStatic(p,"html"),{siteUrl})}<figcaption>${escapeHtml(p.caption)}${pageUrl?` · <a href="${escapeHtml(pageUrl+"#ui-"+p.id)}">在网页中交互</a>`:""}</figcaption></figure>`;
  const source=replaceElements(content,(block,fallback)=>{const p=block.payload?readPayload(JSON.stringify(block.payload)):null;return p?snapshot(p):block.composeFeature?readableHtml(element(block).replace("</garden-block>",fallback+"</garden-block>"),{siteUrl}):undefined;});
  return replaceFences(stripCardMarkers(source),fence=>{const c=readCompose(fence);return c?c.play?(c.payload?snapshot(c.payload):""):c.ok?readableHtml(renderCompose(c.doc,{scope:`feed${fence.startLine}`}),{siteUrl}):"":undefined;});
}
export function contentForDistribution(content,{pageUrl="",siteUrl=""}={}) {
  const snapshot=p=>`${renderStatic(p,"markdown",{siteUrl})}\n\n*${p.caption}*${pageUrl?`\n\n[在原文中交互](${pageUrl}#ui-${p.id})`:""}`;
  const source=replaceElements(content,block=>{const p=block.payload?readPayload(JSON.stringify(block.payload)):null;return p?snapshot(p):block.composeFeature&&block.name==="file"?fileFeedMarkdown(block.props,{siteUrl}):undefined;});
  return replaceFences(stripCardMarkers(source),fence=>{const c=readCompose(fence);return c?c.play?(c.payload?snapshot(c.payload):""):c.ok?composeMarkdown(c.doc,{siteUrl}):"":undefined;});
}
export function collectDataSources(markdown) {
  const sources=new Set();
  for(const block of findBlocks(markdown)) {
    if(!looksLikePlayCompose(block.body))continue;
    const parsed=parsePlayCompose({id:gardenInfoId(block.info)},block.body);
    const tree=parseUiBody(parsed.uiSource??"").root;
    const walk=nodes=>nodes?.forEach(node=>{if(node.t==="el"&&node.n==="Data"&&node.p?.src?.k==="lit"&&typeof node.p.src.v==="string")sources.add(node.p.src.v);walk(node.c);});
    walk(tree?.c);
  }
  return [...sources];
}
