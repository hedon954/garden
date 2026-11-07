import { COMPOSE_INTENT } from "../compose/examples.mjs";
import { CATALOG } from "./catalog.mjs";
export function guidanceFence(name="compose") {
  if(name&&name!=="compose")throw new Error("文章组件只使用 garden compose。");
  return "```garden compose\n"+COMPOSE_INTENT+"\n```";
}
export function vscodeSnippets() {
  return {
    "Garden Compose":{prefix:["garden","gcompose"],body:guidanceFence().split("\n"),description:CATALOG.compose.when},
    "Garden 代码与对比":{prefix:"gdiff",body:["```${1:lang}","$0","```","","```diff","","```"],description:"完整代码，紧跟 diff。"},
  };
}
export function gardenBlocksMarkdown() {
  return ["# Garden Compose", "", CATALOG.compose.when,"",guidanceFence(),"",CATALOG.compose.example, ""].join("\n");
}
function xmlEscape(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
export function textReplacementPlist(){return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><array><dict><key>phrase</key><string>'+xmlEscape(guidanceFence())+'</string><key>shortcut</key><string>;gcompose</string></dict></array></plist>\n';}
const preview="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="72" height="48" viewBox="0 0 72 48"><rect x="8" y="8" width="56" height="32" rx="4" fill="none" stroke="currentColor"/><path d="M16 18h40M16 26h26" stroke="currentColor"/></svg>');
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** HTML for one slash-menu row: a thumbnail plus the label. */
export function suggestHtml(item) {
  return `<span class="garden-suggest"><img class="garden-suggest-thumb" alt="" width="72" height="48" src="${item.preview}"><span class="garden-suggest-label">${escapeHtml(item.label)}</span></span>`;
}

const SLASH_COMMAND = "garden";

/**
 * Two steps of the Typora `/` menu. A strict prefix of `garden` (including `/`
 * alone) is the command hint. `/garden` itself is the component picker.
 */
export function slashQuery(textBefore) {
  const none = { phase: "none", query: "", replaceLength: 0, lead: "" };
  const component = /(^|[\r\n]|[^\S\r\n])\/garden(?=$|[ \t])(?:[ \t]+(\S*))?$/u.exec(textBefore);
  if (component) {
    const boundary = component[1];
    const start = component.index + boundary.length;
    return {
      phase: "components",
      query: component[2] ?? "",
      replaceLength: textBefore.length - start,
      lead: boundary === "" || boundary === "\n" || boundary === "\r" ? "" : "\n",
    };
  }
  const slash = /(^|[\r\n]|[^\S\r\n])\/(\S*)$/u.exec(textBefore);
  if (!slash) return none;
  const typed = slash[2];
  const folded = typed.toLowerCase();
  if (folded !== SLASH_COMMAND && SLASH_COMMAND.startsWith(folded)) {
    return { phase: "command", query: typed, replaceLength: 1 + typed.length, lead: "" };
  }
  return none;
}

export function pickerItems(){return [{name:"compose",label:"Compose",body:guidanceFence(),preview,when:CATALOG.compose.when,whenNot:CATALOG.compose.whenNot}];}
