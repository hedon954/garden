import { splitTitle, titleLineScale } from "../../ui/garden/title.mjs";

export function ArticleTitle({ title, className = "" }: { title: string; className?: string }) {
  const split = splitTitle(title);
  if (!split.split) {
    return <h1 className={`p-name${className ? ` ${className}` : ""}`}>{title}</h1>;
  }
  const scale = titleLineScale(split.lines);
  return (
    <h1 className={`p-name h1-br${className ? ` ${className}` : ""}`} style={{ ["--l" as string]: scale }}>
      <span className="h1-line">{split.lines[0]}</span>
      <span className="vh">{split.separator}</span>
      <span className="h1-line">{split.lines[1]}</span>
    </h1>
  );
}

export function originalUrl(entry: { original?: unknown }) {
  return typeof entry.original === "string" && /^https?:\/\//iu.test(entry.original) ? entry.original : "";
}
