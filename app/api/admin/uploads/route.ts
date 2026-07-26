import { requireAdminMutation } from "../../../lib/admin-auth";
import { createOssUploadPolicy } from "../../../lib/oss";

export async function POST(request: Request) {
  const user = await requireAdminMutation(request);
  if (user instanceof Response) return user;

  try {
    const payload = (await request.json()) as { name?: unknown; type?: unknown; size?: unknown };
    if (typeof payload.name !== "string" || typeof payload.type !== "string" || typeof payload.size !== "number") {
      return Response.json({ error: "附件元数据不完整。" }, { status: 400 });
    }
    return Response.json(await createOssUploadPolicy({ name: payload.name, type: payload.type, size: payload.size }));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "附件上传失败。" },
      { status: 503 },
    );
  }
}
