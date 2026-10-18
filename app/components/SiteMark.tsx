const MARKS = ["monogram", "leaf", "plot"] as const;

export type SiteMarkName = (typeof MARKS)[number];

function isPath(value: string) {
  return value.startsWith("/") || value.startsWith(".") || /^https?:/i.test(value);
}

function monogramLetter(name: string) {
  const letter = [...name.trim()][0] ?? "G";
  return /[a-z]/i.test(letter) ? letter.toUpperCase() : letter;
}

/** Small header mark. `logo` is a built-in name or an image path. */
export function SiteMark({ name, logo }: { name: string; logo?: string }) {
  const value = (logo ?? "").trim();
  if (value && isPath(value)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="sh-mark" src={value} alt="" />;
  }
  const kind: SiteMarkName = (MARKS as readonly string[]).includes(value) ? (value as SiteMarkName) : "monogram";
  if (kind === "leaf") {
    return (
      <svg className="sh-mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.2 18.6C12.6 17.4 18 11.4 18.6 5.2 13.2 6.2 8.4 11.4 5.2 18.6Z" />
        <path className="blue" d="M5.6 18.2C9.4 14.4 13.2 11.2 18.2 8.8" />
      </svg>
    );
  }
  if (kind === "plot") {
    return (
      <svg className="sh-mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.5h16v8.2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M4 14.6h16" />
        <path className="blue" d="M12 10.4V5.2" />
        <path className="blue" d="M12 7.4 9.3 5.6M12 8.5l2.8-1.8" />
      </svg>
    );
  }
  return (
    <svg className="sh-mark" viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="15.2" textAnchor="middle">
        {monogramLetter(name)}
      </text>
      <path className="blue" d="M6.5 19.2h11" />
    </svg>
  );
}
