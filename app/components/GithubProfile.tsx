"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, GithubLogo } from "@phosphor-icons/react";

type GithubUser = {
  avatar_url: string;
  name: string | null;
  login: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  html_url: string;
  location: string | null;
};

const fallback: GithubUser = {
  avatar_url: "https://github.com/hedon954.png",
  name: "Hedon",
  login: "hedon954",
  bio: "Building thoughtful software and writing down what I learn.",
  public_repos: 0,
  followers: 0,
  html_url: "https://github.com/hedon954",
  location: null,
};

export function GithubProfile() {
  const [profile, setProfile] = useState<GithubUser>(fallback);
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetch("https://api.github.com/users/hedon954", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("GitHub profile unavailable");
        return response.json() as Promise<GithubUser>;
      })
      .then((data) => {
        setProfile(data);
        setLive(true);
      })
      .catch(() => setLive(false));
  }, []);

  return (
    <section className="github-card" aria-label="GitHub 资料">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={profile.avatar_url} alt={`${profile.login} 的 GitHub 头像`} />
      <div className="github-copy">
        <span className="eyebrow">
          <GithubLogo size={17} />
          GitHub {live ? "实时资料" : "资料"}
        </span>
        <h2>{profile.name ?? profile.login}</h2>
        <p>{profile.bio ?? fallback.bio}</p>
        <dl>
          <div>
            <dt>公开仓库</dt>
            <dd>{live ? profile.public_repos : "—"}</dd>
          </div>
          <div>
            <dt>关注者</dt>
            <dd>{live ? profile.followers : "—"}</dd>
          </div>
          {profile.location && (
            <div>
              <dt>所在地</dt>
              <dd>{profile.location}</dd>
            </div>
          )}
        </dl>
        <a href={profile.html_url} target="_blank" rel="noopener noreferrer">
          查看 GitHub
          <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
