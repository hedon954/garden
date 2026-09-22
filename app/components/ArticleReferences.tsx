type ReferenceItem = {
  title: string;
  url?: string;
};

export function ArticleReferences({
  references,
}: {
  references?: ReferenceItem[];
}) {
  if (!references?.length) return null;

  return (
    <section className="article-references" aria-labelledby="article-references-heading">
      <p id="article-references-heading">参考</p>
      <table>
        <tbody>
          {references.map((item, index) => {
            const number = index + 1;
            return (
              <tr key={index}>
                <td>
                  {item.url ? (
                    <a href={item.url} tabIndex={-1} aria-hidden="true">
                      {number}
                    </a>
                  ) : (
                    <span>{number}</span>
                  )}
                </td>
                <td>
                  {item.url ? (
                    <a href={item.url} rel="noreferrer">
                      <span>{item.title}</span>
                    </a>
                  ) : (
                    <span>{item.title}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
