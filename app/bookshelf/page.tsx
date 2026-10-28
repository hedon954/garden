import type { Metadata } from "next";
import { bookshelf } from "@garden/bookshelf";
import { Bookshelf } from "../components/bookshelf";
import { siteLang } from "../lib/i18n";
import { pageAlternates } from "../lib/page-alternates";
import { siteConfig } from "../site.config";

/**
 * `/bookshelf` contract:
 * - `content/bookshelf.yaml` present → that shelf, with each `post` rendered
 *   into `notes`, inside the site header. Indexed like the other pages.
 * - file absent → package demo (Chinese click-test only, noindex, no site chrome).
 *   English builds skip the demo so a locale=en site stays free of that markup.
 */
export async function generateMetadata(): Promise<Metadata> {
  const shelf = bookshelf;
  if (shelf) {
    return {
      title: shelf.title,
      description: shelf.description,
      alternates: pageAlternates("/bookshelf"),
    };
  }
  if (siteLang === "zh") {
    return { title: { absolute: "花园 · 读书笔记" }, robots: { index: false, follow: false } };
  }
  return { title: "Bookshelf", robots: { index: false, follow: false } };
}

export default function BookshelfPage() {
  const shelf = bookshelf;
  if (shelf) {
    return (
      <Bookshelf
        catalog={shelf.catalog}
        notes={shelf.notes}
        title={shelf.title}
        eyebrow={shelf.eyebrow ?? siteConfig.name}
      />
    );
  }
  if (siteLang !== "zh") return null;
  return <Bookshelf />;
}
