import { headers } from "next/headers";
import { siteConfig } from "../site.config";

const fallbackUrl = "http://localhost:3000";

export const siteName = siteConfig.name;
export const siteDescription = siteConfig.description;
export const githubUsername = siteConfig.author.github;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/u, "");

export async function getSiteUrl() {
  const configured = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured || process.env.STATIC_EXPORT === "1") {
    return normalizeBaseUrl(configured ?? fallbackUrl);
  }

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
  return domain
    ? `https://webmention.io/api/mentions.jf2?domain=${encodeURIComponent(domain)}`
    : undefined;
}
