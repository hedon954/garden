/** The template placeholder written by `garden init`; not a real GitHub account. */
export const GITHUB_ID_PLACEHOLDER = "your-github-id";

/** True when the configured GitHub id is a real account worth calling the GitHub API for. */
export function hasRealGithubId(id) {
  const value = String(id ?? "").trim();
  return value !== "" && value.toLowerCase() !== GITHUB_ID_PLACEHOLDER;
}
