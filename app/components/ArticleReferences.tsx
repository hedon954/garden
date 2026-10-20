import { referenceColumns, referenceDomain } from "../../ui/garden/references.mjs";
import { siteLang } from "../lib/i18n";

type ReferenceItem = {
  title: string;
  url?: string;
  domain?: string;
};

export function ArticleReferences({
  references,
}: {
  references?: ReferenceItem[];
}) {
  if (!references?.length) return null;
  const split = referenceColumns(references.length) === 2;

  return (
    <section
      className={split ? "article-references is-split" : "article-references"}
      aria-labelledby="article-references-heading"
    >
      <h2 id="article-references-heading">{siteLang === "en" ? "References" : "参考"}</h2>
      <ol>
        {references.map((item, index) => {
          const domain = item.domain ?? referenceDomain(item.url);
          return (
            <li key={index}>
              {item.url ? (
                <a href={item.url} rel="noreferrer">
                  {item.title}
                </a>
              ) : (
                <span className="ref-title">{item.title}</span>
              )}
              {domain ? (
                <>
                  {" "}
                  <span className="ref-domain">{domain}</span>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
