/** Shared author-content syntax. HTML is article content, never an executable widget. */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { markdownSyntaxPlugins } from './markdown-syntax.mjs';

export const ARTICLE_TAGS = new Set('a abbr b blockquote br caption cite code col colgroup dd del details div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img input kbd li mark ol p pre q s samp section small span strong sub summary sup table tbody td th thead tr u ul var'.split(' '));
const ATTRS = new Set('alt checked className colSpan datetime disabled height href id lang open reversed role rowSpan scope src start style target title type width'.split(' '));
const CSS = new Set('align-items align-self background background-color border border-bottom border-color border-left border-radius border-right border-style border-top border-width box-sizing color column-gap display flex flex-basis flex-direction flex-grow flex-shrink flex-wrap font-family font-size font-style font-weight gap grid-column grid-template-columns height justify-content letter-spacing line-height margin margin-bottom margin-left margin-right margin-top max-height max-width min-height min-width opacity overflow overflow-wrap overflow-x overflow-y padding padding-bottom padding-left padding-right padding-top row-gap text-align text-decoration text-decoration-color text-decoration-line text-decoration-style text-indent vertical-align white-space width word-break'.split(' '));
export class ArticleContentError extends Error {
  constructor(message) { super(message); this.name = 'ArticleContentError'; this.code = 'compose-content'; }
}
const fail = message => { throw new ArticleContentError(message); };
export function articleUrl(value, image = false) {
  const url = String(value).trim();
  if (/[\u0000-\u0020\u007f\\]/u.test(url)) fail('内容 URL 不能包含空白、控制字符或反斜线。');
  if (url.startsWith('//') || /^[a-z][a-z0-9+.-]*:/iu.test(url) && !/^https?:/iu.test(url) && !( !image && /^(?:mailto|tel):/iu.test(url))) fail('内容 URL 只支持 http(s)、相对路径、锚点，以及链接的 mailto/tel；不支持脚本或 data URL。');
  return url;
}
function contentStyle(value) {
  // This module is imported by browser renderers. Do not import Node/PostCSS here.
  // Parse a declaration list, respecting quoted strings and nested value functions.
  if (/[{}<>@\\]|\/\*|\*\//u.test(value)) fail('内容 style 不能包含规则、注释、转义或外部资源。');
  const declarations = [];
  let part = '', quote = '', depth = 0;
  for (const char of value) {
    if (quote) { if (char === quote) quote = ''; part += char; continue; }
    if (char === '"' || char === "'") { quote = char; part += char; continue; }
    if (char === '(') depth++;
    if (char === ')' && --depth < 0) fail('内容 style 的括号不匹配。');
    if (char === ';' && depth === 0) { declarations.push(part); part = ''; }
    else part += char;
  }
  if (quote || depth) fail('内容 style 的引号或括号不匹配。');
  declarations.push(part);
  const functions = new Set(['rgb','rgba','hsl','hsla','oklch','oklab','lab','lch','color','color-mix','var','calc','min','max','clamp','repeat','minmax','fit-content']);
  for (const declaration of declarations) {
    if (!declaration.trim()) continue;
    const colon = declaration.indexOf(':');
    if (colon < 1) fail('内容 style 必须使用 property: value 声明。');
    const name = declaration.slice(0, colon).trim().toLowerCase();
    const cssValue = declaration.slice(colon + 1).trim();
    if (!CSS.has(name) || !cssValue || cssValue.includes('!')) fail(`内容 style 不支持 ${name}；只允许排版、颜色、边框和尺寸声明，不能使用 !important。`);
    if ([...cssValue.matchAll(/([a-z-]+)\s*\(/giu)].some(match => !functions.has(match[1].toLowerCase()))) fail('内容 style 使用了不支持的 CSS 函数（不允许 url、image-set 或脚本表达式）。');
    if (/(?:javascript|vbscript)\s*:/iu.test(cssValue)) fail('内容 style 不支持脚本 URL。');
  }
  return value;
}

function validateTree(tree) {
  const visit = node => {
    if (node.type === 'element') {
      if (!ARTICLE_TAGS.has(node.tagName)) fail(`内容不支持 <${node.tagName}>；脚本、iframe、style 和自定义组件不能放入 Markdown/HTML 内容岛。`);
      for (const [key, value] of Object.entries(node.properties ?? {})) {
        if (!ATTRS.has(key) && !/^aria[A-Z]/u.test(key)) fail(`内容 <${node.tagName}> 不支持属性 ${key}（事件处理器及任意 data 属性不可用）。`);
        if (key === 'href' || key === 'src') articleUrl(value, key === 'src');
        if (key === 'style') contentStyle(String(value));
        if (key === 'target' && !['_blank', '_self'].includes(String(value))) fail('内容链接 target 只能是 _blank 或 _self。');
      }
      if (node.tagName === 'input' && !(node.properties.type === 'checkbox' && node.properties.disabled === true)) fail('内容 input 只支持禁用的任务列表 checkbox；交互请使用 Compose 控件。');
      if (node.properties?.target === '_blank') node.properties.rel = ['noopener', 'noreferrer'];
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
}
const markdown = unified().use(remarkParse);
for (const plugin of markdownSyntaxPlugins) Array.isArray(plugin) ? markdown.use(...plugin) : markdown.use(plugin);
markdown.freeze();
/** Reuse the article syntax extensions alongside the Play MDX expression extensions. */
export function articleParseExtensions() {
  return { extensions: markdown.data('micromarkExtensions') ?? [], mdastExtensions: markdown.data('fromMarkdownExtensions') ?? [] };
}
const html = markdown().use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(() => validateTree).use(rehypeStringify);
export function renderArticleContent(source, { inline = false } = {}) {
  const text = String(source ?? '');
  if (!inline) return html.stringify(html.runSync(html.parse(text)));
  // A text/title leaf is an inline context: leading '*' or '#' is not a list/heading.
  let marker = '\u2060';
  while (text.includes(marker)) marker += '\u2060';
  const input = text.split('\n').map(line => line.trim() ? marker + line : line).join('\n');
  const tree = html.runSync(html.parse(input));
  const output = tree => html.stringify(tree).replaceAll(marker, '');
  const children = tree.children.filter(node => node.type !== 'text' || node.value.trim());
  // Existing leaf strings may contain blank lines. Preserve their historical inline breaks.
  if (children.every(node => node.type === 'element' && node.tagName === 'p')) return children.map(node => output({ type: 'root', children: node.children })).join('<br><br>');
  if (children.every(node => node.type === 'element' && ['u','span','b','i','strong','em','del','s','code','kbd','mark','sub','sup','small','abbr','cite','q','a','br'].includes(node.tagName) || node.type === 'text')) return output(tree);
  fail('此处需要行内内容；列表、表格、标题和代码块请放入 <markdown> 或 <html> 内容岛。');
}

export function articleContentText(source) {
  const tree = html.runSync(html.parse(String(source ?? '')));
  const text = node => node.type === 'text' ? node.value : (node.children ?? []).map(text).join(node.type === 'element' && ['p','li','tr','div','h1','h2','h3','h4','h5','h6'].includes(node.tagName) ? ' ' : '');
  return text(tree).replace(/\s+/gu, ' ').trim();
}
