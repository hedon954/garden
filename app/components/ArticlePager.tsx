import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import { ui } from "../lib/i18n";

export type PagerTarget = { href: string; title: string } | null;

/** 上一篇 / 下一篇, the same cards as the handbook pager. A missing side stays empty. */
export function ArticlePager({ prev, next, label = ui().pagerLabel }: { prev: PagerTarget; next: PagerTarget; label?: string }) {
  if (!prev && !next) return null;
  return (
    <nav className="gdoc-pager article-pager" aria-label={label}>
      {prev ? (
        <Link href={prev.href} className="gdoc-pager-card is-prev">
          <span className="gdoc-pager-dir">
            <ArrowLeft size={14} aria-hidden="true" />
            {ui().prev}
          </span>
          <strong>{prev.title}</strong>
        </Link>
      ) : null}
      {next ? (
        <Link href={next.href} className="gdoc-pager-card is-next">
          <span className="gdoc-pager-dir">
            {ui().next}
            <ArrowRight size={14} aria-hidden="true" />
          </span>
          <strong>{next.title}</strong>
        </Link>
      ) : null}
    </nav>
  );
}
