import { requireAdminApi } from "../../../../lib/admin-auth";
import { scanRepositoryBlocks } from "../../../../lib/ui-content";

export async function GET() {
  const user = await requireAdminApi();
  if (user instanceof Response) return user;
  try {
    const files = await scanRepositoryBlocks();
    const counts = { uncompiled: 0, stale: 0, error: 0, ok: 0 };
    for (const file of files) {
      for (const block of file.blocks) {
        if (block.lang !== "widget") counts[block.status as keyof typeof counts] += 1;
      }
    }
    return Response.json({ files, counts });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取交互块失败。" }, { status: 503 });
  }
}
