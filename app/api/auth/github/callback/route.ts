import {
  createAdminSession,
  isGitHubLoginAllowed,
  isGitHubOAuthConfigured,
  sessionCookie,
} from "../../../../lib/admin-auth";

const STATE_COOKIE = "hedon_github_oauth_state";

function cookieValue(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)
    ?.slice(1)
    .join("=");
}

function redirectToAdmin(request: Request, reason: string) {
  const target = new URL("/admin", request.url);
  target.searchParams.set("auth", reason);
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Set-Cookie": `${STATE_COOKIE}=; Path=/api/auth/github; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!isGitHubOAuthConfigured() || !code || !state || state !== cookieValue(request, STATE_COOKIE)) {
    return redirectToAdmin(request, "failed");
  }

  try {
    // GitHub's OAuth endpoint formally accepts an URL-encoded POST body.
    // Keep provider failures inside this boundary so a rejected/expired code
    // sends the reader back to the sign-in page instead of producing a 500.
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID ?? "",
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "",
        code,
      }),
    });
    const token = (await tokenResponse.json().catch(() => null)) as {
      access_token?: string;
    } | null;
    if (!tokenResponse.ok || !token?.access_token) return redirectToAdmin(request, "failed");

    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token.access_token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const profile = (await profileResponse.json().catch(() => null)) as {
      login?: string;
      avatar_url?: string;
    } | null;
    if (
      !profileResponse.ok ||
      !profile?.login ||
      !profile.avatar_url ||
      !isGitHubLoginAllowed(profile.login)
    ) {
      return redirectToAdmin(request, "denied");
    }

    const session = await createAdminSession({ login: profile.login, avatarUrl: profile.avatar_url });
    if (!session) return redirectToAdmin(request, "failed");
    const headers = new Headers({ Location: new URL("/admin", request.url).toString() });
    headers.append("Set-Cookie", sessionCookie(session));
    headers.append(
      "Set-Cookie",
      `${STATE_COOKIE}=; Path=/api/auth/github; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
    return new Response(null, {
      status: 302,
      headers,
    });
  } catch {
    return redirectToAdmin(request, "failed");
  }
}
