export type GiscusConfig = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
};

const PLACEHOLDERS = new Set([
  "owner/repository",
  "R_xxxxxxxxxx",
  "DIC_xxxxxxxxxx",
]);

function configuredValue(
  env: Record<string, string | undefined>,
  primary: string,
  fallback: string,
) {
  const value = (env[primary] ?? env[fallback] ?? "").trim();
  if (!value || PLACEHOLDERS.has(value)) return undefined;
  return value;
}

export function readGiscusConfig(
  env: Record<string, string | undefined> = process.env,
): GiscusConfig | undefined {
  const repo = configuredValue(env, "GISCUS_REPO", "NEXT_PUBLIC_GISCUS_REPO");
  const repoId = configuredValue(env, "GISCUS_REPO_ID", "NEXT_PUBLIC_GISCUS_REPO_ID");
  const category = configuredValue(env, "GISCUS_CATEGORY", "NEXT_PUBLIC_GISCUS_CATEGORY");
  const categoryId = configuredValue(
    env,
    "GISCUS_CATEGORY_ID",
    "NEXT_PUBLIC_GISCUS_CATEGORY_ID",
  );
  if (!repo || !repoId || !category || !categoryId) return undefined;
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) return undefined;
  if (!repoId.startsWith("R_") || !categoryId.startsWith("DIC_")) return undefined;
  return { repo, repoId, category, categoryId };
}
