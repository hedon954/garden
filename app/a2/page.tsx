import Link from "next/link";
import { siteHref } from "../lib/site-href";
import { a2Slugs, readA2Article } from "../lib/a2-preview";
import { ui } from "../lib/i18n";

export const metadata = {
  title: ui().a2IndexTitle,
  robots: { index: false, follow: false },
};

export default function A2Index() {
  const articles = a2Slugs().map((slug) => readA2Article(slug)).filter((item) => item !== null);
  return (
    <main className="page-shell index-page">
      <header className="sh-head">
        <h1>{ui().a2IndexTitle}</h1>
        <p className="sh-deck">{ui().a2IndexDeck}</p>
      </header>
      <ul className="sh-rows">
        {articles.map((article) => (
          <li className="sh-row" key={article.slug}>
            <h3><Link href={siteHref(`/a2/${article.slug}`)}>{article.title}</Link></h3>
            <p>{article.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
