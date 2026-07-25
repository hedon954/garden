import { findThought, thoughts } from "./content";
import { getManagedThought, listManagedThoughts, toPublicThought } from "./managed-thoughts";

export async function getPublishedThoughts() {
  const managed = (await listManagedThoughts()).map(toPublicThought);
  return [...managed, ...thoughts].sort(
    (left, right) =>
      new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export async function findPublishedThought(slug: string) {
  const managed = await getManagedThought(slug);
  return managed ? toPublicThought(managed) : findThought(slug);
}
