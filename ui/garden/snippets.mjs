import { COMPOSE_INTENT } from "../compose/examples.mjs";
import { CATALOG } from "./catalog.mjs";
import { DIAGRAM_RECIPES, filterPickerItems, pickerSelectionResult, composeFenceOpen, COMPOSE_FENCE_NAME } from "./diagram-recipes.mjs";
export { filterPickerItems, pickerSelectionResult, DIAGRAM_RECIPES, composeFenceOpen, COMPOSE_FENCE_NAME };
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
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** HTML for one slash-menu row: schematic, graphic type, and when an author would use it. */
export function suggestHtml(item) {
  const hint = item.hint ? `<span class="garden-suggest-hint">${escapeHtml(item.hint)}</span>` : "";
  return `<span class="garden-suggest"><img class="garden-suggest-thumb" alt="" width="72" height="48" src="${item.preview}"><span class="garden-suggest-copy"><span class="garden-suggest-label">${escapeHtml(item.label)}</span>${hint}</span></span>`;
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

export function pickerItems(){return DIAGRAM_RECIPES.map((item)=>({...item}));}
