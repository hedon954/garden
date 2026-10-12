import { requireAdminApi } from "../../../../lib/admin-auth";
import { repositoryContentPath } from "../../../../lib/repository-path.mjs";
import { readMarkdown } from "../../../../lib/ui-content";

export async function GET(request: Request) {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  let path: string;
  try {
    path = repositoryContentPath(new URL(request.url).searchParams.get("path") ?? "");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "稿件路径不合法。" }, { status: 400 });
  }
  try {
    const file = await readMarkdown(path);
    if (!file) return Response.json({ error: "找不到这篇稿件。" }, { status: 404 });
    return Response.json({ path, sha: file.sha, content: file.source });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取稿件失败。" }, { status: 503 });
  }
}
