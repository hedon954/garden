import {
  ArrowUpRight,
  PushPin,
  Star,
} from "@phosphor-icons/react/ssr";
import { githubUsername } from "../lib/site";
import { siteConfig } from "../site.config";
import { GithubLiveOverview, type GithubPublicProfile } from "./GithubLiveOverview";

type GithubRepository = {
  nameWithOwner: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  primaryLanguage: { name: string; color: string | null } | null;
};

type ContributionDay = {
  date: string;
  contributionCount: number;
  contributionLevel: string;
};

type GithubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    action?: string;
    ref?: string | null;
    ref_type?: string | null;
    pull_request?: { html_url?: string; title?: string };
    issue?: { html_url?: string; title?: string };
    release?: { html_url?: string; name?: string; tag_name?: string };
  };
};

type GithubActivity = {
  id: string;
  label: string;
  repository: string;
  date: string;
  url: string;
};

type GithubGraphqlResponse = {
  data?: {
    user?: {
      pinnedItems: { nodes: Array<GithubRepository | null> };
      status: { message: string; emoji: string } | null;
      year: {
        contributionCalendar: {
          totalContributions: number;
          weeks: Array<{ contributionDays: ContributionDay[] }>;
        };
      };
      recent: { totalCommitContributions: number };
    } | null;
  };
  errors?: Array<{ message: string }>;
};

const fallback: GithubPublicProfile = {
  avatar_url: `https://github.com/${githubUsername}.png`,
  name: siteConfig.author.name,
  login: githubUsername,
  bio: siteConfig.author.githubBio,
  public_repos: 0,
  followers: 0,
  html_url: `https://github.com/${githubUsername}`,
  location: null,
};

const apiHeaders = (token?: string) => ({
  Accept: "application/vnd.github+json",
  "User-Agent": "Garden-Blog",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function loadGithubUser(token?: string) {
  try {
    const response = await fetch(`https://api.github.com/users/${githubUsername}`, {
      headers: apiHeaders(token),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return { profile: fallback, live: false };
    return { profile: (await response.json()) as GithubPublicProfile, live: true };
  } catch {
    return { profile: fallback, live: false };
  }
}

function activityFromEvent(event: GithubEvent): GithubActivity | null {
  const repository = event.repo.name;
  const repositoryUrl = `https://github.com/${repository}`;

  if (event.type === "PushEvent") {
    return { id: event.id, label: "推送了代码", repository, date: event.created_at, url: `${repositoryUrl}/commits` };
  }
  if (event.type === "PullRequestEvent") {
    const action = event.payload.action === "closed" ? "完成了 Pull Request" : "提交了 Pull Request";
    return { id: event.id, label: action, repository, date: event.created_at, url: event.payload.pull_request?.html_url ?? repositoryUrl };
  }
  if (event.type === "IssuesEvent") {
    const action = event.payload.action === "closed" ? "关闭了 Issue" : "参与了 Issue";
    return { id: event.id, label: action, repository, date: event.created_at, url: event.payload.issue?.html_url ?? repositoryUrl };
  }
  if (event.type === "CreateEvent") {
    const target = event.payload.ref_type === "repository" ? "创建了仓库" : `创建了${event.payload.ref_type === "tag" ? "标签" : "分支"}`;
    return { id: event.id, label: target, repository, date: event.created_at, url: repositoryUrl };
  }
  if (event.type === "ReleaseEvent") {
    return { id: event.id, label: "发布了新版本", repository, date: event.created_at, url: event.payload.release?.html_url ?? `${repositoryUrl}/releases` };
  }
  return null;
}

async function loadGithubActivity(token?: string) {
  try {
    const response = await fetch(
      `https://api.github.com/users/${githubUsername}/events/public?per_page=100`,
      { headers: apiHeaders(token), next: { revalidate: 1800 } },
    );
    if (!response.ok) return [];
    return ((await response.json()) as GithubEvent[])
      .map(activityFromEvent)
      .filter((activity): activity is GithubActivity => Boolean(activity))
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function loadConfiguredRepositories(token?: string) {
  const names = siteConfig.author.githubPinned ?? [];
  const repositories = await Promise.all(names.slice(0, 6).map(async (name) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${name}`, {
        headers: apiHeaders(token),
        next: { revalidate: 3600 },
      });
      if (!response.ok) return null;
      const repository = await response.json() as {
        full_name: string;
        description: string | null;
        html_url: string;
        stargazers_count: number;
        language: string | null;
      };
      return {
        nameWithOwner: repository.full_name,
        description: repository.description,
        url: repository.html_url,
        stargazerCount: repository.stargazers_count,
        primaryLanguage: repository.language ? { name: repository.language, color: null } : null,
      } satisfies GithubRepository;
    } catch {
      return null;
    }
  }));
  return repositories.filter((repository): repository is GithubRepository => Boolean(repository));
}

async function loadGithubGraph(token?: string) {
  if (!token) return null;

  const now = new Date();
  const recentFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearFrom = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000);
  const query = `query GardenGithubProfile($login: String!, $recentFrom: DateTime!, $yearFrom: DateTime!, $to: DateTime!) {
    user(login: $login) {
      status { message emoji }
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            nameWithOwner
            description
            url
            stargazerCount
            primaryLanguage { name color }
          }
        }
      }
      year: contributionsCollection(from: $yearFrom, to: $to) {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
      recent: contributionsCollection(from: $recentFrom, to: $to) {
        totalCommitContributions
      }
    }
  }`;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { ...apiHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          login: githubUsername,
          recentFrom: recentFrom.toISOString(),
          yearFrom: yearFrom.toISOString(),
          to: now.toISOString(),
        },
      }),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const payload = await response.json() as GithubGraphqlResponse;
    if (payload.errors?.length || !payload.data?.user) return null;
    return payload.data.user;
  } catch {
    return null;
  }
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function contributionLevelClass(level: string) {
  return level.toLowerCase().replaceAll("_", "-");
}

export async function GithubProfile() {
  const token = process.env.GITHUB_TOKEN;
  const [{ profile, live }, graph, activity] = await Promise.all([
    loadGithubUser(token),
    loadGithubGraph(token),
    loadGithubActivity(token),
  ]);
  const pinned = graph
    ? graph.pinnedItems.nodes.filter((repository): repository is GithubRepository => Boolean(repository))
    : await loadConfiguredRepositories(token);
  const calendarDays = graph?.year.contributionCalendar.weeks.flatMap((week) => week.contributionDays) ?? [];

  return (
    <section className="github-profile" aria-label="GitHub 资料">
      <GithubLiveOverview
        username={githubUsername}
        initialProfile={profile}
        initialLive={live}
        statusMessage={graph?.status?.message}
        recentCommits={graph?.recent.totalCommitContributions}
      />

      <section className="github-pinned" aria-labelledby="github-pinned-title">
        <header>
          <div>
            <p className="eyebrow">PINNED / 置顶仓库</p>
            <h3 id="github-pinned-title">正在持续构建的项目</h3>
          </div>
          <PushPin size={20} aria-hidden="true" />
        </header>
        {pinned.length > 0 ? (
          <div className="github-repository-grid">
            {pinned.map((repository) => (
              <a href={repository.url} target="_blank" rel="noopener noreferrer" key={repository.nameWithOwner}>
                <strong>{repository.nameWithOwner.split("/").at(-1)}</strong>
                <p>{repository.description ?? "查看这个公开仓库的代码与最近更新。"}</p>
                <span>
                  {repository.primaryLanguage && <><i style={{ background: repository.primaryLanguage.color ?? undefined }} />{repository.primaryLanguage.name}</>}
                  <small><Star size={13} weight="fill" />{repository.stargazerCount}</small>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="github-data-note">配置 GitHub Token 或 author.githubPinned 后，这里会展示置顶仓库。</p>
        )}
      </section>

      <section className="github-contributions" aria-labelledby="github-contributions-title">
        <header>
          <div>
            <p className="eyebrow">CONTRIBUTIONS / 贡献</p>
            <h3 id="github-contributions-title">过去一年的公开贡献</h3>
          </div>
          <strong>{graph ? `${graph.year.contributionCalendar.totalContributions} 次贡献` : "需要 GitHub Token"}</strong>
        </header>
        {calendarDays.length > 0 ? (
          <div className="github-calendar" role="img" aria-label={`过去一年 ${graph?.year.contributionCalendar.totalContributions ?? 0} 次公开贡献`}>
            {calendarDays.map((day) => (
              <span
                className={`github-contribution-day level-${contributionLevelClass(day.contributionLevel)}`}
                key={day.date}
                title={`${day.date} · ${day.contributionCount} 次贡献`}
                aria-label={`${day.date}，${day.contributionCount} 次贡献`}
              />
            ))}
          </div>
        ) : (
          <p className="github-data-note">正式发布时会使用工作流的只读令牌生成贡献热点图。</p>
        )}
      </section>

      <section className="github-activity" aria-labelledby="github-activity-title">
        <header>
          <p className="eyebrow">CONTRIBUTION ACTIVITY / 最近活动</p>
          <h3 id="github-activity-title">最近在 GitHub 上做了什么</h3>
        </header>
        {activity.length > 0 ? (
          <ol>
            {activity.map((item) => (
              <li key={item.id}>
                <time dateTime={item.date}>{formatActivityDate(item.date)}</time>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <span>{item.label}</span>
                  <strong>{item.repository}</strong>
                  <ArrowUpRight size={15} />
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="github-data-note">GitHub 暂时没有返回最近的公开贡献活动。</p>
        )}
      </section>
    </section>
  );
}
