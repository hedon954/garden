import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";

// Keep article rendering and heading extraction on the same Markdown syntax.
export const markdownPlugins: PluggableList = [
  remarkGfm,
  remarkCjkFriendly,
  remarkBreaks,
  remarkMath,
];
