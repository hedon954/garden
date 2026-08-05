import { requireAdminMutation } from "../../../../lib/admin-auth";
import { updateRepositoryPostPinned } from "../../../../lib/github-content";
import { findPost } from "../../../../lib/content";

export async function PATCH(request: Request) {
  const user = await requireAdminMutation(request);
  if (user instanceof Response) return user;
  const payload = (await request.json().catch(() => null)) as {
    path?: unknown;
    pinned?: unknown;
  } | null;
  if (typeof payload?.path !== "string" || typeof payload.pinned !== "boolean") {
    return Response.json({ error: "博文路径和置顶状态必须正确填写。" }, { status: 400 });
  }
  const post = findPost(payload.path);
  if (!post) return Response.json({ error: "未找到对应博文。" }, { status: 404 });
  try {
    return Response.json({
      post: await updateRepositoryPostPinned({
        sourcePath: post.sourcePath,
        slug: post.slug,
        title: post.title,
        pinned: payload.pinned,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "置顶状态更新失败。" },
      { status: 503 },
    );
  }
}
