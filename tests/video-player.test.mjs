import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { markdownPlugins } from "../app/lib/markdown-plugins.ts";
import { remarkLinkCard } from "../app/lib/remark-link-card.mjs";
import { cardUrls } from "../ui/garden/markdown-links.mjs";
import {
  authorPasteUrl,
  isExactHost,
  isPlayablePlayerUrl,
  renderLegacyEmbed,
  renderPlayerHtml,
  resolvePlayer,
} from "../ui/garden/player.mjs";

const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const YT_SHORT = "https://youtu.be/dQw4w9WgXcQ";
const BV = "https://www.bilibili.com/video/BV1xx411c7mD";
const EXAMPLE = "https://example.com/article";

function renderMarkdown(source) {
  return String(unified()
    .use(remarkParse)
    .use(markdownPlugins)
    .use(remarkLinkCard)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .processSync(source));
}

function renderArticleLike(source) {
  return renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: [...markdownPlugins, remarkLinkCard],
    rehypePlugins: [rehypeRaw],
    components: {
      p: ({ children, ...props }) => {
        const nodes = Array.isArray(children) ? children : [children];
        const visible = nodes.filter((node) => !(typeof node === "string" && !node.trim()));
        const only = visible.length === 1 && visible[0]?.props?.href ? visible[0] : null;
        const href = only?.props?.href;
        const text = typeof only?.props?.children === "string" ? only.props.children : href;
        if (href && text === href && /^https?:\/\//iu.test(href)) {
          const player = resolvePlayer(href);
          if (player.ok) return createElement("div", { dangerouslySetInnerHTML: { __html: renderPlayerHtml(player) } });
          return createElement("div", { "data-link-card": href });
        }
        const rest = { ...props };
        delete rest.node;
        return createElement("p", rest, children);
      },
    },
  }, source));
}

function assertSafePlayer(html, { origin, id }) {
  assert.match(html, /<iframe\b/u);
  assert.match(html, /class="g-player /u);
  assert.match(html, /class="g-player-frame"/u);
  assert.match(html, /loading="lazy"/u);
  assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"|referrerPolicy="strict-origin-when-cross-origin"/u);
  assert.doesNotMatch(html, /autoplay=1/u);
  assert.doesNotMatch(html, /allow="[^"]*autoplay/u);
  const src = html.match(/<iframe\b[^>]*\ssrc="([^"]+)"/u)?.[1];
  assert.ok(src, html);
  assert.equal(new URL(src).origin, origin);
  assert.ok(src.includes(id), src);
}

test("resolvePlayer accepts official video URLs and rejects lookalikes", () => {
  assert.equal(isExactHost("www.youtube.com", "youtube.com"), true);
  assert.equal(isExactHost("youtube.com.evil.com", "youtube.com"), false);
  assert.equal(isExactHost("notyoutube.com", "youtube.com"), false);

  const watch = resolvePlayer(YT);
  assert.equal(watch.ok, true);
  assert.equal(watch.provider, "youtube");
  assert.equal(watch.playerUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(watch.pageUrl, YT);
  assert.equal(resolvePlayer(YT_SHORT).playerUrl, watch.playerUrl);
  assert.equal(resolvePlayer("https://www.youtube.com/embed/dQw4w9WgXcQ").ok, true);
  assert.equal(resolvePlayer("https://www.youtube.com/shorts/dQw4w9WgXcQ").ok, true);
  assert.equal(resolvePlayer("https://m.youtube.com/watch?v=dQw4w9WgXcQ").ok, true);
  const timed = resolvePlayer("https://youtu.be/dQw4w9WgXcQ?t=90");
  assert.equal(timed.ok, true);
  assert.equal(timed.playerUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
  assert.doesNotMatch(timed.playerUrl, /autoplay/u);

  const bili = resolvePlayer(BV);
  assert.equal(bili.ok, true);
  assert.equal(bili.provider, "bilibili");
  assert.equal(bili.pageUrl, BV);
  assert.equal(new URL(bili.playerUrl).origin, "https://player.bilibili.com");
  assert.equal(new URL(bili.playerUrl).searchParams.get("bvid"), "BV1xx411c7mD");
  assert.equal(new URL(bili.playerUrl).searchParams.get("autoplay"), "0");
  assert.equal(resolvePlayer("https://www.bilibili.com/video/av170001").pageUrl, "https://www.bilibili.com/video/av170001");

  assert.equal(resolvePlayer("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ").ok, false);
  assert.equal(resolvePlayer("https://notyoutube.com/watch?v=dQw4w9WgXcQ").ok, false);
  assert.equal(resolvePlayer("https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ").ok, false);
  assert.equal(resolvePlayer("https://www.youtube.com/playlist?list=PLxxxx").ok, false);
  assert.equal(resolvePlayer("https://www.youtube.com/channel/UCxxxx").ok, false);
  assert.equal(resolvePlayer("https://www.bilibili.com/read/cv123").ok, false);
  assert.equal(resolvePlayer("https://player.bilibili.com.evil.com/player.html?bvid=BV1xx411c7mD").ok, false);
  assert.equal(resolvePlayer("https://b23.tv/abcdef").reason, "short-link");
  assert.equal(resolvePlayer("javascript:alert(1)").ok, false);
  assert.equal(isPlayablePlayerUrl(EXAMPLE), false);
  assert.equal(authorPasteUrl(YT_SHORT), YT);
  assert.equal(authorPasteUrl(BV), BV);
});

test("a YouTube or Bilibili URL alone on a line renders a safe iframe", () => {
  const youtube = renderMarkdown(YT);
  assertSafePlayer(youtube, { origin: "https://www.youtube-nocookie.com", id: "dQw4w9WgXcQ" });
  assert.match(youtube, /在 YouTube 打开/u);
  assert.doesNotMatch(youtube, /data-url="https:\/\/www\.youtube\.com/u);

  const billed = renderMarkdown(`<${BV}>`);
  assertSafePlayer(billed, { origin: "https://player.bilibili.com", id: "BV1xx411c7mD" });
  assert.match(billed, /在 Bilibili 打开/u);

  const titled = renderMarkdown("[demo](https://youtu.be/dQw4w9WgXcQ?t=1m30s)");
  assertSafePlayer(titled, { origin: "https://www.youtube-nocookie.com", id: "start=90" });
  assert.match(titled, /title="demo"/u);
});

test("in-sentence links, multiple links, and code do not become players", () => {
  const sentence = renderMarkdown(`See ${YT} for the clip.`);
  assert.doesNotMatch(sentence, /<iframe\b/u);
  assert.doesNotMatch(sentence, /g-player/u);
  assert.match(sentence, /href="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"/u);

  const titled = renderMarkdown(`Watch [this](${YT}) tonight.`);
  assert.doesNotMatch(titled, /<iframe\b/u);
  assert.match(titled, /href="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"/u);

  const two = renderMarkdown(`${YT} ${BV}`);
  assert.doesNotMatch(two, /<iframe\b/u);

  const fence = renderMarkdown("```\n" + YT + "\n```");
  assert.doesNotMatch(fence, /<iframe\b/u);
  assert.match(fence, /dQw4w9WgXcQ/u);

  const inline = renderMarkdown("Use `" + YT + "` in the notes.");
  assert.doesNotMatch(inline, /<iframe\b/u);
  assert.match(inline, /<code>https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ<\/code>/u);
});

test("explicit {card} keeps a link card, and ordinary standalone URLs stay cards", () => {
  const marked = renderMarkdown(`[clip](${YT}){card}`);
  assert.doesNotMatch(marked, /<iframe\b/u);
  assert.match(marked, /<(garden-linkcard)[^>]*data-url="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"/u);

  const html = renderArticleLike(`${YT}\n\n${EXAMPLE}\n\nSee ${YT} and [docs](${EXAMPLE}){card}.\n`);
  assert.match(html, /class="g-player g-player-youtube"/u);
  assert.match(html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/u);
  assert.match(html, /data-link-card="https:\/\/example\.com\/article"/u);
  assert.equal(html.match(/data-link-card=/gu)?.length, 1);
  assert.match(html, /<(garden-linkcard)[^>]*data-url="https:\/\/example\.com\/article"/u);
  assert.doesNotMatch(html, /data-link-card="https:\/\/www\.youtube\.com/u);

  const fake = renderArticleLike("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ");
  assert.doesNotMatch(fake, /youtube-nocookie/u);
  assert.doesNotMatch(fake, /<iframe\b/u);
  assert.match(fake, /data-link-card="https:\/\/youtube.com.evil.com\/watch\?v=dQw4w9WgXcQ"/u);

  const playlist = renderArticleLike("https://www.youtube.com/playlist?list=PLxxxx");
  assert.doesNotMatch(playlist, /<iframe\b/u);
  assert.match(playlist, /data-link-card=/u);

  assert.deepEqual(cardUrls(`${YT}\n\n${EXAMPLE}\n\n[docs](${EXAMPLE}){card}\n\n[clip](${YT}){card}`), [
    EXAMPLE,
    YT,
  ]);
});

test("legacy embed fences with a playable URL still render, others do not become iframes", () => {
  const html = renderMarkdown("```embed\nurl: " + BV + "\ntitle: 示例\n```");
  assertSafePlayer(html, { origin: "https://player.bilibili.com", id: "BV1xx411c7mD" });
  assert.match(html, /title="示例"/u);

  const page = renderLegacyEmbed("url: https://example.com/post\ntitle: A page");
  assert.doesNotMatch(page, /<iframe\b/u);
  assert.match(page, /href="https:\/\/example.com\/post"/u);

  const evil = renderLegacyEmbed("url: https://evil.example/player.html");
  assert.doesNotMatch(evil, /<iframe\b/u);
});

test("player chrome uses the article radius token and has no card shell or caption bar", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const playerCss = css.slice(css.indexOf(".markdown-body .g-player,"), css.indexOf(".markdown-body .garden-chart"));
  assert.match(playerCss, /border-radius:\s*var\(--r\)/u);
  assert.match(playerCss, /aspect-ratio:\s*16 \/ 9/u);
  assert.match(playerCss, /overflow:\s*hidden/u);
  assert.match(playerCss, /overflow:\s*clip/u);
  assert.match(playerCss, /overflow-clip-margin:\s*4px/u);
  assert.match(playerCss, /:focus-within/u);
  assert.doesNotMatch(playerCss, /min-height:\s*45px/u);
  assert.doesNotMatch(playerCss, /background:\s*var\(--card\)/u);
  assert.doesNotMatch(playerCss, /border:\s*1px solid var\(--line-strong\)/u);
  assert.doesNotMatch(playerCss, /justify-content:\s*flex-end/u);
  assert.match(playerCss, /font-size:\s*var\(--fs-small\)/u);
  assert.match(playerCss, /color:\s*var\(--muted\)/u);

  const html = renderMarkdown("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.match(html, /<figcaption><a class="ext" href="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"/u);
  assert.doesNotMatch(html, /<svg\b/u);
});
