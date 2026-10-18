import remarkBreaks from "remark-breaks";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * The Markdown syntax every post is read with: GFM, CJK-friendly emphasis,
 * hard line breaks and math. Posts add remarkGarden on top
 * (app/lib/markdown-plugins.ts); a previewed Markdown file uses this list as
 * is (scripts/file-preview.mjs), so both read the same Markdown the same way.
 */
export const markdownSyntaxPlugins = [remarkGfm, remarkCjkFriendly, remarkBreaks, remarkMath];
