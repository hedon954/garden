import { isGitHubOAuthConfigured } from "../../../lib/admin-auth";

const STATE_COOKIE = "hedon_github_oauth_state";

function redirectUri(request: Request) {
  return process.env.GITHUB_OAUTH_REDIRECT_URI ?? `${new URL(request.url).origin}/api/auth/github/callback`;
}

export async function GET(request: Request) {
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
