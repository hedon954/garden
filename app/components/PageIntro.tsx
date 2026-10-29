import type { ReactNode } from "react";

type PageIntroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/**
 * Shared heading for top-level list pages (blog / thoughts / columns).
 * Same eyebrow + h1 + deck typography and padding so tab switches do not jump.
 * Empty subtitle reserves no space.
 */
export function PageIntro({
  eyebrow,
  title,
  subtitle,
  children,
}: PageIntroProps) {
  const deck = subtitle?.trim();
  return (
    <header className="page-intro sh-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>
        {title.split("\n").map((line, index) => (
          <span key={`${line}-${index}`}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </h1>
      {deck ? <p className="sh-deck">{deck}</p> : null}
      {children ? <div className="page-intro-actions">{children}</div> : null}
    </header>
  );
}
