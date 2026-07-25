import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { managedThoughts } from "../../db/schema";
import type { ContentEntry, MediaItem } from "./content";

export type ThoughtStatus = "draft" | "published";
export type ManagedThoughtInput = {
  title: string;
  content: string;
  tags: string[];
  media: MediaItem[];
  status: ThoughtStatus;
};

type ManagedThoughtRow = typeof managedThoughts.$inferSelect;

function asStringArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function asMedia(value: string): MediaItem[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as MediaItem[]) : [];
  } catch {
    return [];
  }
}

export function toPublicThought(row: ManagedThoughtRow): ContentEntry {
  const media = asMedia(row.media);
  return {
    title: row.title,
    slug: row.slug,
    date: row.publishedAt ?? row.createdAt,
    tags: asStringArray(row.tags),
    mediaType: media[0]?.type ?? "text",
    media,
    kind: "thought",
    draft: row.status !== "published",
    sourcePath: "admin/managed-thoughts",
    content: row.content,
  };
}

export async function listManagedThoughts(includeDrafts = false) {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(managedThoughts)
      .where(includeDrafts ? undefined : eq(managedThoughts.status, "published"))
      .orderBy(desc(managedThoughts.publishedAt), desc(managedThoughts.createdAt));
    return rows;
  } catch {
    return [] as ManagedThoughtRow[];
  }
}

export async function getManagedThought(slug: string, includeDrafts = false) {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(managedThoughts)
      .where(
        includeDrafts
          ? eq(managedThoughts.slug, slug)
          : and(
              eq(managedThoughts.slug, slug),
              eq(managedThoughts.status, "published"),
            ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export function createThoughtSlug() {
  return `thought-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
}
