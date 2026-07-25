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

function deniedRedirect(request: Request, login: string) {
  const target = new URL("/admin", request.url);
  target.searchParams.set("auth", "denied");
  // This is only reflected to the person who just completed GitHub OAuth. It
  // makes an allow-list mismatch actionable without exposing tokens or secrets.
  target.searchParams.set("account", login);
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
  if (!isGitHubOAuthConfigured()) {
    console.error("GitHub OAuth callback failed", { stage: "configuration" });
    return redirectToAdmin(request, "failed");
  }
  if (!code || !state) {
    console.error("GitHub OAuth callback failed", { stage: "parameters" });
    return redirectToAdmin(request, "failed");
  }
  if (state !== cookieValue(request, STATE_COOKIE)) {
    console.error("GitHub OAuth callback failed", { stage: "state" });
    return redirectToAdmin(request, "failed");
  }

  let stage = "token";
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
    if (!tokenResponse.ok || !token?.access_token) {
      console.error("GitHub OAuth callback failed", { stage });
      return redirectToAdmin(request, "failed");
    }

    stage = "profile";
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token.access_token}`,
        "User-Agent": "Hedon-Log-Admin",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const profile = (await profileResponse.json().catch(() => null)) as {
      login?: string;
      avatar_url?: string;
    } | null;
    if (!profileResponse.ok || !profile?.login) {
      console.error("GitHub OAuth callback failed", { stage });
      return redirectToAdmin(request, "failed");
    }

    const login = profile.login.trim();
    if (!isGitHubLoginAllowed(login)) return deniedRedirect(request, login);

    stage = "session";
    const session = await createAdminSession({
      login,
      avatarUrl: profile.avatar_url ?? `https://github.com/${encodeURIComponent(login)}.png?size=96`,
    });
    if (!session) {
      console.error("GitHub OAuth callback failed", { stage });
      return redirectToAdmin(request, "failed");
    }
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
  } catch (error) {
    console.error("GitHub OAuth callback failed", {
      stage,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return redirectToAdmin(request, "failed");
  }
}
