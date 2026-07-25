import Link from "next/link";
import {
  ArrowUpRight,
  ImageSquare,
  LinkSimple,
  MusicNotes,
  SquaresFour,
  VideoCamera,
} from "@phosphor-icons/react/ssr";
import {
  type ContentEntry,
  type MediaItem,
  formatDate,
} from "../lib/content";
import { MarkdownArticle } from "./MarkdownArticle";

const icons = {
  image: ImageSquare,
  audio: MusicNotes,
  video: VideoCamera,
  link: LinkSimple,
  text: LinkSimple,
};

type MediaGroup =
  | { type: "images"; items: MediaItem[] }
  | { type: "audio" | "video" | "link"; item: MediaItem };

function groupMedia(items: MediaItem[]) {
  return items.reduce<MediaGroup[]>((groups, item) => {
    if (item.type === "image") {
      const previous = groups.at(-1);
      if (previous?.type === "images") {
        previous.items.push(item);
      } else {
        groups.push({ type: "images", items: [item] });
      }
      return groups;
    }
    groups.push({ type: item.type, item });
    return groups;
  }, []);
}

function videoMime(src: string, explicit?: string) {
  if (explicit) return explicit;
  const extension = new URL(src, "https://local.invalid").pathname
    .split(".")
    .at(-1)
    ?.toLowerCase();
  if (extension === "webm") return "video/webm";
  if (extension === "ogg" || extension === "ogv") return "video/ogg";
  return "video/mp4";
}

export function ThoughtCard({
  thought,
  showPermalink = true,
}: {
  thought: ContentEntry;
  showPermalink?: boolean;
}) {
  const media = Array.isArray(thought.media) ? thought.media : [];
  const isMixed = media.length > 1;
  const Icon = isMixed ? SquaresFour : icons[thought.mediaType ?? "text"];
  const mediaGroups = groupMedia(media);

  return (
    <article id={thought.slug} className="thought-card h-entry">
      <Link className="u-url sr-only" href={`/thoughts/${thought.slug}`}>
        {thought.title} 永久链接
      </Link>
      <a
        className="p-author h-card sr-only"
        href="https://github.com/hedon954"
        rel="author"
      >
        Hedon
      </a>
      <header>
        <span className="thought-kind">
          <Icon size={16} />
          {isMixed
            ? `混合记录 · ${media.length} 个附件`
            : thought.mediaType === "image"
            ? "一张照片"
            : thought.mediaType === "audio"
              ? "一段声音"
              : thought.mediaType === "video"
                ? "一段影像"
                : thought.mediaType === "link"
                  ? "一个链接"
                  : "随想"}
        </span>
        <time className="dt-published" dateTime={thought.date}>
          {formatDate(thought.date, true)}
        </time>
      </header>

      <h2 className="p-name">{thought.title}</h2>
      <div className="e-content">
        <MarkdownArticle content={thought.content} />
      </div>

      {mediaGroups.length > 0 && (
        <div className="thought-media-stack">
          {mediaGroups.map((group, groupIndex) => {
            if (group.type === "images") {
              return (
                <div
                  className={`thought-gallery thought-gallery-${Math.min(group.items.length, 3)}`}
                  key={`images-${groupIndex}`}
                  aria-label={`${group.items.length} 张照片`}
                >
                  {group.items.map((item, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${item.src}-${index}`}
                      className="thought-image u-photo"
                      src={item.src}
                      alt={item.alt ?? `${thought.title} · 照片 ${index + 1}`}
                      loading="lazy"
                    />
                  ))}
                </div>
              );
            }
            if (group.type === "audio") {
              return (
                <div className="audio-embed" key={`${group.item.src}-${groupIndex}`}>
                  <MusicNotes size={28} />
                  <div>
                    <strong>{group.item.title ?? `当前播放 · ${thought.title}`}</strong>
                    <audio
                      className="u-audio"
                      controls
                      preload="none"
                      src={group.item.src}
                    >
                      你的浏览器不支持音频播放。
                    </audio>
                  </div>
                </div>
              );
            }
            if (group.type === "video") {
              return (
                <video
                  className="thought-video u-video"
                  controls
                  preload="metadata"
                  poster={group.item.poster}
                  key={`${group.item.src}-${groupIndex}`}
                >
                  <source
                    src={group.item.src}
                    type={videoMime(group.item.src, group.item.mime)}
                  />
                </video>
              );
            }
            return (
              <Link
                className="link-embed u-bookmark-of"
                href={group.item.src}
                target="_blank"
                rel="noopener noreferrer"
                key={`${group.item.src}-${groupIndex}`}
              >
                <span>
                  <small>{new URL(group.item.src).hostname}</small>
                  <strong>{group.item.title ?? group.item.src}</strong>
                  {group.item.description && <p>{group.item.description}</p>}
                </span>
                <ArrowUpRight size={22} />
              </Link>
            );
          })}
        </div>
      )}

      {!Array.isArray(thought.media) && thought.mediaType === "image" && thought.media && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="thought-image u-photo"
          src={thought.media}
          alt={thought.mediaAlt ?? thought.title}
          loading="lazy"
        />
      )}
      {!Array.isArray(thought.media) && thought.mediaType === "audio" && thought.media && (
        <div className="audio-embed">
          <MusicNotes size={28} />
          <div>
            <strong>当前播放 · {thought.title}</strong>
            <audio
              className="u-audio"
              controls
              preload="none"
              src={thought.media}
            >
              你的浏览器不支持音频播放。
            </audio>
          </div>
        </div>
      )}
      {!Array.isArray(thought.media) && thought.mediaType === "video" && thought.media && (
        <video
          className="thought-video u-video"
          controls
          preload="metadata"
          poster={thought.poster}
        >
          <source src={thought.media} type={videoMime(thought.media)} />
        </video>
      )}
      {!Array.isArray(thought.media) && thought.mediaType === "link" && thought.media && (
        <Link
          className="link-embed u-bookmark-of"
          href={thought.media}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            <small>{new URL(thought.media).hostname}</small>
            <strong>{thought.linkTitle}</strong>
            <p>{thought.linkDescription}</p>
          </span>
          <ArrowUpRight size={22} />
        </Link>
      )}

      {showPermalink && (
        <Link className="thought-permalink" href={`/thoughts/${thought.slug}`}>
          永久链接
          <ArrowUpRight size={15} />
        </Link>
      )}
    </article>
  );
}
