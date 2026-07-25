import { ArrowUpRight, GithubLogo } from "@phosphor-icons/react/ssr";
import { githubUsername } from "../lib/site";
import { siteConfig } from "../site.config";

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
  avatar_url: `https://github.com/${githubUsername}.png`,
  name: siteConfig.author.name,
  login: githubUsername,
  bio: siteConfig.author.githubBio,
  public_repos: 0,
  followers: 0,
  html_url: `https://github.com/${githubUsername}`,
  location: null,
};

async function loadGithubProfile() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const response = await fetch(
      `https://api.github.com/users/${githubUsername}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Markdown-Blog",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return { profile: fallback, live: false };
    return {
      profile: (await response.json()) as GithubUser,
      live: true,
    };
  } catch {
    return { profile: fallback, live: false };
  }
}

export async function GithubProfile() {
  const { profile, live } = await loadGithubProfile();

  return (
    <section className="github-card" aria-label="GitHub 资料">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={profile.avatar_url} alt={`${profile.login} 的 GitHub 头像`} />
      <div className="github-copy">
        <span className="eyebrow">
          <GithubLogo size={17} />
          GitHub {live ? "缓存资料" : "资料"}
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
