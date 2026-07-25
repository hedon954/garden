import { marked } from "marked";
import { columns, posts } from "../lib/content";
import { getPublishedThoughts } from "../lib/public-thoughts";
import { configuredSiteUrl, siteDescription, siteName } from "../lib/site";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const cdata = (value: string) => value.replaceAll("]]>", "]]]]><![CDATA[>");

export async function GET() {
  const origin = configuredSiteUrl();
  const thoughts = getPublishedThoughts();
  const entries = [
    ...posts.map((post) => ({ ...post, path: `/blog/${post.slug}` })),
    ...columns.map((entry) => ({
      ...entry,
      path: `/columns/${entry.column}/${entry.slug}`,
    })),
    ...thoughts.map((thought) => ({
      ...thought,
      description: thought.content.replace(/\s+/gu, " ").slice(0, 180),
      path: `/thoughts/${thought.slug}`,
    })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const items = entries
    .map((entry) => {
      const body = marked.parse(entry.content, {
        async: false,
        gfm: true,
        breaks: true,
      });
      const cover = entry.cover
        ? `<p><img src="${escapeXml(entry.cover)}" alt="${escapeXml(
            entry.coverAlt ?? entry.title,
          )}" /></p>`
        : "";
      return `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${origin}${entry.path}</link>
      <guid isPermaLink="true">${origin}${entry.path}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description>${escapeXml(entry.description ?? "")}</description>
      ${(entry.tags ?? [])
        .map((tag) => `<category>${escapeXml(tag)}</category>`)
        .join("")}
      <content:encoded><![CDATA[${cdata(`${cover}${body}`)}]]></content:encoded>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${origin}</link>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
