import { findThought, thoughts } from "./content";

export function getPublishedThoughts() {
  return thoughts;
}

export function findPublishedThought(slug: string) {
  return findThought(slug);
}
