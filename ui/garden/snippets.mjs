import { COMPOSE_INTENT } from "../compose/examples.mjs";
import { CATALOG, IDEA, offeredGardenNames } from "./catalog.mjs";

function fenceLines(example) {
  return example.replace(/\\`/gu, "`").split("\n");
}

function snippetBody(example) {
  const lines = fenceLines(example);
  const cursorAt = lines.findIndex((line) => line.includes("让读者"));
  if (cursorAt === -1) return [...lines.slice(0, -1), "$0", lines.at(-1)];
  return lines.map((line, index) => (index === cursorAt ? line.replace("让读者……；想让读者看出……", "${1:让读者……；想让读者看出……}") : line));
}

export function vscodeSnippets() {
  const snippets = {
    "Garden 块": {
      prefix: "garden",
      body: [`\`\`\`garden \${1|${["idea", ...offeredGardenNames()].join(",")}|}`, "$0", "```"],
      description: `选择 Garden 块：想法 / ${offeredGardenNames().join(" / ")}`,
    },
  };
  for (const trigger of IDEA.triggers) {
    snippets[`Garden ${IDEA.label} ${trigger}`] = {
      prefix: trigger,
      body: snippetBody(IDEA.example),
      description: IDEA.when,
    };
  }
  for (const name of offeredGardenNames()) {
    const spec = CATALOG[name];
    for (const trigger of spec.triggers) {
      snippets[`Garden ${spec.label} ${trigger}`] = {
        prefix: trigger,
        body: name === "compose" ? fenceLines(guidanceFence(name)) : fenceLines(spec.example),
        description: `${spec.when} 不该用：${spec.whenNot}`,
      };
    }
  }
  snippets["Garden 代码与对比"] = {
    prefix: "gdiff",
    body: ["```${1:lang}", "$0", "```", "", "```diff", "", "```"],
    description: "完整代码块，紧跟它的 diff。站点收成「代码 / 对比上一版」。",
  };
  return snippets;
}

export function gardenBlocksMarkdown() {
  const sections = [
    ["想法", IDEA],
    ...offeredGardenNames().map((name) => [name, CATALOG[name]]),
  ];
  return [
    "# Garden 块模板",
    "",
    "从这里复制。触发词和 VS Code 片段、macOS 文本替换是同一份目录生成的。",
    "",
    ...sections.flatMap(([name, spec]) => [
      `## ${name === "想法" ? "想法" : name} · ${spec.label}`,
      "",
      spec.when,
      "",
      `不该用：${spec.whenNot}`,
      "",
      spec.example,
      "",
    ]),
  ].join("\n");
}

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function textReplacementPlist() {
  const items = [
    ...IDEA.triggers.map((trigger) => ({ shortcut: `;${trigger}`, phrase: IDEA.example })),
    ...offeredGardenNames().flatMap((name) => CATALOG[name].triggers.map((trigger) => ({
      shortcut: `;${trigger}`,
      phrase: name === "compose" ? guidanceFence(name) : CATALOG[name].example,
    }))),
  ];
  const dicts = items.map((item) => `  <dict>
    <key>phrase</key>
    <string>${xmlEscape(item.phrase)}</string>
    <key>shortcut</key>
    <string>${xmlEscape(item.shortcut)}</string>
  </dict>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
${dicts.join("\n")}
</array>
</plist>
`;
}

/** Facts the author should mention. Insert paths turn these into a bare `garden` brief, not YAML. */
const GUIDANCE_FACTS = {
  card: "链接、标题、一句说明",
  stat: "指标名、数字、单位，需要时写来源",
  compare: "两三件东西的名字，以及每件一句差别",
  timeline: "每条的日期、标题和一句说明",
  chart: "图表类型、横轴、几组已经算好的数字、单位",
  compose: "想让读者看清的流程，以及每一步点开后要读到的说明",
  html: "同名目录里的 HTML 文件，以及这张图要表达的意思",
  interactive: "读者能拧的参数，以及拧的时候想让他看出什么",
  file: "文件路径，和一句说明里面有什么",
  relations: "三到六个要素的名字，以及谁影响谁",
  list: "每条做法或信号的一句话",
  choice: "两三个选项，每个有一个醒目的数字和一句说明",
};

function ideaFence(text) {
  return `\`\`\`garden\n${text}\n\`\`\``;
}

/** The block an insert command pastes. Named components stay an uncompiled idea, except compose, which keeps its fence type. */
export function guidanceFence(name) {
  if (!name) return IDEA.example;
  if (name === "compose") return `\`\`\`garden compose\n${COMPOSE_INTENT}\n\`\`\``;
  const spec = CATALOG[name];
  return ideaFence(`做成${spec.label}。${spec.when}请写上${GUIDANCE_FACTS[name]}。`);
}

function svgThumb(inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="48" viewBox="0 0 72 48"><rect width="72" height="48" rx="6" fill="#f6f3ec"/>${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PREVIEWS = {
  idea: svgThumb(`<path d="M14 16h28M14 24h22M14 32h16" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/><circle cx="54" cy="24" r="8" fill="none" stroke="#c4552a" stroke-width="2"/>`),
  card: svgThumb(`<rect x="8" y="8" width="56" height="32" rx="4" fill="#fff" stroke="#d9d3c7"/><rect x="12" y="12" width="16" height="16" rx="2" fill="#c4552a"/><path d="M34 16h24M34 22h18M34 30h22" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>`),
  stat: svgThumb(`<text x="10" y="32" fill="#c4552a" font-family="ui-sans-serif,sans-serif" font-size="20" font-weight="700">3.2</text><path d="M46 30h14" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>`),
  compare: svgThumb(`<rect x="8" y="10" width="24" height="28" rx="3" fill="#fff" stroke="#d9d3c7"/><rect x="40" y="10" width="24" height="28" rx="3" fill="#fff" stroke="#c4552a"/><path d="M12 18h16M12 24h12M44 18h16M44 24h12" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>`),
  timeline: svgThumb(`<path d="M20 8v32" stroke="#d9d3c7" stroke-width="2"/><circle cx="20" cy="14" r="3" fill="#c4552a"/><circle cx="20" cy="24" r="3" fill="#2b2926"/><circle cx="20" cy="34" r="3" fill="#2b2926"/><path d="M30 14h24M30 24h18M30 34h20" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>`),
  chart: svgThumb(`<path d="M10 38h52" stroke="#d9d3c7" stroke-width="2"/><rect x="16" y="22" width="8" height="16" fill="#2b2926"/><rect x="32" y="12" width="8" height="26" fill="#c4552a"/><rect x="48" y="18" width="8" height="20" fill="#2b2926"/>`),
  compose: svgThumb(`<rect x="16" y="6" width="40" height="10" rx="3" fill="#fff" stroke="#2b2926"/><path d="M36 16v5M32 18l4 4 4-4" fill="none" stroke="#c4552a" stroke-width="1.5" stroke-linecap="round"/><rect x="16" y="23" width="40" height="10" rx="3" fill="#fff" stroke="#2b2926"/><path d="M36 33v4" stroke="#c4552a" stroke-width="1.5"/>`),
  html: svgThumb(`<path d="M18 16l-8 8 8 8M54 16l8 8-8 8" fill="none" stroke="#c4552a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 14l8 20" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>`),
  interactive: svgThumb(`<path d="M12 24h48" stroke="#d9d3c7" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="24" r="6" fill="#c4552a"/>`),
  file: svgThumb(`<path d="M22 8h18l10 10v22a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" fill="#fff" stroke="#2b2926"/><path d="M40 8v10h10" fill="none" stroke="#c4552a" stroke-width="2"/>`),
  relations: svgThumb(`<circle cx="20" cy="16" r="5" fill="#c4552a"/><circle cx="52" cy="16" r="5" fill="#2b2926"/><circle cx="36" cy="34" r="5" fill="#2b2926"/><path d="M25 18l22 0M23 20l10 10M49 20l-10 10" stroke="#2b2926" stroke-width="1.5"/>`),
  list: svgThumb(`<circle cx="16" cy="14" r="3" fill="#c4552a"/><circle cx="16" cy="24" r="3" fill="#2b2926"/><circle cx="16" cy="34" r="3" fill="#2b2926"/><path d="M26 14h30M26 24h24M26 34h28" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>`),
  choice: svgThumb(`<rect x="8" y="12" width="24" height="24" rx="4" fill="#fff" stroke="#c4552a"/><rect x="40" y="12" width="24" height="24" rx="4" fill="#fff" stroke="#d9d3c7"/><path d="M14 24h12M46 24h12" stroke="#2b2926" stroke-width="2" stroke-linecap="round"/>`),
};

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

export function pickerItems() {
  return [
    { name: "", label: `想法 · ${IDEA.label}`, body: guidanceFence(""), preview: PREVIEWS.idea, when: IDEA.when, whenNot: IDEA.whenNot },
    ...offeredGardenNames().map((name) => ({
      name,
      label: name === "compose" ? "compose（想法）" : `${name} · ${CATALOG[name].label}`,
      body: guidanceFence(name),
      preview: PREVIEWS[name],
      when: CATALOG[name].when,
      whenNot: CATALOG[name].whenNot,
    })),
  ];
}
