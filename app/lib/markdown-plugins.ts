import type { PluggableList } from "unified";
import { markdownSyntaxPlugins } from "../../ui/garden/markdown-syntax.mjs";
import { remarkGarden } from "./remark-garden.mjs";

// Keep article rendering and heading extraction on the same Markdown syntax.
export const markdownPlugins: PluggableList = [...markdownSyntaxPlugins, remarkGarden];
