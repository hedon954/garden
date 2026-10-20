import {
  ArrowUpRight,
  LinkSimple,
  VideoCamera,
  WechatLogo,
  XLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/ssr";
import { parse } from "yaml";
import { ui, type UiLang } from "../lib/i18n";

type EmbedData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

type EmbedProvider = "youtube" | "bilibili" | "x" | "wechat" | "website";

function readEmbedData(source: string): EmbedData | null {
  try {
    const value = parse(source.trim()) as unknown;
    const input = typeof value === "string" ? { url: value } : value;
    if (!input || typeof input !== "object" || !("url" in input) || typeof input.url !== "string") return null;
    const url = new URL(input.url);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return {
      url: url.toString(),
      title: "title" in input && typeof input.title === "string" ? input.title : undefined,
      description: "description" in input && typeof input.description === "string" ? input.description : undefined,
      image: "image" in input && typeof input.image === "string" && /^https?:\/\//u.test(input.image) ? input.image : undefined,
    };
  } catch {
    return null;
  }
}

function providerFor(url: URL): EmbedProvider {
  const hostname = url.hostname.replace(/^www\./u, "");
  if (["youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"].includes(hostname)) return "youtube";
  if (hostname === "bilibili.com" || hostname.endsWith(".bilibili.com")) return "bilibili";
  if (["x.com", "twitter.com", "mobile.twitter.com"].includes(hostname)) return "x";
  if (hostname === "mp.weixin.qq.com") return "wechat";
  return "website";
}

function youtubeId(url: URL) {
  if (url.hostname.replace(/^www\./u, "") === "youtu.be") return url.pathname.split("/").filter(Boolean)[0];
  if (url.searchParams.get("v")) return url.searchParams.get("v") ?? undefined;
  const parts = url.pathname.split("/").filter(Boolean);
  if (["embed", "shorts", "live"].includes(parts[0])) return parts[1];
  return undefined;
}

function bilibiliPlayerUrl(url: URL) {
  const match = url.pathname.match(/\/video\/(BV[0-9A-Za-z]+|av\d+)/u);
  const identifier = match?.[1] ?? url.searchParams.get("bvid") ?? url.searchParams.get("aid");
  if (!identifier) return null;
  const key = identifier.toLowerCase().startsWith("av") || /^\d+$/u.test(identifier) ? "aid" : "bvid";
  const value = identifier.toLowerCase().startsWith("av") ? identifier.slice(2) : identifier;
  return `https://player.bilibili.com/player.html?${key}=${encodeURIComponent(value)}&high_quality=1&danmaku=0`;
}

function playableUrl(provider: EmbedProvider, url: URL) {
  if (provider === "youtube") {
    const id = youtubeId(url);
    return id && /^[0-9A-Za-z_-]+$/u.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (provider === "bilibili") return bilibiliPlayerUrl(url);
  return null;
}

export function ExternalEmbed({ source, lang }: { source: string; lang?: UiLang }) {
  const s = ui(lang);
  const data = readEmbedData(source);
  if (!data) {
    return <p className="external-embed-error">{s.embedParseError}</p>;
  }

  const url = new URL(data.url);
  const provider = providerFor(url);
  const playerUrl = playableUrl(provider, url);
  const providerCopy = {
    youtube: { label: "YouTube", Icon: YoutubeLogo },
    bilibili: { label: "Bilibili", Icon: VideoCamera },
    x: { label: "X", Icon: XLogo },
    wechat: { label: s.embedProviderWechat, Icon: WechatLogo },
    website: { label: s.embedProviderWeb, Icon: LinkSimple },
  };
  const { Icon, label } = providerCopy[provider];

  if (playerUrl) {
    return (
      <figure className={`external-embed external-embed-${provider}`}>
        <div className="external-embed-frame">
          <iframe
            src={playerUrl}
            title={data.title ?? s.embedFrameTitle(label)}
            loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <figcaption>
          <span><Icon size={17} />{label}</span>
          <a href={data.url} target="_blank" rel="noopener noreferrer">{s.embedOpenOriginal}<ArrowUpRight size={14} /></a>
        </figcaption>
      </figure>
    );
  }

  return (
    <a className={`external-embed-card external-embed-${provider}`} href={data.url} target="_blank" rel="noopener noreferrer">
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt="" loading="lazy" />
      )}
      <span className="external-embed-copy">
        <small><Icon size={16} />{label} · {url.hostname}</small>
        <strong>{data.title ?? s.embedFallbackTitle}</strong>
        <p>{data.description ?? (provider === "x" || provider === "wechat" ? s.embedFallbackNoScript : s.embedFallbackWeb)}</p>
      </span>
      <ArrowUpRight size={21} />
    </a>
  );
}
