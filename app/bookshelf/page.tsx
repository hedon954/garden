import type { Metadata } from "next";
import { Bookshelf } from "../components/bookshelf";
import { siteLang } from "../lib/i18n";

const preview = siteLang === "zh";

export const metadata: Metadata = preview
  ? { title: { absolute: "花园 · 读书笔记" }, robots: { index: false, follow: false } }
  : { title: "Bookshelf", robots: { index: false, follow: false } };

/**
 * Click-test route for the approved shelf.
 * States: ?mode=covers (A), default spines (B), hover one spine (C). ?debug=1 shows the demo's mode buttons.
 * English sites skip the Chinese demo markup so a locale=en build stays free of CJK.
 */
export default function BookshelfPage() {
  if (!preview) return null;
  return <Bookshelf />;
}
