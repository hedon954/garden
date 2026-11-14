import type { PluggableList } from "unified";
import { markdownSyntaxPlugins } from "../../ui/garden/markdown-syntax.mjs";
import { remarkGarden } from "./remark-garden.mjs";
import { remarkVideoPlayer } from "./remark-video-player.mjs";

// Keep article rendering and heading extraction on the same Markdown syntax.
// The spread + remarkGarden list already fails PluggableList checking on HEAD.
// Adding another plugin in that literal would report a new slot error even when
// the plugin itself is a Plugin; append it as a typed Pluggable instead.
export const markdownPlugins: PluggableList = [...markdownSyntaxPlugins, remarkGarden];
markdownPlugins.push(remarkVideoPlayer);
