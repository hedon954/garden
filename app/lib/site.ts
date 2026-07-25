import { headers } from "next/headers";

const fallbackUrl = "http://localhost:3000";

export const siteName = "Hedon Log";
export const siteDescription = "关于产品、工程、AI 学习与独立写作的长期个人博客。";
export const githubUsername = "hedon954";

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/u, "");

export async function getSiteUrl() {
  const configured = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return normalizeBaseUrl(configured);

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export function configuredSiteUrl() {
  return normalizeBaseUrl(
    process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? fallbackUrl,
  );
}

export function absoluteUrl(pathname: string, baseUrl: string) {
  return new URL(pathname, `${normalizeBaseUrl(baseUrl)}/`).toString();
}

export function webmentionEndpoint() {
  const explicit = process.env.WEBMENTION_ENDPOINT;
  if (explicit) return explicit;
  const domain = process.env.WEBMENTION_IO_DOMAIN;
  return domain ? `https://webmention.io/${domain}/webmention` : undefined;
}

export function webmentionApiEndpoint() {
  const domain = process.env.WEBMENTION_IO_DOMAIN;
  return domain ? "https://webmention.io/api/mentions.jf2" : undefined;
}
