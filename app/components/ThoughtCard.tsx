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
import { githubUrl, siteConfig } from "../site.config";
import { MarkdownArticle } from "./MarkdownArticle";
import { siteHref } from "../lib/site-href";
import { siteLang, ui } from "../lib/i18n";

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
  const t = ui();

  return (
    <article id={thought.slug} className="thought-card h-entry">
      <Link className="u-url sr-only" href={siteHref(`/thoughts/${thought.slug}`)}>
        {siteLang === "en" ? t.permalinkLabel(thought.title) : <>{thought.title} 永久链接</>}
      </Link>
      <a
        className="p-author h-card sr-only"
        href={githubUrl}
        rel="author"
      >
        {siteConfig.author.name}
      </a>
      <header>
        <span className="thought-kind">
          <Icon size={16} />
          {isMixed
            ? t.thoughtMixedLabel(media.length)
            : thought.mediaType === "image"
            ? t.thoughtImageLabel
            : thought.mediaType === "audio"
              ? t.thoughtAudioLabel
              : thought.mediaType === "video"
                ? t.thoughtVideoLabel
                : thought.mediaType === "link"
                  ? t.thoughtLinkLabel
                  : t.thoughtTextLabel}
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
                  aria-label={t.thoughtGalleryLabel(group.items.length)}
                >
                  {group.items.map((item, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${item.src}-${index}`}
                      className="thought-image u-photo"
                      src={item.src}
                      alt={item.alt ?? t.thoughtPhotoAlt(thought.title, index + 1)}
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
                    <strong>{group.item.title ?? t.thoughtNowPlaying(thought.title)}</strong>
                    <audio
                      className="u-audio"
                      controls
                      preload="none"
                      src={group.item.src}
                    >
                      {t.audioFallback}
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
            <strong>{t.thoughtNowPlaying(thought.title)}</strong>
            <audio
              className="u-audio"
              controls
              preload="none"
              src={thought.media}
            >
              {t.audioFallback}
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
        <Link className="thought-permalink" href={siteHref(`/thoughts/${thought.slug}`)}>
          {t.thoughtPermalinkShort}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </article>
  );
}
