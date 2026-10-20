"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { sourceIcon } from "../../../ui/garden/source-icon.mjs";
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
import { useUi } from "../UiLang";
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

/* ---------- cycle: nodes on a ring, curved arrows clockwise, optional dashed links ---------- */

type Box = { x: number; y: number; w: number; h: number };
type Arrow = { d: string; dashed: boolean };

const center = (box: Box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

/** Where the ray from the box centre towards `to` leaves the box (plus a small gap). */
function edge(box: Box, to: { x: number; y: number }, gap = 6) {
  const c = center(box);
  const dx = to.x - c.x;
  const dy = to.y - c.y;
  if (!dx && !dy) return c;
  const scale = Math.min(dx ? (box.w / 2 + gap) / Math.abs(dx) : Infinity, dy ? (box.h / 2 + gap) / Math.abs(dy) : Infinity);
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

function ringArrow(from: Box, to: Box, hub: { x: number; y: number }, stacked: boolean): string {
  if (stacked) {
    // One column: short straight arrow from the bottom of one node to the top of the next.
    const a = { x: from.x + from.w / 2, y: from.y + from.h + 4 };
    const b = { x: to.x + to.w / 2, y: to.y - 6 };
    return `M${a.x},${a.y} L${b.x},${b.y}`;
  }
  const cf = center(from);
  const ct = center(to);
  // Leave from the side facing the next node along the ring, arrive on the side facing back.
  const corner = { x: Math.abs(cf.x - hub.x) > Math.abs(ct.x - hub.x) ? cf.x : ct.x, y: Math.abs(cf.y - hub.y) > Math.abs(ct.y - hub.y) ? cf.y : ct.y };
  const near = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y) < Math.max(from.h, to.h) / 2;
  if (near(corner, cf) || near(corner, ct)) {
    // Neighbours in one row or column: a gentle arc that bows away from the middle.
    const a = edge(from, ct);
    const b = edge(to, cf);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const out = { x: mid.x - hub.x, y: mid.y - hub.y };
    const length = Math.hypot(out.x, out.y) || 1;
    const bow = Math.min(36, Math.hypot(b.x - a.x, b.y - a.y) / 3);
    return `M${a.x},${a.y} Q${mid.x + (out.x / length) * bow},${mid.y + (out.y / length) * bow} ${b.x},${b.y}`;
  }
  const a = edge(from, corner);
  const b = edge(to, corner);
  return `M${a.x},${a.y} Q${corner.x},${corner.y} ${b.x},${b.y}`;
}

function loopBack(last: Box, first: Box, width: number): string {
  // One column: run down the right gutter from the last node back up to the first.
  const x = Math.min(width - 6, Math.max(last.x + last.w, first.x + first.w) + 14);
  const a = { x: last.x + last.w + 4, y: last.y + last.h / 2 };
  const b = { x: first.x + first.w + 8, y: first.y + first.h / 2 };
  return `M${a.x},${a.y} C${x},${a.y} ${x},${a.y} ${x},${a.y - 12} L${x},${b.y + 12} C${x},${b.y} ${x},${b.y} ${b.x},${b.y}`;
}

function linkIndex(value: unknown, titles: string[]) {
  if (typeof value === "number") return value - 1;
  const text = String(value ?? "").trim();
  if (/^\d+$/u.test(text)) return Number(text) - 1;
  return titles.indexOf(text);
}

export function GardenCycle({ props }: { props: Record<string, unknown> }) {
  const t = useUi();
  const items = itemsOf(props).slice(0, 6);
  const titles = items.map((item) => String(item.title ?? ""));
  const links = (Array.isArray(props.links) ? props.links : [])
    .map((link) => link as Record<string, unknown>)
    .map((link) => ({ from: linkIndex(link.from, titles), to: linkIndex(link.to, titles) }))
    .filter((link) => link.from >= 0 && link.to >= 0 && link.from < items.length && link.to < items.length && link.from !== link.to);
  const ringRef = useRef<HTMLDivElement>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const base = useId().replace(/:/gu, "");

  const linkKey = JSON.stringify(links);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const parsedLinks = JSON.parse(linkKey) as { from: number; to: number }[];
    const draw = () => {
      const frame = ring.getBoundingClientRect();
      const boxes = [...ring.querySelectorAll<HTMLElement>(":scope > .g-cycle-node")].map((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.left - frame.left, y: r.top - frame.top, w: r.width, h: r.height };
      });
      if (boxes.length < 2) { setArrows([]); return; }
      const stacked = getComputedStyle(ring).display !== "grid" || ring.dataset.stacked === "true" || boxes.every((box) => Math.abs(box.x - boxes[0].x) < 2);
      const hub = { x: frame.width / 2, y: frame.height / 2 };
      const next: Arrow[] = boxes.map((box, index) => {
        const to = boxes[(index + 1) % boxes.length];
        if (stacked && index === boxes.length - 1) return { d: loopBack(box, to, frame.width), dashed: false };
        return { d: ringArrow(box, to, hub, stacked), dashed: false };
      });
      if (!stacked) {
        for (const link of parsedLinks) {
          const from = boxes[link.from];
          const to = boxes[link.to];
          const a = edge(from, center(to), 8);
          const b = edge(to, center(from), 10);
          next.push({ d: `M${a.x},${a.y} L${b.x},${b.y}`, dashed: true });
        }
      }
      setSize({ w: frame.width, h: frame.height });
      setArrows(next);
    };
    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(ring);
    return () => observer.disconnect();
  }, [linkKey]);

  const n = items.length;
  return (
    <figure className="g-cycle" role="group" aria-label={typeof props.title === "string" ? props.title : t.cycle}>
      {typeof props.title === "string" ? <p className="g-cycle-h"><Rich text={props.title} /></p> : null}
      <div className="g-cycle-ring" ref={ringRef} data-n={n}>
        {items.map((item, index) => (
          <div className="g-cycle-node" key={index} data-i={index + 1}>
            <p className="g-cycle-t"><Rich text={String(item.title ?? "")} /></p>
            {item.text ? <p className="g-cycle-x"><Rich text={String(item.text)} /></p> : null}
          </div>
        ))}
        {size.w ? (
          <svg className="g-cycle-svg" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
            <defs>
              <marker id={`${base}-a`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M1,1 L9,5 L1,9 Z" />
              </marker>
            </defs>
            {arrows.map((arrow, index) => (
              <path key={index} d={arrow.d} className={arrow.dashed ? "dash" : undefined} markerEnd={`url(#${base}-a)`} />
            ))}
          </svg>
        ) : null}
      </div>
      <ol className="sr-only">
        {items.map((item, index) => <li key={index}>{String(item.title ?? "")}{index === n - 1 && n > 1 ? ` → ${String(items[0].title ?? "")}` : ""}</li>)}
      </ol>
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
    ? <img className="g-src-fav" src={mark.src} alt="" width={14} height={14} loading="lazy" decoding="async" aria-hidden="true" />
    : <span className="g-src-ic" aria-hidden="true">{mark.letter}</span>;
}
