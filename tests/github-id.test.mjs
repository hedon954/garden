import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { hasRealGithubId } from "../app/lib/github-id.mjs";

test("template placeholder or empty GitHub id is not a real account", () => {
  for (const id of ["your-github-id", "Your-GitHub-Id", " your-github-id ", "", "  ", undefined, null]) {
    assert.equal(hasRealGithubId(id), false, String(id));
  }
});

test("real GitHub ids are unchanged", () => {
  for (const id of ["hedon954", "octocat", "your-github-id-2"]) assert.equal(hasRealGithubId(id), true, id);
});

test("GithubProfile returns before any GitHub API call when the id is not real", () => {
  const source = fs.readFileSync(new URL("../app/components/GithubProfile.tsx", import.meta.url), "utf8");
  const body = source.slice(source.indexOf("export async function GithubProfile()"));
  const guard = body.indexOf("if (!hasRealGithubId(githubUsername)) return null;");
  assert.ok(guard > 0, "guard missing");
  assert.ok(guard < body.indexOf("loadGithubUser("), "guard must come before the API calls");
});
