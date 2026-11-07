/** The single author entry. Component contracts live in Compose's catalogs. */
import { COMPOSE_EXAMPLE_BODY, COMPOSE_INTENT } from "../compose/examples.mjs";
export const GARDEN_NAMES = ["compose"];
export const CATALOG = {
  compose: {
    label: "组合文章内容与交互",
    when: "在一个场景里组合正文、说明图、资源、文件、关系和可调参数。叶子保留 Markdown 与安全 HTML。",
    whenNot: "普通段落、标准列表或一张图片已经足够时，不必再包场景。",
    keys: ["caption", "intent", "expect", "id", "frame"],
    example: "```garden compose\n" + COMPOSE_EXAMPLE_BODY + "\n```",
    triggers: ["garden", "gcompose"],
  },
};
export const IDEA = {
  label: "Compose 原话",
  when: "先写读者要看出的关系，再由 AI 在 Compose 内选择和组合内容。",
  whenNot: "发布前必须通过真实解析、渲染和视觉检查。",
  example: "```garden compose\n" + COMPOSE_INTENT + "\n```",
  triggers: [],
};
export const IDEA_EN = {...IDEA,label:"Compose brief",example:"```garden compose\nShow what readers should understand, preserving the article's facts.\n```"};
export const CATALOG_EXAMPLES_EN = {compose:'```garden compose\n<intent>Show the shared structure.</intent>\n<row><box><text>First</text></box><arrow/><box><text>Second</text></box></row>\n```'};
export const offeredGardenNames = () => [...GARDEN_NAMES];
export const knownName = name => GARDEN_NAMES.includes(name);
export const suggestName = () => "compose";
export function cheatSheet(lang="zh") {
  return [lang==="en"?"<!-- Compose example; remove this comment after writing.":"<!-- Compose 示例；写作后删除此注释。",lang==="en"?CATALOG_EXAMPLES_EN.compose:CATALOG.compose.example,"-->"].join("\n");
}
