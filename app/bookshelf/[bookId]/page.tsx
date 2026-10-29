import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bookshelf } from "@garden/bookshelf";
import { BookHub } from "../../components/bookshelf/BookHub";
import { pageAlternates } from "../../lib/page-alternates";
import { isStaticPlaceholder, STATIC_PLACEHOLDER, staticParams } from "../../../ui/garden/static-params.mjs";
import type { BookshelfBook } from "../../components/bookshelf/types";

function hubBooks(): { shelfTitle: string; book: BookshelfBook }[] {
  if (!bookshelf) return [];
  const found: { shelfTitle: string; book: BookshelfBook }[] = [];
  for (const row of bookshelf.catalog) {
    for (const book of row.books) {
      if ((book.posts?.length ?? 0) > 1) found.push({ shelfTitle: bookshelf.title, book });
    }
  }
  return found;
}

export function generateStaticParams() {
  return staticParams(
    hubBooks().map(({ book }) => ({ bookId: book.id })),
    { bookId: STATIC_PLACEHOLDER },
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookId: string }>;
}): Promise<Metadata> {
  const { bookId } = await params;
  const found = hubBooks().find((item) => item.book.id === bookId);
  if (!found) return {};
  return {
    title: found.book.title,
    description: found.book.posts?.find((post) => post.summary)?.summary,
    alternates: pageAlternates(`/bookshelf/${found.book.id}`),
  };
}

/** `/bookshelf/<id>` — one multi-note volume. Single-note books stay on the shelf. */
export default async function BookHubPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  if (isStaticPlaceholder(bookId)) return null;
  const found = hubBooks().find((item) => item.book.id === bookId);
  if (!found) notFound();
  return <BookHub shelfTitle={found.shelfTitle} book={found.book} />;
}
