"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { sourceIcon } from "../../../ui/garden/source-icon.mjs";
import { circled, labelFits, legendLine, placeMarks, relationKeyAction, RELATION_COMPACT_WIDTH, RELATION_LABEL_FONT_MIN, relationEdges, relationHeights, relationIndex, relationLayout, relationLines, type RelationEdge as Edge } from "../../../ui/garden/relations.mjs";
import ReactMarkdown from "react-markdown";
import {
  Bell,
  BookOpen,
  ChartBar,
  ChatCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Flag,
  Flask,
  Gear,
  Heart,
  Lightbulb,
  LinkSimple,
  MagnifyingGlass,
  MapPin,
  Question,
  ShieldCheck,
  Star,
  Target,
  User,
  Wallet,
  XCircle,
  type IconProps,
} from "@phosphor-icons/react/ssr";
import { useUi, useUiLang } from "../UiLang";
import { markdownPlugins } from "../../lib/markdown-plugins";

function Rich({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={markdownPlugins} components={{ p: ({ children }) => <>{children}</> }}>
      {String(text ?? "")}
    </ReactMarkdown>
  );
}

/** Line icons an author can name in `icon:`. Unknown names draw nothing. */
export const GARDEN_ICONS: Record<string, ComponentType<IconProps>> = {
  search: MagnifyingGlass,
  eye: Eye,
  heart: Heart,
  chat: ChatCircle,
  shield: ShieldCheck,
  wallet: Wallet,
  bell: Bell,
  check: CheckCircle,
  x: XCircle,
  star: Star,
  flag: Flag,
  clock: Clock,
  idea: Lightbulb,
  book: BookOpen,
  link: LinkSimple,
  user: User,
  chart: ChartBar,
  gear: Gear,
  file: FileText,
  pin: MapPin,
  flask: Flask,
  target: Target,
  question: Question,
};

export function GardenIcon({ name, size = 18 }: { name: unknown; size?: number }) {
  const Icon = typeof name === "string" ? GARDEN_ICONS[name.trim().toLowerCase()] : undefined;
  return Icon ? <Icon className="g-ic" size={size} weight="regular" aria-hidden="true" /> : null;
}

const textsOf = (value: unknown) => (value == null ? [] : Array.isArray(value) ? value.map(String) : [String(value)]);
const itemsOf = (props: Record<string, unknown>) =>
  (Array.isArray(props.items) ? props.items : []).map((item) => (typeof item === "string" ? { text: item } : (item ?? {}) as Record<string, unknown>));

/* ---------- list: icon rows (compact card) or icon steps (titled rows) ---------- */

export function GardenList({ props }: { props: Record<string, unknown> }) {
  const items = itemsOf(props);
  const titled = items.some((item) => item.title);
  return (
    <figure className={`g-list ${titled ? "g-list-steps" : "g-list-rows"}`}>
      {typeof props.title === "string" ? <p className="g-list-h"><Rich text={props.title} /></p> : null}
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            <span className="g-list-ic"><GardenIcon name={item.icon} size={titled ? 20 : 17} /></span>
            <div className="g-list-b">
              {item.title ? <p className="g-list-t"><Rich text={String(item.title)} /></p> : null}
              {textsOf(item.text).map((text, textIndex) => <p key={textIndex} className="g-list-x"><Rich text={text} /></p>)}
            </div>
          </li>
        ))}
      </ul>
      {typeof props.caption === "string" ? <figcaption><Rich text={props.caption} /></figcaption> : null}
    </figure>
  );
}

/* ---------- choice: two or three option cards, pick one ---------- */

export function GardenChoice({ props }: { props: Record<string, unknown> }) {
  const items = itemsOf(props);
  const [picked, setPicked] = useState<number | null>(null);
  const base = useId();
  const title = typeof props.title === "string" ? props.title : "";
  const move = (index: number, step: number) => {
    const next = (index + step + count) % count;
    setPicked(next);
    document.getElementById(`${base}-${next}`)?.focus();
  };
  const none = props.none && typeof props.none === "object" ? (props.none as Record<string, unknown>) : null;
  const noneLabel = none && typeof none.label === "string" ? none.label : "";
  const count = items.length + (noneLabel ? 1 : 0);
  const chosen = picked === null ? null : picked < items.length ? items[picked] : none;
  const reply = chosen ? String(chosen.reply ?? "") : "";
  return (
    <figure className="g-choice">
      {title ? <p className="g-choice-h" id={`${base}-h`}><Rich text={title} /></p> : null}
      <div className="g-choice-group" role="radiogroup" aria-labelledby={title ? `${base}-h` : undefined}>
      <div className="g-choice-opts" data-n={items.length}>
        {items.map((item, index) => {
          const on = picked === index;
          return (
            <button
              key={index}
              id={`${base}-${index}`}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (picked === null && index === 0) ? 0 : -1}
              className="g-choice-opt"
              onClick={() => setPicked(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); move(index, 1); }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); move(index, -1); }
              }}
            >
              {item.icon ? <span className="g-choice-ic"><GardenIcon name={item.icon} size={26} /></span> : null}
              {item.value != null ? <span className="g-choice-v">{String(item.value)}</span> : null}
              {item.text ? <span className="g-choice-x"><Rich text={String(item.text)} /></span> : null}
              {item.label ? <span className="g-choice-l"><span className="g-choice-dot" aria-hidden="true" />{String(item.label)}</span> : null}
            </button>
          );
        })}
      </div>
      {noneLabel ? (
        <button
          id={`${base}-${items.length}`}
          type="button"
          role="radio"
          aria-checked={picked === items.length}
          tabIndex={picked === items.length ? 0 : -1}
          className="g-choice-none"
          onClick={() => setPicked(items.length)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); move(items.length, 1); }
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); move(items.length, -1); }
          }}
        >{noneLabel}</button>
      ) : null}
      </div>
      {items.some((item) => item.reply) || none?.reply ? <p className="g-choice-reply" aria-live="polite" hidden={!reply}>{reply ? <Rich text={reply} /> : null}</p> : null}
      {typeof props.caption === "string" ? <figcaption><Rich text={props.caption} /></figcaption> : null}
    </figure>
  );
}

/* ---------- relations: 3-6 key elements on a circle, with explicit directed links ---------- */

type Box = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
type Drawn = { d: string; dashed: boolean; both: boolean; label: string; at: Pt };

const center = (box: Box): Pt => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

/** Where the ray from the box centre towards `to` leaves the box (plus a small gap). */
function edge(box: Box, to: Pt, gap = 6): Pt {
  const c = center(box);
  const dx = to.x - c.x;
  const dy = to.y - c.y;
  if (!dx && !dy) return c;
  const scale = Math.min(dx ? (box.w / 2 + gap) / Math.abs(dx) : Infinity, dy ? (box.h / 2 + gap) / Math.abs(dy) : Infinity);
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

type Placed = Drawn & { badge: number };

let measureCanvas: HTMLCanvasElement | null = null;
function textWidth(text: string, font: string) {
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return text.length * 7;
  ctx.font = font;
  return ctx.measureText(text).width;
}

export function GardenRelations({ props }: { props: Record<string, unknown> }) {
  const t = useUi();
  const lang = useUiLang();
  const items = itemsOf(props).slice(0, 6); // parse rejects counts outside 3..6
  const titles = items.map((item) => String(item.title ?? ""));
  const edges = relationEdges(props, titles);
  const lines = relationLines(edges, titles);
  const n = items.length;
  const centre = props.center == null ? -1 : relationIndex(props.center, titles);
  const layout = relationLayout(n, centre);
  const ringRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState<Placed[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const base = useId().replace(/:/gu, "");
  const edgeKey = JSON.stringify({ edges, centre, n });

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const { edges: parsed, centre: middle, n: count } = JSON.parse(edgeKey) as { edges: Edge[]; centre: number; n: number };
    let lastWidth = -1;
    const draw = () => {
      const width = ring.clientWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;
      const small = width < RELATION_COMPACT_WIDTH;
      // Apply the compact styles before measuring, so node sizes match what React renders next.
      const figure = ring.closest("figure");
      if (small) figure?.setAttribute("data-compact", "true");
      else figure?.removeAttribute("data-compact");
      setCompact(small);
      const { spots, outer } = relationLayout(count, middle, small);
      const nodes = [...ring.querySelectorAll<HTMLElement>(":scope > .g-rel-node")];
      // Same layout at every width: place each node by percent of the width, then size the canvas to the nodes.
      nodes.forEach((node, i) => { node.style.left = `${spots[i].x}%`; node.style.width = `${spots[i].w}%`; });
      const minRy = small ? Math.max(90, width * 0.26) : Math.min(200, Math.max(120, width * 0.2)) * (middle >= 0 ? 1.25 : 1);
      const { ys, height } = relationHeights(spots, nodes.map((node) => node.offsetHeight), small ? 40 : 48, minRy);
      nodes.forEach((node, i) => { node.style.top = `${ys[i]}px`; });
      ring.style.height = `${Math.ceil(height)}px`;
      const frame = ring.getBoundingClientRect();
      const boxes = nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.left - frame.left, y: r.top - frame.top, w: r.width, h: r.height };
      });
      const hub = { x: frame.width / 2, y: frame.height / 2 };
      const geometry = parsed.map((link) => {
        const from = boxes[link.from];
        const to = boxes[link.to];
        const cf = center(from);
        const ct = center(to);
        const gapStart = link.both ? 10 : 6;
        const rf = spots[link.from].ring;
        const rt = spots[link.to].ring;
        const neighbours = rf >= 0 && rt >= 0 && outer > 3 && (Math.abs(rf - rt) === 1 || Math.abs(rf - rt) === outer - 1);
        if (neighbours && !small) {
          // Next to each other on the outer ring: a gentle arc that bows outward.
          const mid = { x: (cf.x + ct.x) / 2, y: (cf.y + ct.y) / 2 };
          const out = { x: mid.x - hub.x, y: mid.y - hub.y };
          const length = Math.hypot(out.x, out.y) || 1;
          const bow = Math.min(small ? 24 : 40, Math.hypot(ct.x - cf.x, ct.y - cf.y) / 4);
          const c = { x: mid.x + (out.x / length) * bow, y: mid.y + (out.y / length) * bow };
          const a = edge(from, c, gapStart);
          const b = edge(to, c, 10);
          const at = (k: number) => ({ x: (1 - k) ** 2 * a.x + 2 * (1 - k) * k * c.x + k ** 2 * b.x, y: (1 - k) ** 2 * a.y + 2 * (1 - k) * k * c.y + k ** 2 * b.y });
          return { d: `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`, a, b, at, link };
        }
        const a = edge(from, ct, gapStart);
        const b = edge(to, cf, 10);
        const at = (k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
        return { d: `M${a.x},${a.y} L${b.x},${b.y}`, a, b, at, link };
      });
      // Labels that do not fit on their line at 12px become circled numbers listed under the graph.
      // Every mark gets a spot that overlaps no node and no other mark.
      const font = `500 ${RELATION_LABEL_FONT_MIN + 0.5}px ${getComputedStyle(ring).fontFamily}`;
      const marks = geometry.map((g) => {
        if (!g.link.label) return { a: g.a, b: g.b, at: g.at, w: 0, h: 0, badge: false };
        const size = { width: textWidth(g.link.label, font) + 12, height: 20 };
        return { a: g.a, b: g.b, at: g.at, w: size.width, h: size.height, badge: !labelFits(size, g.a, g.b, g.at(0.5), []) };
      });
      const spots2 = placeMarks(marks, boxes, { w: frame.width, h: frame.height });
      let badge = 0;
      setDrawn(geometry.map((g, i) => {
        const spot = spots2[i];
        const number = spot?.badge ? badge++ : -1;
        return { d: g.d, dashed: g.link.dashed, both: g.link.both, label: g.link.label, at: spot ?? g.at(0.5), badge: number };
      }));
      setSize({ w: frame.width, h: frame.height });
    };
    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(ring);
    return () => observer.disconnect();
  }, [edgeKey]);

  const label = typeof props.title === "string" ? props.title : t.relations;
  const legend = drawn.map((line, index) => ({ line, edge: edges[index] })).filter(({ line }) => line.badge >= 0);
  return (
    <figure
      className="g-rel"
      role="group"
      aria-label={label}
      data-compact={compact ? "true" : undefined}
      onKeyDown={(event) => {
        // Esc closes the details panel and puts focus back on the node that opened it.
        const action = relationKeyAction(event.key, open);
        if (!action.close) return;
        event.preventDefault();
        setOpen(null);
        if (action.focus !== null) ringRef.current?.querySelectorAll<HTMLElement>(":scope > .g-rel-node")[action.focus]?.focus();
      }}
    >
      {typeof props.title === "string" ? <p className="g-rel-h"><Rich text={props.title} /></p> : null}
      <div className="g-rel-ring" ref={ringRef} data-n={n} data-center={layout.centre >= 0 ? "true" : undefined}>
        {items.map((item, index) => {
          const spot = layout.spots[index];
          return (
            <button
              type="button"
              className="g-rel-node"
              key={index}
              data-i={index + 1}
              data-center={index === layout.centre ? "true" : undefined}
              aria-expanded={compact ? open === index : undefined}
              aria-controls={compact ? `${base}-d` : undefined}
              tabIndex={compact ? 0 : -1}
              onClick={() => { if (compact) setOpen(open === index ? null : index); }}
              style={{ "--x": `${spot.x}%`, "--y": `${50 + spot.s * 38}%`, "--w": `${spot.w}%` } as CSSProperties}
            >
              <span className="g-rel-t"><Rich text={titles[index]} /></span>
              {item.text ? <span className="g-rel-x"><Rich text={String(item.text)} /></span> : null}
              {lines[index].length ? (
                <span className="g-rel-out">
                  {lines[index].map((line, k) => (
                    <span key={k}>
                      {k ? " · " : null}
                      {line.mark} {line.to}{line.label ? ` ${line.label}` : ""}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
        {size.w ? (
          <svg className="g-rel-svg" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
            <defs>
              <marker id={`${base}-a`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M1,1 L9,5 L1,9 Z" />
              </marker>
            </defs>
            {drawn.map((line, index) => (
              <path
                key={index}
                d={line.d}
                className={line.dashed ? "dash" : undefined}
                markerEnd={`url(#${base}-a)`}
                markerStart={line.both ? `url(#${base}-a)` : undefined}
              />
            ))}
          </svg>
        ) : null}
        {drawn.map((line, index) => line.label ? (
          <span
            key={`l${index}`}
            className={line.badge >= 0 ? "g-rel-label g-rel-badge" : "g-rel-label"}
            aria-hidden="true"
            style={{ left: `${line.at.x}px`, top: `${line.at.y}px` }}
          >{line.badge >= 0 ? circled(line.badge) : line.label}</span>
        ) : null)}
      </div>
      {compact && open !== null ? (
        <div className="g-rel-detail" id={`${base}-d`} aria-live="polite">
          <span className="g-rel-detail-t"><Rich text={titles[open]} /></span>
          {items[open]?.text ? <span className="g-rel-detail-x"><Rich text={String(items[open].text)} /></span> : null}
        </div>
      ) : null}
      {legend.length ? (
        <ol className="g-rel-legend" aria-label={t.relationsLegend}>
          {legend.map(({ line, edge: e }) => <li key={line.badge}>{legendLine(line.badge, e, titles, lang === "en" ? "en" : "zh")}</li>)}
        </ol>
      ) : null}
      {typeof props.caption === "string" ? <figcaption><Rich text={props.caption} /></figcaption> : null}
    </figure>
  );
}

export function VerdictIcon({ verdict }: { verdict: string }): ReactNode {
  if (verdict === "good") return <CheckCircle className="g-ic g-verdict-ic good" size={20} aria-hidden="true" />;
  if (verdict === "bad") return <XCircle className="g-ic g-verdict-ic bad" size={20} aria-hidden="true" />;
  return null;
}

/** The site's mark: its build-time favicon, else the registrable domain's first letter. */
type Favicons = Record<string, { file?: string } | string>;
const FaviconContext = createContext<Favicons>({});

/** The build-time favicons, handed down from the server so client blocks match inline links. */
export function FaviconProvider({ favicons, children }: { favicons?: Favicons; children: ReactNode }) {
  return <FaviconContext.Provider value={favicons ?? {}}>{children}</FaviconContext.Provider>;
}

export function SourceMark({ href, icon }: { href: string; icon?: string }) {
  const mark = sourceIcon(href, useContext(FaviconContext), icon);
  return mark.src
    // eslint-disable-next-line @next/next/no-img-element -- a 14px site icon
    ? <img className="g-src-fav" src={mark.src} alt="" width={14} height={14} decoding="async" aria-hidden="true" />
    : <span className="g-src-ic" aria-hidden="true">{mark.letter}</span>;
}
