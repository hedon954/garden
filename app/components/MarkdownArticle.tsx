import { UiLangProvider } from "./UiLang";
import { siteLang, ui, type UiLang } from "../lib/i18n";
import { markdownPlugins } from "../lib/markdown-plugins";
import { remarkA2 } from "../lib/remark-a2.mjs";
import { remarkLinkCard } from "../lib/remark-link-card.mjs";
import {
  Children,
  cloneElement,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { articleHeadingBase, autoNumbersHeadings, displayHeadingLevel, splitHeadingNumber } from "../lib/content";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { rehypeHeadingAnchors } from "../../ui/garden/heading-anchors.mjs";
import { MermaidDiagram } from "./MermaidDiagram";
import { MarkdownImage } from "./MarkdownImage";
import { CodeCopy } from "./garden/chrome";
import { CodeDiff } from "./garden/chrome";
import { GardenBlock } from "./garden/GardenBlock";
import { GardenFile } from "./garden/GardenFile";
import { RefDemo } from "./garden/RefDemo";
import { remarkRefDemos } from "../lib/remark-ref-demos.mjs";
import { readGardenPayload } from "../lib/remark-garden.mjs";
import { imageSizes, linkAssets } from "@garden/generated-content";
import { imageDimensions, lookupImageSize } from "../../ui/garden/image-dims.mjs";
import { siteConfig, siteLinks } from "@garden/site-config";
import { articleLink, sameSiteMatcher } from "../../ui/garden/same-site.mjs";
import { columnRedirects, internalLinkResolver, readRedirects } from "../../ui/garden/internal-links.mjs";
import { columnHref, columns, gardenDocHref, gardenDocs, gardenDocsEn, postHref, posts, thoughts } from "../lib/content";
import { LinkCardRefresh } from "./LinkCardRefresh";
import { linkHost } from "../../scripts/link-meta-core.mjs";
import { FaviconProvider, SourceMark } from "./garden/patterns";
import { rehypeFieldTables } from "../lib/rehype-field-tables.mjs";
import { cardDate } from "../../ui/garden/card-refresh.mjs";
import { siteHref } from "../lib/site-href";
import { codeLanguageLabel, fenceLanguage } from "../../ui/garden/code-language.mjs";

// Full URLs back to this site are internal links, written as root-relative paths.
const sameSite = sameSiteMatcher(siteLinks?.address ?? "", siteLinks?.basePath ?? "");

// Links to other pages of the site render as Link. A link to an old address listed under
// redirects is rewritten to the page it moved to; a link that lands on no known page stays a plain anchor.
const siteRoute = internalLinkResolver({
  redirects: [
    ...readRedirects(siteConfig),
    ...columnRedirects({ columns: [...new Set(columns.map((entry) => entry.column).filter(Boolean))].map((slug) => ({ slug })) }),
  ],
  routes: [
    "/", "/blog", "/columns", "/thoughts", "/tags", "/about", "/garden", "/garden/en",
    ...posts.map(postHref),
    ...columns.map(columnHref),
    ...thoughts.map((thought) => `/thoughts/${thought.slug}`),
    ...gardenDocs.map(gardenDocHref),
    ...gardenDocsEn.map((doc) => siteHref(`/garden/en/${doc.path}`)),
  ],
  basePath: siteLinks?.basePath ?? "",
  // Same shape as every other address in the site (the slash follows trailingSlash).
  format: siteHref,
});

// The handbook ships with the framework and its links are written without
// any base path (/garden/…); Link adds the site's own prefix.
const handbookRoute = internalLinkResolver({
  redirects: [],
  routes: [
    "/garden", "/garden/en",
    ...gardenDocs.map(gardenDocHref),
    ...gardenDocsEn.map((doc) => siteHref(`/garden/en/${doc.path}`)),
  ],
  format: siteHref,
});

/** The site's favicon, downloaded at build time; nothing when there is none. */
function Favicon({ href }: { href: string }) {
  const src = linkAssets?.favicons?.[linkHost(href)];
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a 14px local icon, no optimisation needed
  return <img className="fav" src={src} alt="" width={14} height={14} loading="lazy" decoding="async" aria-hidden="true" />;
}

const CJK = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}";
const FIRST_WORD = new RegExp(`^(\\s*(?:[${CJK}]|[^\\s${CJK}]+))([\\s\\S]*)$`, "u");
const WORD_HEAD = new RegExp(`^(\\s*[\\p{L}\\p{N}_]+[^\\s\\p{L}\\p{N}_]?)([\\s\\S]*)$`, "u");

/**
 * The first word of a link (or its first CJK character) and the rest. A very
 * long first word, such as a bare URL or a path, keeps only its head
 * ("https:") with the icon, so the rest of it can wrap.
 */
const firstWord = (text: string) => {
  const match = FIRST_WORD.exec(text);
  if (!match) return [text, ""];
  if (match[1].trim().length > 24) {
    const head = WORD_HEAD.exec(match[1]);
    if (head) return [head[1], head[2] + match[2]];
  }
  return [match[1], match[2]];
};

/** Icon plus the link's first word on one line, so the icon never ends a line alone. */
function WithFavicon({ href, children }: { href: string; children: ReactNode }) {
  const icon = <Favicon href={href} />;
  if (!linkAssets?.favicons?.[linkHost(href)]) return <>{children}</>;
  const nodes = Children.toArray(children);
  const head = nodes[0];
  if (typeof head !== "string") return <><span className="fav-keep">{icon}</span>{children}</>;
  const [first, rest] = firstWord(head);
  return (
    <>
      <span className="fav-keep">{icon}{first}</span>
      {rest}
      {nodes.slice(1)}
    </>
  );
}

const BLOCK_LANGUAGES = ["language-mermaid"];
const isBlockLanguage = (className?: string) =>
  Boolean(className) && BLOCK_LANGUAGES.some((language) => className?.split(/\s+/u).includes(language));

function codeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as { type?: string; value?: string; children?: unknown[] };
  if (typeof record.value === "string" && record.type === "text") return record.value;
  return (record.children ?? []).map((child) => codeText(child)).join("");
}

function CodeBlock({
  className,
  children,
  node,
  ...props
}: HTMLAttributes<HTMLElement> & { node?: unknown }) {
  if (className?.includes("language-mermaid")) {
    return <MermaidDiagram source={codeText(node) || String(children ?? "").trim()} />;
  }

  const codeProps = { ...props };

  return (
    <code className={className} {...codeProps}>
      {children}
    </code>
  );
}

function stripPrefix(children: ReactNode, prefix: string): ReactNode {
  let rest = prefix;
  const walk = (node: ReactNode): ReactNode => {
    if (!rest) return node;
    if (typeof node === "string" || typeof node === "number") {
      const value = String(node);
      if (value.startsWith(rest)) {
        const kept = value.slice(rest.length);
        rest = "";
        return kept;
      }
      if (rest.startsWith(value)) {
        rest = rest.slice(value.length);
        return "";
      }
      return value;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (isValidElement<{ children?: ReactNode }>(node)) {
      return cloneElement(node, undefined, walk(node.props.children));
    }
    return node;
  };
  return walk(children);
}


/**
 * A link card. Standalone (the author's paragraph was just the link), it is the
 * link. After a paragraph that keeps the link, it is a preview: out of the tab
 * order and hidden from screen readers, since the link is already there.
 */
export function LinkCard({ href, text, standalone = true }: { href: string; text?: string; standalone?: boolean }) {
  const meta = linkAssets?.cards?.[href];
  const host = linkHost(href) || href;
  const icon = linkAssets?.favicons?.[host];
  const title = meta?.title || text || href;
  const date = cardDate(meta?.publishedTime);
  const preview = standalone ? {} : { tabIndex: -1, "aria-hidden": true as const };
  return (
    <div className="link-cards" data-card-url={href}>
      <a className="link-card" href={href} target="_blank" rel="noopener noreferrer" {...preview}>
        <span className="lc-body">
          <span className="lc-site">
            {/* eslint-disable-next-line @next/next/no-img-element -- local 14px icon */}
            {icon ? <img className="fav" src={icon} alt="" width={14} height={14} loading="lazy" decoding="async" /> : null}
            <span className="lc-sitename" data-field="siteName">{meta?.siteName || host}</span>
            {meta?.siteName && meta.siteName.toLowerCase() !== host ? <span className="lc-host">{host}</span> : null}
            <span className="lc-arrow" aria-hidden="true" />
          </span>
          <span className="lc-title" data-field="title">{title}</span>
          {meta?.description ? <span className="lc-desc" data-field="description">{meta.description}</span> : null}
          {meta?.author || date ? (
            <span className="lc-meta">
              {meta?.author ? <span data-field="author">{meta.author}</span> : null}
              {date ? <time data-field="publishedTime" dateTime={meta?.publishedTime}>{date}</time> : null}
            </span>
          ) : null}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- copied into the site at build time */}
        {meta?.image ? <img className="lc-thumb" src={meta.image} alt="" width={168} height={88} loading="lazy" decoding="async" /> : null}
      </a>
    </div>
  );
}

const headingText = (children: ReactNode) => {
  const parts: string[] = [];
  const walk = (node: ReactNode) => {
    if (typeof node === "string" || typeof node === "number") parts.push(String(node));
    else if (Array.isArray(node)) node.forEach(walk);
    else if (isValidElement<{ children?: React.ReactNode }>(node)) walk(node.props.children);
  };
  walk(children);
  return parts.join("");
};

export function MarkdownArticle({ content, numbering, lang, fieldTables, refDemos, handbook }: { content: string; numbering?: boolean; lang?: UiLang; fieldTables?: boolean; refDemos?: boolean; handbook?: boolean }) {
  const internalRoute = handbook ? handbookRoute : siteRoute;
  const t = ui(lang);
  // Optional layer 2: a Worker that refreshes card text. Without it, cards stay as built.
  const cardWorker = content.includes("{card}") ? siteConfig.linkPreview?.worker : undefined;
  const numbers = { h2: 0, h3: 0 };
  const autoNumber = autoNumbersHeadings(content, numbering);
  const headingBase = articleHeadingBase(content);
  const section = (depth: 2 | 3, children: ReactNode) => {
    const raw = headingText(children).trim();
    const split = splitHeadingNumber(raw);
    if (split) {
      if (depth === 2) { numbers.h2 += 1; numbers.h3 = 0; }
      else numbers.h3 += 1;
      const prefix = raw.slice(0, raw.length - split.text.length);
      return { no: split.no, children: stripPrefix(children, prefix) };
    }
    if (!autoNumber) return { no: "", children };
    if (depth === 2) { numbers.h2 += 1; numbers.h3 = 0; return { no: String(numbers.h2), children }; }
    numbers.h3 += 1;
    return { no: numbers.h2 ? `${numbers.h2}.${numbers.h3}` : String(numbers.h3), children };
  };
  const heading = (source: 2 | 3 | 4, children: ReactNode, props: HTMLAttributes<HTMLHeadingElement> & { node?: unknown }) => {
    const level = displayHeadingLevel(source, headingBase);
    const Tag = level === 2 ? "h2" : level === 3 ? "h3" : "h4";
    const domProps = { ...props };
    Reflect.deleteProperty(domProps, "node");
    if (level > 3) return <Tag {...domProps}>{children}</Tag>;
    const sectioned = section(level as 2 | 3, children);
    return <Tag {...domProps}>{sectioned.no ? <span className="sec-no">{sectioned.no}</span> : null}{sectioned.children}</Tag>;
  };
  const gardenComponents = {
    "garden-linkcard": (props: Record<string, string | undefined>) => (
      <LinkCard
        href={props.dataUrl ?? props["data-url"] ?? ""}
        text={props.dataText ?? props["data-text"]}
        standalone={(props.dataStandalone ?? props["data-standalone"]) === "true"}
      />
    ),
    "garden-block": (props: { dataPayload?: string; "data-payload"?: string }) => {
      const payload = props.dataPayload ?? props["data-payload"];
      const block = readGardenPayload(payload);
      if (block?.name === "file" && !block.error) return <GardenFile props={(block.props ?? {}) as Record<string, unknown>} lang={lang} />;
      return <GardenBlock dataPayload={payload} />;
    },
    "garden-refdemo": (props: { children?: ReactNode; "data-name"?: string }) => <RefDemo lang={lang === "en" ? "en" : "zh"} name={props["data-name"]}>{props.children}</RefDemo>,
    "garden-codediff": (props: {
      children?: ReactNode;
      dataDiff?: string;
      dataNew?: string;
      "data-diff"?: string;
      "data-new"?: string;
    }) => (
      <CodeDiff
        code={props.children}
        diff={decodeURIComponent(props.dataDiff ?? props["data-diff"] ?? "")}
        next={decodeURIComponent(props.dataNew ?? props["data-new"] ?? "")}
      />
    ),
  };
  return (
    <UiLangProvider lang={lang}>
    <FaviconProvider favicons={linkAssets?.favicons}>
    <div className="markdown-body prose">
      <ReactMarkdown
        remarkPlugins={[...(refDemos ? [remarkRefDemos] : []), ...markdownPlugins, remarkLinkCard, [remarkA2, { imageSize: (src: string) => lookupImageSize(imageSizes, src), lang: lang ?? siteLang }]]}
        rehypePlugins={[
          rehypeRaw,
          rehypeKatex,
          rehypeSlug,
          // Not rehype-autolink-headings "wrap": a heading with a link in it would nest <a> in <a> (React #418).
          [rehypeHeadingAnchors, { className: ["h-anchor"] }],
          rehypeHighlight,
          // Handbook only: field tables become cards on narrow screens.
          ...(fieldTables ? [rehypeFieldTables] : []),
        ]}
        components={{
          p: ({ children, ...props }) => {
            const domProps = { ...props };
            Reflect.deleteProperty(domProps, "node");
            const nodes = Children.toArray(children).filter((node) => !(typeof node === "string" && !node.trim()));
            const only = nodes.length === 1 && isValidElement<{ href?: string; children?: ReactNode }>(nodes[0]) ? nodes[0] : null;
            const href = only?.props.href;
            const text = only ? headingText(only.props.children).trim() : "";
            // Bare http(s) URL alone in a paragraph → link card (same path for every jump link).
            if (href && text === href && /^https?:\/\//iu.test(href)) return <LinkCard href={href} />;
            return <p {...domProps}>{children}</p>;
          },
          a: ({ href: written, children, ...props }) => {
            const label = headingText(children).trim();
            // Bare URL jump links stay absolute so the paragraph card path is one pipeline
            // for same-site and external alike. Titled same-site prose still uses Link.
            const bareJump = Boolean(written && label === written && /^https?:\/\//iu.test(written));
            const { href, external } = bareJump
              ? { href: written as string, external: true }
              : articleLink(written, sameSite);
            const domProps = { ...props };
            Reflect.deleteProperty(domProps, "node");
            // A link to another page of the site navigates in place, like the header and lists do.
            // No viewport prefetch: a long article can link to many pages.
            const route = external || domProps.target || domProps.download !== undefined ? null : internalRoute(href);
            if (route) {
              return (
                <Link href={route} prefetch={false} {...domProps}>
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                {...domProps}
                {...(external
                  ? { ...(domProps.className ? { className: `ext ${domProps.className}` } : { className: "ext" }), target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {external && href && /\bg-src-chip\b/u.test(String(domProps.className ?? ""))
                  ? <><SourceMark href={href} /><span>{children}</span></>
                  : <>{external && href ? <WithFavicon href={href}>{children}</WithFavicon> : children}</>}
              </a>
            );
          },
          img: (props) => {
            const size = lookupImageSize(imageSizes, typeof props.src === "string" ? props.src : undefined);
            const dims = imageDimensions(props, size);
            return <MarkdownImage {...props} {...dims} style={{ ...props.style, ...dims.style }} />;
          },
          table: ({ children, ...props }) => (
            <div className={/\bfield-table\b/u.test(String(props.className ?? "")) ? "table-wrap field-wrap" : "table-wrap"} role="region" aria-label={t.tableScroll} tabIndex={0}>
              <table {...props}>{children}</table>
            </div>
          ),
          h2: ({ children, ...props }) => heading(2, children, props),
          h3: ({ children, ...props }) => heading(3, children, props),
          h4: ({ children, ...props }) => heading(4, children, props),
          code: CodeBlock,
          ...gardenComponents,
          pre: ({ children, ...props }) => {
            const child = Children.toArray(children)[0];
            const className = isValidElement<{ className?: string }>(child)
              ? child.props.className
              : undefined;
            const language = fenceLanguage(className);
            const preProps = { ...props };
            delete preProps.node;

            if (isBlockLanguage(className)) {
              return <>{children}</>;
            }

            return (
              <CodeCopy>
                <pre className="code" {...preProps} data-language={codeLanguageLabel(language) || undefined}>
                  {children}
                </pre>
              </CodeCopy>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {cardWorker ? <LinkCardRefresh endpoint={cardWorker} /> : null}
    </div>
    </FaviconProvider>
    </UiLangProvider>
  );
}
