import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "./lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml", baseUrl),
    host: baseUrl,
  };
}
