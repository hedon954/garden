import { resolvePlayer } from "../../ui/garden/player.mjs";

export function GardenPlayer({ href, title }: { href: string; title?: string }) {
  const player = resolvePlayer(href);
  if (!player.ok) return null;
  const open = player.provider === "youtube" ? "在 YouTube 打开" : "在 Bilibili 打开";
  const frameTitle = title?.trim() || `${player.label} video`;
  return (
    <figure className={`g-player g-player-${player.provider}`}>
      <div className="g-player-frame">
        <iframe
          src={player.playerUrl}
          title={frameTitle}
          loading="lazy"
          allow="fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <figcaption>
        <a className="ext" href={player.pageUrl} target="_blank" rel="noopener noreferrer">{open}</a>
      </figcaption>
    </figure>
  );
}
