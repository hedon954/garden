import type { MetadataRoute } from "next";
import { columns, posts, thoughts } from "./lib/content";
import { absoluteUrl, getSiteUrl } from "./lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl();
  const staticRoutes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/blog", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/thoughts", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/columns", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
  ].map((route) => ({
    url: absoluteUrl(route.path, baseUrl),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`, baseUrl),
      lastModified: new Date(post.updated ?? post.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...columns.map((entry) => ({
      url: absoluteUrl(
        `/columns/${entry.column}/${entry.slug}`,
        baseUrl,
      ),
      lastModified: new Date(entry.updated ?? entry.date),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...thoughts.map((thought) => ({
      url: absoluteUrl(`/thoughts/${thought.slug}`, baseUrl),
      lastModified: new Date(thought.updated ?? thought.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
