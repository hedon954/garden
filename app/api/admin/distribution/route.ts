import { requireAdminApi, requireAdminMutation } from "../../../lib/admin-auth";
import { findColumnEntry, findPost } from "../../../lib/content";
import { absoluteUrl, getSiteUrl } from "../../../lib/site";

type Platform = "x" | "csdn" | "zhihu" | "juejin";

const platformLabel: Record<Platform, string> = {
  x: "X",
  csdn: "CSDN",
  zhihu: "知乎",
  juejin: "掘金",
};

function platformWebhook(platform: Exclude<Platform, "x">) {
  const keys = {
    csdn: "CSDN_SYNC_WEBHOOK",
    zhihu: "ZHIHU_SYNC_WEBHOOK",
    juejin: "JUEJIN_SYNC_WEBHOOK",
  } as const;
  return process.env[keys[platform]];
}

export async function POST(request: Request) {
  const user = await requireAdminMutation(request);
  if (user instanceof Response) return user;
  const payload = (await request.json()) as {
    kind?: unknown;
    path?: unknown;
    column?: unknown;
    platform?: unknown;
  };
  const kind = payload.kind === "column" ? "column" : payload.kind === "post" ? "post" : null;
  const path = typeof payload.path === "string" ? payload.path : "";
  const platform = ["x", "csdn", "zhihu", "juejin"].includes(String(payload.platform))
    ? (payload.platform as Platform)
    : null;
  if (!kind || !path || !platform) {
    return Response.json({ error: "分发参数不完整。" }, { status: 400 });
  }

  const entry = kind === "post" ? findPost(path) : undefined;
  const column = typeof payload.column === "string" ? payload.column : "";
  const columnEntry = kind === "column" ? findColumnEntry(column, path) : undefined;
  const source = entry ?? columnEntry;
  if (!source) return Response.json({ error: "未找到对应内容。" }, { status: 404 });

  const publicPath = kind === "post" ? `/blog/${source.path}` : `/columns/${source.column}/${source.path}`;
  const canonicalUrl = absoluteUrl(publicPath, await getSiteUrl());
  let status: "queued" | "published" | "needs_credentials" | "failed" = "queued";
  let externalUrl: string | null = null;
  let error: string | null = null;

  try {
    if (platform === "x") {
      const token = process.env.X_USER_ACCESS_TOKEN;
      if (!token) {
        status = "needs_credentials";
        error = "缺少 X_USER_ACCESS_TOKEN。";
      } else {
        const text = `${source.title}\n${source.description ?? ""}\n${canonicalUrl}`.slice(0, 280);
        const response = await fetch("https://api.x.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });
        const result = (await response.json()) as { data?: { id?: string }; detail?: string };
        if (!response.ok || !result.data?.id) {
          status = "failed";
          error = result.detail ?? "X 未接受这次发布请求。";
        } else {
          status = "published";
          externalUrl = `https://x.com/i/web/status/${result.data.id}`;
        }
      }
    } else {
      const webhook = platformWebhook(platform);
      if (!webhook) {
        status = "needs_credentials";
        error = `缺少 ${platformLabel[platform]} 的同步 Webhook。`;
      } else {
        const response = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform,
            title: source.title,
            markdown: source.content,
            summary: source.description ?? "",
            canonicalUrl,
            tags: source.tags ?? [],
          }),
        });
        const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!response.ok) {
          status = "failed";
          error = result.error ?? `${platformLabel[platform]} 同步服务返回失败。`;
        } else {
          status = "published";
          externalUrl = result.url ?? null;
        }
      }
    }

    return Response.json({
      job: { platform, status, canonicalUrl, externalUrl, error },
    });
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : "分发服务暂不可用。";
    return Response.json({ error: message }, { status: 503 });
  }
}

export async function GET() {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  return Response.json({ jobs: [] });
}
