import type { ReactNode } from "react";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

/** Shared heading treatment for every top-level public page. */
export function PageIntro({
  eyebrow,
  title,
  subtitle,
  children,
}: PageIntroProps) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>
        {title.split("\n").map((line, index) => (
          <span key={`${line}-${index}`}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </h1>
      {subtitle && <p>{subtitle}</p>}
      {children && <div className="page-intro-actions">{children}</div>}
    </header>
  );
}
