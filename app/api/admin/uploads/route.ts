import { requireAdminMutation } from "../../../lib/admin-auth";
import { uploadRepositoryAsset } from "../../../lib/github-content";

export async function POST(request: Request) {
  const user = await requireAdminMutation(request);
  if (user instanceof Response) return user;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "请选择一个媒体文件。" }, { status: 400 });
    }
    return Response.json(await uploadRepositoryAsset(file), { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "附件上传失败。" },
      { status: 503 },
    );
  }
}
