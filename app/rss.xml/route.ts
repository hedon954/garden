import { columns, posts } from "../lib/content";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const entries = [
    ...posts.map((post) => ({ ...post, path: `/blog/${post.slug}` })),
    ...columns.map((entry) => ({
      ...entry,
      path: `/columns/${entry.column}/${entry.slug}`,
    })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const items = entries
    .map(
      (entry) => `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${origin}${entry.path}</link>
      <guid isPermaLink="true">${origin}${entry.path}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description>${escapeXml(entry.description ?? "")}</description>
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Hedon Log</title>
    <link>${origin}</link>
    <description>写作、构建与保持好奇。</description>
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
