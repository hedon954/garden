import { requireAdminMutation } from "../../../../lib/admin-auth";
import { consumeDraft, draftUiBlock, modelConfig, remainingDrafts } from "../../../../lib/ui-model";

export async function POST(request: Request) {
  const user = await requireAdminMutation(request);
  if (user instanceof Response) return user;
  if (!modelConfig()) {
    return Response.json({ error: "后台还没接上模型：请配置 UI_MODEL_BASE_URL、UI_MODEL_API_KEY 和 UI_MODEL_NAME。" }, { status: 503 });
  }
  const payload = (await request.json().catch(() => null)) as { mode?: unknown; instruction?: unknown; fence?: unknown } | null;
  const mode = payload?.mode === "revise" ? "revise" : payload?.mode === "create" ? "create" : null;
  const instruction = typeof payload?.instruction === "string" ? payload.instruction.trim() : "";
  const fence = typeof payload?.fence === "string" ? payload.fence : undefined;
  if (!mode || !instruction || instruction.length > 4000 || (fence && fence.length > 20000)) {
    return Response.json({ error: "请求不完整：需要 mode 和不超过 4000 字的指令。" }, { status: 400 });
  }
  if (mode === "revise" && !fence) return Response.json({ error: "修改需要当前围栏。" }, { status: 400 });
  if (!consumeDraft(user.login)) {
    return Response.json({ error: "这一小时的生成次数用完了，稍后再试。", remaining: 0 }, { status: 429 });
  }
  try {
    const result = await draftUiBlock({ mode, instruction, fence });
    return Response.json({ ...result, remaining: remainingDrafts(user.login) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "模型调用失败。", remaining: remainingDrafts(user.login) },
      { status: 502 },
    );
  }
}
