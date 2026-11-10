import type { MetadataRoute } from "next";
import { columnHref, columns, postHref, posts } from "./lib/content";
import { absoluteUrl, getSiteUrl } from "./lib/site";
import { siteHref } from "./lib/site-href";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl();
  const staticRoutes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/blog", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/columns", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/garden", priority: 0.4, changeFrequency: "monthly" as const },
  ].map((route) => ({
    url: absoluteUrl(siteHref(route.path), baseUrl),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: absoluteUrl(postHref(post), baseUrl),
      lastModified: new Date(post.updated ?? post.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...columns.map((entry) => ({
      url: absoluteUrl(
        columnHref(entry),
        baseUrl,
      ),
      lastModified: new Date(entry.updated ?? entry.date),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}
