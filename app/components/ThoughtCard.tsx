import Link from "next/link";
import {
  ArrowUpRight,
  ImageSquare,
  LinkSimple,
  MusicNotes,
  VideoCamera,
} from "@phosphor-icons/react/ssr";
import { type ContentEntry, formatDate } from "../lib/content";
import { MarkdownArticle } from "./MarkdownArticle";

const icons = {
  image: ImageSquare,
  audio: MusicNotes,
  video: VideoCamera,
  link: LinkSimple,
  text: LinkSimple,
};

export function ThoughtCard({ thought }: { thought: ContentEntry }) {
  const Icon = icons[thought.mediaType ?? "text"];

  return (
    <article id={thought.slug} className="thought-card">
      <header>
        <span className="thought-kind">
          <Icon size={16} />
          {thought.mediaType === "image"
            ? "一张照片"
            : thought.mediaType === "audio"
              ? "一段声音"
              : thought.mediaType === "video"
                ? "一段影像"
                : thought.mediaType === "link"
                  ? "一个链接"
                  : "随想"}
        </span>
        <time>{formatDate(thought.date, true)}</time>
      </header>

      <h2>{thought.title}</h2>
      <MarkdownArticle content={thought.content} />

      {thought.mediaType === "image" && thought.media && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="thought-image"
          src={thought.media}
          alt={thought.mediaAlt ?? thought.title}
          loading="lazy"
        />
      )}
      {thought.mediaType === "audio" && thought.media && (
        <div className="audio-embed">
          <MusicNotes size={28} />
          <div>
            <strong>当前播放 · {thought.title}</strong>
            <audio controls preload="none" src={thought.media}>
              你的浏览器不支持音频播放。
            </audio>
          </div>
        </div>
      )}
      {thought.mediaType === "video" && thought.media && (
        <video
          className="thought-video"
          controls
          preload="metadata"
          poster={thought.poster}
        >
          <source src={thought.media} type="video/mp4" />
        </video>
      )}
      {thought.mediaType === "link" && thought.media && (
        <Link
          className="link-embed"
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
    </article>
  );
}
