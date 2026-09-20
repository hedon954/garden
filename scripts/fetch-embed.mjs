import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const timeoutMs = 8000;
const maxBytes = 1_000_000;
const maxRedirects = 3;

const option = (name) => (process.env[`GARDEN_EMBED_${name}`] ?? "").trim();

function fail(message) {
  throw new Error(message);
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&nbsp;", " ")
    .trim();
}

function isBlockedHostname(hostname) {
  const host = hostname.replace(/\.$/u, "").toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "[::1]"
  );
}

function isBlockedAddress(address) {
  const ip = address.toLowerCase().replace(/^\[|\]$/gu, "");
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::" || ip === "0.0.0.0") return true;
  if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  if (ip.startsWith("::ffff:")) return isBlockedAddress(ip.slice(7));

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

async function assertPublicHttpUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail("URL 无效。");
  }
  if (!["http:", "https:"].includes(url.protocol)) fail("只接受 http 或 https。");
  if (url.username || url.password) fail("URL 不能带用户名或密码。");
  if (isBlockedHostname(url.hostname) || isIP(url.hostname) && isBlockedAddress(url.hostname)) {
    fail("不能抓取本机、内网或链路本地地址。");
  }

  const records = await lookup(url.hostname, { all: true, verbatim: true });
  if (records.some((record) => isBlockedAddress(record.address))) {
    fail("不能抓取解析到内网或本机的地址。");
  }
  return url;
}

function metaContent(html, keys) {
  for (const key of keys) {
    const escaped = key.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const patterns = [
      new RegExp(
        `<meta\\b[^>]*?(?:property|name)=["']${escaped}["'][^>]*?\\bcontent=["']([^"']*)["'][^>]*>`,
        "iu",
      ),
      new RegExp(
        `<meta\\b[^>]*?\\bcontent=["']([^"']*)["'][^>]*?(?:property|name)=["']${escaped}["'][^>]*>`,
        "iu",
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern)?.[1];
      if (match) return decodeEntities(match);
    }
  }
  return undefined;
}

function pageTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1];
  return match ? decodeEntities(match.replaceAll(/\s+/gu, " ")) : undefined;
}

function yamlScalar(value) {
  return JSON.stringify(value);
}

async function readLimited(response) {
  const type = response.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml\+xml/iu.test(type) && type !== "") {
    fail(`响应不是 HTML（${type}）。`);
  }

  const reader = response.body?.getReader();
  if (!reader) fail("响应没有正文。");

  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) fail("页面过大，已停止抓取。");
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

async function fetchPublic(url, redirectsLeft) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "GardenEmbedSnapshot/1.0",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectsLeft <= 0) fail("重定向次数过多。");
      const location = response.headers.get("location");
      if (!location) fail("重定向缺少 Location。");
      const next = await assertPublicHttpUrl(new URL(location, url).toString());
      return fetchPublic(next, redirectsLeft - 1);
    }
    if (!response.ok) fail(`抓取失败：HTTP ${response.status}。`);
    return readLimited(response);
  } catch (error) {
    if (error?.name === "AbortError") fail("抓取超时。");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const raw = option("URL") || process.argv[2] || "";
  if (!raw) fail('用法：make embed URL="https://example.com/article"');

  const url = await assertPublicHttpUrl(raw);
  const html = await fetchPublic(url, maxRedirects);
  const title = metaContent(html, ["og:title", "twitter:title"]) ?? pageTitle(html);
  const description = metaContent(html, ["og:description", "twitter:description", "description"]);
  const image = metaContent(html, ["og:image", "twitter:image", "twitter:image:src"]);

  if (image) {
    try {
      const imageUrl = new URL(image, url);
      if (!["http:", "https:"].includes(imageUrl.protocol)) fail("封面地址不是 http(s)。");
    } catch {
      fail("封面地址无效。");
    }
  }

  const lines = ["```embed", `url: ${url.toString()}`];
  if (title) lines.push(`title: ${yamlScalar(title)}`);
  if (description) lines.push(`description: ${yamlScalar(description)}`);
  if (image) lines.push(`image: ${yamlScalar(new URL(image, url).toString())}`);
  lines.push("```");

  process.stdout.write(`${lines.join("\n")}\n`);
  if (!title && !description) {
    process.stderr.write("已生成围栏，但页面没有标题或摘要，请手工补全。\n");
  }
}

main().catch((error) => {
  console.error(`拉取失败：${error.message}`);
  process.exitCode = 1;
});
