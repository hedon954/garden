import Link from "next/link";
import { siteHref } from "../../lib/site-href";
import { ui } from "../../lib/i18n";
import type { BookshelfBook, BookshelfBookPost, BookshelfNoteKind, BookshelfSource } from "./types";

function day(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function kindLabel(kind: BookshelfNoteKind | undefined) {
  const t = ui();
  switch (kind) {
    case "overview":
      return t.bookHubOverview;
    case "excerpt":
      return t.bookHubExcerpt;
    case undefined:
      return "";
    default: {
      const unexpected: never = kind;
      return unexpected;
    }
  }
}

function sourceHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return siteHref(href);
  return href;
}

function isExternal(href: string) {
  return /^(?:https?:)?\/\//iu.test(href);
}

/** Hub chips are Douban and PDF. The Chinese label is the zh shelf; English sites write Douban. */
function isDoubanChip(label: string) {
  return label === "豆瓣" || /^douban$/iu.test(label);
}

function hubSources(sources: readonly BookshelfSource[] | undefined) {
  const list = sources ?? [];
  const douban = list.filter((source) => isDoubanChip(source.label));
  const pdf = list.filter((source) => /pdf/iu.test(source.label));
  return [...douban, ...pdf];
}

function NoteCard({ entry }: { entry: BookshelfBookPost }) {
  const t = ui();
  const label = kindLabel(entry.kind);
  const href = entry.href ?? siteHref(`/blog/${entry.path}`);
  const when = entry.date ? day(entry.date) : "";
  const count = entry.words ? t.wordCount(entry.words) : "";
  return (
    <Link className="book-hub-note" href={href}>
      {label ? <p className="book-hub-note-label">{label}</p> : null}
      <h3>{entry.title}</h3>
      {entry.summary ? <p className="book-hub-note-sum">{entry.summary}</p> : null}
      {when || count ? (
        <p className="book-hub-note-meta">
          {when}
          {when && count ? " · " : null}
          {count}
        </p>
      ) : null}
    </Link>
  );
}

function SourceChips({ sources }: { sources: readonly BookshelfSource[] }) {
  const shown = hubSources(sources);
  if (!shown.length) return null;
  const t = ui();
  return (
    <div className="book-hub-sources">
      {shown.map((source) => {
        const href = sourceHref(source.href);
        const external = isExternal(source.href);
        const pdf = /pdf/iu.test(source.label);
        return (
          <span className="book-hub-source" key={`${source.label}\u0000${source.href}`}>
            <a
              className="book-hub-chip"
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {source.label}
              <span className="ext" aria-hidden="true">↗</span>
            </a>
            {pdf ? <span className="book-hub-source-note">{t.bookHubPdfNote}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

/** Book hub (本书). Multi-note volumes land here; a note card is a plain article link. */
export function BookHub({ shelfTitle, book }: { shelfTitle: string; book: BookshelfBook }) {
  const t = ui();
  const jacket = typeof book.cover === "string" ? book.cover : "";
  const posts = book.posts ?? [];
  return (
    <main className="sh-main book-hub" id="content">
      <p className="book-hub-crumb">
        <Link href={siteHref("/columns")}>{t.homeColumns}</Link>
        <span aria-hidden="true"> · </span>
        <Link href={siteHref("/bookshelf")}>{shelfTitle}</Link>
        <span aria-hidden="true"> · </span>
        <span aria-current="page">{t.bookHubCurrent}</span>
      </p>

      <section className="book-hub-card" aria-labelledby="book-hub-title">
        {jacket ? (
          <div className="book-hub-cover">
            <img src={jacket} alt={t.coverLabel(book.title)} width={148} />
          </div>
        ) : null}
        <div className="book-hub-meta">
          <h1 id="book-hub-title">{book.title}</h1>
          {book.author ? <p className="book-hub-author">{book.author}</p> : null}
          <SourceChips sources={book.sources ?? []} />
        </div>
      </section>

      <h2 className="book-hub-notes-head">{t.bookHubNotes}</h2>
      <ul className="book-hub-notes">
        {posts.map((entry) => (
          <li key={entry.path}>
            <NoteCard entry={entry} />
          </li>
        ))}
      </ul>
    </main>
  );
}
