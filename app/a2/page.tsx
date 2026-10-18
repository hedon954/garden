import Link from "next/link";
import { siteHref } from "../lib/site-href";
import { a2Slugs, readA2Article } from "../lib/a2-preview";

export const metadata = {
  title: "A2 对照",
  robots: { index: false, follow: false },
};

export default function A2Index() {
  const articles = a2Slugs().map((slug) => readA2Article(slug)).filter((item) => item !== null);
  return (
    <main className="page-shell index-page">
      <header className="sh-head">
        <h1>A2 对照</h1>
        <p className="sh-deck">对照参考文章的版式。正文没有改字。</p>
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
