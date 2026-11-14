import type { Root } from "mdast";
import type { Plugin } from "unified";

/**
 * Remark plugin: a paragraph that is only a YouTube or Bilibili video URL
 * becomes an in-article player. This is the attacher itself (Plugin), not a
 * factory that returns a Plugin.
 */
declare const remarkVideoPlayer: Plugin<[], Root>;
export { remarkVideoPlayer };
