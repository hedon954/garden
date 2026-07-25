import { requireAdminApi } from "../../../../lib/admin-auth";
import {
  deleteRepositoryThought,
  updateRepositoryThought,
} from "../../../../lib/github-content";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  const { id } = await params;
  const payload = (await request.json()) as { status?: unknown };
  if (payload.status !== "draft" && payload.status !== "published") {
    return Response.json({ error: "无效的状态。" }, { status: 400 });
  }
  try {
    return Response.json({ thought: await updateRepositoryThought(id, payload.status) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "更新失败，请稍后重试。" },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  const { id } = await params;
  try {
    await deleteRepositoryThought(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "删除失败，请稍后重试。" },
      { status: 503 },
    );
  }
}
