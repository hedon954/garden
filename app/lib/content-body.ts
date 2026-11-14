import { handbookBodies } from "@garden/generated-handbook-bodies";
import { postBodies } from "@garden/generated-post-bodies";
import type { ContentEntry, GardenDocEntry } from "./content";

export function postWithBody<T extends Pick<ContentEntry, "path">>(entry: T): T & { content: string } {
  return { ...entry, content: postBodies[entry.path] ?? "" };
}

export function docWithBody<T extends Pick<GardenDocEntry, "path">>(
  doc: T,
  lang: "zh" | "en",
): T & { content: string };
export function docWithBody(
  doc: GardenDocEntry | null | undefined,
  lang: "zh" | "en",
): (GardenDocEntry & { content: string }) | null | undefined;
export function docWithBody(doc: GardenDocEntry | null | undefined, lang: "zh" | "en") {
  if (!doc) return doc;
  return { ...doc, content: handbookBodies[`${lang}:${doc.path}`] ?? "" };
}
