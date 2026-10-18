export { safeFileHref } from "../../../ui/garden/file-block.mjs";

// Icons for `garden file`. No hooks: used by the server card and the client drawer alike.
const PAGE = "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z";
const FOLD = "M14 3v5h5";
const MARKS: Record<string, string> = {
  doc: "M9 13h6M9 17h4",
  code: "m10 12-2 2 2 2M14 12l2 2-2 2",
  archive: "M11 6h1M11 9h1M11 12h1M10.5 15h2v3h-2z",
  file: "",
};
const GLYPHS: Record<string, string[]> = {
  download: ["M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"],
  eye: ["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"],
  external: ["M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"],
  close: ["M6 6l12 12M18 6 6 18"],
};

const svgProps = {
  className: "gf-i",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export function FileGlyph({ kind }: { kind?: string }) {
  const mark = MARKS[kind ?? "file"] ?? "";
  return (
    <svg {...svgProps}>
      <path d={PAGE} />
      <path d={FOLD} />
      {mark ? <path d={mark} /> : null}
    </svg>
  );
}

export function ActionGlyph({ name }: { name: keyof typeof GLYPHS }) {
  return (
    <svg {...svgProps}>
      {GLYPHS[name].map((d) => <path key={d} d={d} />)}
      {name === "eye" ? <circle cx="12" cy="12" r="2.8" /> : null}
    </svg>
  );
}
