import { cookies } from "next/headers";

const SESSION_COOKIE = "hedon_admin_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

export type GitHubAdminUser = {
  login: string;
  avatarUrl: string;
};

type SessionPayload = GitHubAdminUser & { expiresAt: number };

const encoder = new TextEncoder();

function configuredLogins() {
  return new Set(
    (process.env.ADMIN_GITHUB_LOGINS ?? "")
      .split(",")
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isGitHubLoginAllowed(login: string) {
  return configuredLogins().has(login.trim().toLowerCase());
}

export function isGitHubOAuthConfigured() {
  return Boolean(
    process.env.GITHUB_OAUTH_CLIENT_ID &&
      process.env.GITHUB_OAUTH_CLIENT_SECRET &&
      process.env.GITHUB_SESSION_SECRET,
  );
}

function toBase64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value: string) {
  const secret = process.env.GITHUB_SESSION_SECRET;
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function createAdminSession(user: GitHubAdminUser) {
  const payload: SessionPayload = {
    ...user,
    expiresAt: Date.now() + SESSION_LIFETIME_SECONDS * 1000,
  };
  const body = toBase64Url(JSON.stringify(payload));
  const signature = await sign(body);
  return signature ? `${body}.${signature}` : null;
}

async function readSession(value: string | undefined): Promise<GitHubAdminUser | null> {
  if (!value) return null;
  const [body, signature, ...rest] = value.split(".");
  if (!body || !signature || rest.length) return null;
  const expected = await sign(body);
  if (!expected || expected !== signature) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body)),
    ) as SessionPayload;
    if (
      !payload.login ||
      !payload.avatarUrl ||
      payload.expiresAt < Date.now() ||
      !isGitHubLoginAllowed(payload.login)
    ) {
      return null;
    }
    return { login: payload.login, avatarUrl: payload.avatarUrl };
  } catch {
    return null;
  }
}

export async function getAdminUser() {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookie(value: string) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_LIFETIME_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function requireAdminApi() {
  const user = await getAdminUser();
  if (!user) {
    return Response.json({ error: "请先使用 GitHub 登录管理后台。" }, { status: 401 });
  }
  return user;
}
