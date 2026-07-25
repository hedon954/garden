import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { managedThoughts } from "../../../../../db/schema";
import { requireAdminApi } from "../../../../lib/admin-auth";

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
  const now = new Date().toISOString();
  try {
    await getDb()
      .update(managedThoughts)
      .set({
        status: payload.status,
        publishedAt: payload.status === "published" ? now : null,
        updatedAt: now,
      })
      .where(eq(managedThoughts.id, id));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "更新失败，请稍后重试。" }, { status: 503 });
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
    await getDb().delete(managedThoughts).where(eq(managedThoughts.id, id));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "删除失败，请稍后重试。" }, { status: 503 });
  }
}
