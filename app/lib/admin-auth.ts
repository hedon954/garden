import { getChatGPTUser, type ChatGPTUser } from "../chatgpt-auth";

const configuredEmails = () =>
  new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

export function isAdmin(user: ChatGPTUser | null) {
  if (!user) return false;
  return configuredEmails().has(user.email.trim().toLowerCase());
}

export async function getAdminUser() {
  const user = await getChatGPTUser();
  return isAdmin(user) ? user : null;
}

export async function requireAdminApi() {
  const user = await getAdminUser();
  if (!user) {
    return Response.json({ error: "未授权的管理请求。" }, { status: 401 });
  }
  return user;
}
