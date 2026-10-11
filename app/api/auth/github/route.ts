import {
  createAdminSession,
  isGitHubDevLoginAvailable,
  isGitHubLoginAllowed,
  isGitHubOAuthConfigured,
  sessionCookie,
} from "../../../lib/admin-auth";

const STATE_COOKIE = "hedon_github_oauth_state";

function redirectUri(request: Request) {
  return process.env.GITHUB_OAUTH_REDIRECT_URI ?? `${new URL(request.url).origin}/api/auth/github/callback`;
}

async function devGitHubUser() {
  const token = process.env.GITHUB_DEV_TOKEN;
  if (!token) return null;
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "garden-dev",
    },
  });
  if (!response.ok) return null;
  const profile = (await response.json()) as { login?: string; avatar_url?: string };
  if (!profile.login || !isGitHubLoginAllowed(profile.login)) return null;
  return { login: profile.login, avatarUrl: profile.avatar_url ?? "" };
}

export async function GET(request: Request) {
  if (!isGitHubOAuthConfigured() && isGitHubDevLoginAvailable()) {
    const user = await devGitHubUser();
    if (!user) {
      return Response.json({ error: "本机 GitHub 登录不可用。" }, { status: 503 });
    }
    const session = await createAdminSession(user);
    if (!session) {
      return Response.json({ error: "本机 GitHub 登录不可用。" }, { status: 503 });
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: new URL("/admin", request.url).toString(),
        "Set-Cookie": sessionCookie(session),
      },
    });
  }
  if (!isGitHubOAuthConfigured()) {
    return Response.json(
      { error: "GitHub OAuth 尚未配置。" },
      { status: 503 },
    );
  }
  const state = crypto.randomUUID();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", process.env.GITHUB_OAUTH_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri(request));
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/api/auth/github; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
