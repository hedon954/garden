import { parseCompose } from "../compose/parse.mjs";
import { looksLikePlayCompose, parsePlayCompose } from "../compose/dil.mjs";

const FENCE_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/u;

/** Fences in document order. Line numbers are 1-based in `markdown`. */
export function scanFences(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/u);
  const fences = [];
  let open = null;
  lines.forEach((line, index) => {
    const match = FENCE_RE.exec(line);
    if (open) {
      const closer = match
        && match[2][0] === open.marker[0]
        && match[2].length >= open.marker.length
        && !match[3].trim()
        && match[1].length <= open.indent;
      if (closer) {
        fences.push({
          indent: open.indent,
          marker: open.marker,
          info: open.info,
          lang: open.lang,
          meta: open.meta,
          line: open.line,
          endLine: index + 1,
          body: open.body.join("\n"),
        });
        open = null;
      } else {
        open.body.push(line);
      }
      return;
    }
    if (!match) return;
    const info = match[3].trim();
    const lang = info.split(/\s+/u)[0] ?? "";
    open = {
      indent: match[1].length,
      marker: match[2],
      info,
      lang: lang.toLowerCase(),
      meta: info.slice(lang.length).trim(),
      line: index + 1,
      body: [],
    };
  });
  if (open) {
    fences.push({ ...open, endLine: lines.length, body: open.body.join("\n"), unclosed: true });
  }
  return fences;
}

export const isGardenLang = lang => lang === "garden";
export function parseGardenInfo(info) {
  const raw=String(info??"").trim();
  if(!/^garden(?:\s|$)/iu.test(raw))return null;
  const rest=raw.slice(6).trim();
  const match=/^([a-z][\w-]*)(?:\s+#([\w-]+))?$/iu.exec(rest);
  return {name:match?.[1]?.toLowerCase()??rest,id:match?.[2]??null,bad:!match};
}

function composeBlock(header, body) {
  if (looksLikePlayCompose(body)) return parsePlayCompose(header, body);
  const result = parseCompose(body);
  const block = {
    name: "compose",
    mode: "diagram",
    props: result.doc ?? {},
    children: "",
    id: header.id,
    idea: result.uncompiled ? String(body ?? "").trim() : result.doc?.intent ?? "",
  };
  if (!result.ok) return { ...block, error: result.error };
  return block;
}

export function parseGardenBlock(info,body) {
  const header=parseGardenInfo(info);
  if(!header)return null;
  if(header.bad||header.name!=="compose")return {name:header.name||"compose",props:{},error:{code:"garden-name",message:"文章组件只使用 garden compose。"}};
  return composeBlock(header,body);
}
export function fenceInfo(fence) {
  if(!fence)return "";
  return fence.info||fence.lang;
}
export function classifyFence(fence) {
  if(isGardenLang(fence.lang))return {kind:"garden",block:parseGardenBlock(fenceInfo(fence),fence.body),fence};
  if(fence.lang==="diff")return {kind:"diff",fence};
  if(fence.lang==="mermaid")return {kind:"mermaid",fence};
  return {kind:"code",fence};
}
export function isFullCodeFence(fence) {
  const record=fence?.fence??fence;
  return Boolean(record)&&(!fence.kind||fence.kind==="code")&&!["mermaid","diff","html"].includes(record.lang)&&!isGardenLang(record.lang);
}

export function blanksBetween(markdown, fromLine, toLine) {
  const lines = String(markdown).split(/\r?\n/u);
  for (let line = fromLine; line < toLine - 1; line += 1) {
    if (lines[line]?.trim()) return false;
  }
  return true;
}
