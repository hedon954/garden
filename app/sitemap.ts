import type { MetadataRoute } from "next";
import { bookshelf } from "@garden/bookshelf";
import { columnHref, columns, postHref, posts, thoughtHref } from "./lib/content";
import { absoluteUrl, getSiteUrl } from "./lib/site";
import { getPublishedThoughts } from "./lib/public-thoughts";
import { siteHref } from "./lib/site-href";
import type { BookshelfBook, BookshelfShelf } from "./components/bookshelf/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl();
  const thoughts = getPublishedThoughts();
  const staticRoutes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/blog", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/thoughts", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/columns", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/garden", priority: 0.4, changeFrequency: "monthly" as const },
    // Only a real shelf is a page. The package demo stays out of the sitemap.
    ...(bookshelf ? [{ path: "/bookshelf", priority: 0.6, changeFrequency: "weekly" as const }] : []),
    ...(bookshelf
      ? bookshelf.catalog.flatMap((row: BookshelfShelf) =>
          row.books
            .filter((book: BookshelfBook) => typeof book.hub === "string")
            .map((book: BookshelfBook) => ({ path: book.hub ?? "/bookshelf", priority: 0.55, changeFrequency: "weekly" as const })),
        )
      : []),
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
    ...thoughts.map((thought) => ({
      url: absoluteUrl(thoughtHref(thought.slug), baseUrl),
      lastModified: new Date(thought.updated ?? thought.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
