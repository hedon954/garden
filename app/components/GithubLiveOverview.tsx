"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  GitCommit,
  GithubLogo,
  MapPin,
  Users,
} from "@phosphor-icons/react";
import { siteLang, ui } from "../lib/i18n";

export type GithubPublicProfile = {
  avatar_url: string;
  name: string | null;
  login: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  html_url: string;
  location: string | null;
};

function visibleGithubText(value: string) {
  return Array.from(value)
    .filter((character) => (character.codePointAt(0) ?? 0) >= 32)
    .join("")
    .trim();
}

export function GithubLiveOverview({
  username,
  initialProfile,
  initialLive,
  statusMessage,
  recentCommits,
}: {
  username: string;
  initialProfile: GithubPublicProfile;
  initialLive: boolean;
  statusMessage?: string;
  recentCommits?: number;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [syncState, setSyncState] = useState<"syncing" | "synced" | "snapshot">("syncing");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
        return response.json() as Promise<GithubPublicProfile>;
      })
      .then((nextProfile) => {
        setProfile(nextProfile);
        setSyncState("synced");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSyncState("snapshot");
      });

    return () => controller.abort();
  }, [username]);

  const t = ui();
  const displayName = visibleGithubText(profile.name ?? profile.login) || profile.login;
  const profileBio = profile.bio?.trim();
  const signature = statusMessage?.trim() || profileBio;
  const syncLabel = syncState === "synced"
    ? (siteLang === "en" ? t.githubSyncSynced : "本次访问已同步")
    : syncState === "snapshot"
      ? t.githubSyncSnapshot
      : t.githubSyncSyncing;

  return (
    <>
      <header className="github-overview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.avatar_url} alt={t.githubAvatarAlt(profile.login)} />
        <div className="github-identity">
          <span className="eyebrow" aria-live="polite"><GithubLogo size={17} />{` ${t.githubOverviewPrefix} · `}{syncLabel}</span>
          <h2>{displayName}</h2>
          {signature && <p>{signature}</p>}
          {profile.location && <span className="github-location"><MapPin size={14} />{profile.location}</span>}
        </div>
        <a href={profile.html_url} target="_blank" rel="noopener noreferrer">
          {t.githubViewProfile}
          <ArrowUpRight size={16} />
        </a>
      </header>

      <dl className="github-metrics">
        <div>
          <GithubLogo size={21} aria-hidden="true" />
          <dt>{t.githubMetricRepos}</dt>
          <dd>{syncState === "synced" || initialLive ? profile.public_repos : "—"}</dd>
        </div>
        <div>
          <Users size={21} aria-hidden="true" />
          <dt>Followers</dt>
          <dd>{syncState === "synced" || initialLive ? profile.followers : "—"}</dd>
        </div>
        <div>
          <GitCommit size={21} aria-hidden="true" />
          <dt>{t.githubMetricCommits}</dt>
          <dd>{recentCommits ?? "—"}</dd>
        </div>
      </dl>
    </>
  );
}
