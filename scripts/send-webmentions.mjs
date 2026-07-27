const siteUrl = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.replace(
  /\/+$/u,
  "",
);

if (!siteUrl || siteUrl.includes("example.com")) {
  throw new Error("请先通过 SITE_URL 配置已经公开访问的正式站点地址。");
}

const feedUrl = `${siteUrl}/rss.xml`;
const endpoint = new URL("https://webmention.app/check");
endpoint.searchParams.set("url", feedUrl);

const response = await fetch(endpoint, {
  method: "POST",
  headers: { Accept: "application/json" },
});

if (!response.ok) {
  throw new Error(
    `发送 Webmentions 失败：${response.status} ${response.statusText}`,
  );
}

const results = await response.json();
const sent = Array.isArray(results) ? results.length : 0;
console.log(`Checked ${feedUrl}; discovered ${sent} outgoing Webmention targets.`);
