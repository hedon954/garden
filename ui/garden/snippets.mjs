import { CATALOG, GARDEN_NAMES, IDEA } from "./catalog.mjs";

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
      body: [`\`\`\`garden \${1|${["idea", ...GARDEN_NAMES].join(",")}|}`, "$0", "```"],
      description: `选择 Garden 块：想法 / ${GARDEN_NAMES.join(" / ")}`,
    },
  };
  for (const trigger of IDEA.triggers) {
    snippets[`Garden ${IDEA.label} ${trigger}`] = {
      prefix: trigger,
      body: snippetBody(IDEA.example),
      description: IDEA.when,
    };
  }
  for (const name of GARDEN_NAMES) {
    const spec = CATALOG[name];
    for (const trigger of spec.triggers) {
      snippets[`Garden ${spec.label} ${trigger}`] = {
        prefix: trigger,
        body: fenceLines(spec.example),
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
    ...GARDEN_NAMES.map((name) => [name, CATALOG[name]]),
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
    ...GARDEN_NAMES.flatMap((name) => CATALOG[name].triggers.map((trigger) => ({
      shortcut: `;${trigger}`,
      phrase: CATALOG[name].example,
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

export function pickerItems() {
  return [
    { name: "", label: `想法 · ${IDEA.label}`, body: IDEA.example, when: IDEA.when, whenNot: IDEA.whenNot },
    ...GARDEN_NAMES.map((name) => ({
      name,
      label: `${name} · ${CATALOG[name].label}`,
      body: CATALOG[name].example,
      when: CATALOG[name].when,
      whenNot: CATALOG[name].whenNot,
    })),
  ];
}
