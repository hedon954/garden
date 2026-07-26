import { requireAdminApi, requireAdminMutation } from "../../../lib/admin-auth";
import {
  createRepositoryThought,
  listRepositoryThoughts,
} from "../../../lib/github-content";
import type { MediaItem } from "../../../lib/content";

type ThoughtPayload = {
  title?: unknown;
  content?: unknown;
  tags?: unknown;
  media?: unknown;
  status?: unknown;
};

function createThoughtSlug() {
  return `thought-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
}

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

export async function GET() {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  try {
    return Response.json({ thoughts: await listRepositoryThoughts() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "读取 GitHub 内容失败。" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireAdminMutation(request);
  if (user instanceof Response) return user;
  const parsed = parsePayload((await request.json()) as ThoughtPayload);
  if ("error" in parsed) return Response.json(parsed, { status: 400 });

  try {
    const thought = await createRepositoryThought({
      slug: createThoughtSlug(),
      title: parsed.value.title,
      content: parsed.value.content,
      tags: parsed.value.tags,
      media: parsed.value.media,
      status: parsed.value.status,
      date: new Date().toISOString(),
    });
    return Response.json({ thought }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存到 GitHub 失败。" },
      { status: 503 },
    );
  }
}
