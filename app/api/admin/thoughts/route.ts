import { desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { managedThoughts } from "../../../../db/schema";
import { requireAdminApi } from "../../../lib/admin-auth";
import { createThoughtSlug, toPublicThought } from "../../../lib/managed-thoughts";
import type { MediaItem } from "../../../lib/content";

type ThoughtPayload = {
  title?: unknown;
  content?: unknown;
  tags?: unknown;
  media?: unknown;
  status?: unknown;
};

function isHttpUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseMedia(value: unknown): MediaItem[] | null {
  if (!Array.isArray(value) || value.length > 12) return null;
  const media: MediaItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    if (
      !["image", "audio", "video", "link"].includes(String(candidate.type)) ||
      !isHttpUrl(candidate.src)
    ) {
      return null;
    }
    media.push({
      type: candidate.type as MediaItem["type"],
      src: String(candidate.src),
      ...(typeof candidate.alt === "string" && candidate.alt.trim()
        ? { alt: candidate.alt.trim().slice(0, 200) }
        : {}),
      ...(typeof candidate.poster === "string" && isHttpUrl(candidate.poster)
        ? { poster: candidate.poster }
        : {}),
      ...(typeof candidate.mime === "string" && candidate.mime.trim()
        ? { mime: candidate.mime.trim().slice(0, 100) }
        : {}),
      ...(typeof candidate.title === "string" && candidate.title.trim()
        ? { title: candidate.title.trim().slice(0, 200) }
        : {}),
      ...(typeof candidate.description === "string" && candidate.description.trim()
        ? { description: candidate.description.trim().slice(0, 400) }
        : {}),
    });
  }
  return media;
}

function parsePayload(payload: ThoughtPayload) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const media = parseMedia(payload.media ?? []);
  const status = payload.status === "draft" ? "draft" : "published";

  if (!title || title.length > 120) return { error: "标题不能为空，且不得超过 120 个字符。" };
  if (!content || content.length > 20_000) return { error: "正文不能为空，且不得超过 20,000 个字符。" };
  if (!media) return { error: "附件最多 12 个，且必须是 http(s) 地址。" };
  return { value: { title, content, tags, media, status } };
}

function databaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "数据库暂不可用。";
  if (message.includes("no such table")) {
    return "管理数据库尚未初始化；请完成本次部署后再试。";
  }
  return "保存失败，请稍后重试。";
}

export async function GET() {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  try {
    const rows = await getDb()
      .select()
      .from(managedThoughts)
      .orderBy(desc(managedThoughts.createdAt));
    return Response.json({
      thoughts: rows.map((row) => ({
        ...toPublicThought(row),
        id: row.id,
        status: row.status,
      })),
    });
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  const parsed = parsePayload((await request.json()) as ThoughtPayload);
  if ("error" in parsed) return Response.json(parsed, { status: 400 });

  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    slug: createThoughtSlug(),
    title: parsed.value.title,
    content: parsed.value.content,
    tags: JSON.stringify(parsed.value.tags),
    media: JSON.stringify(parsed.value.media),
    status: parsed.value.status,
    publishedAt: parsed.value.status === "published" ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await getDb().insert(managedThoughts).values(row);
    return Response.json(
      { thought: { ...toPublicThought(row), id: row.id, status: row.status } },
      { status: 201 },
    );
  } catch (error) {
    return Response.json({ error: databaseError(error) }, { status: 503 });
  }
}
