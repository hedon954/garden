import { requireAdminApi } from "../../../../lib/admin-auth";
import { previewAssetType, repositoryContentPath } from "../../../../lib/repository-path.mjs";
import { readRaw } from "../../../../lib/ui-content";
import { resolveSidecarPath } from "../../../../../ui/core/fence.mjs";

/** Same-name-directory files for the draft preview, behind login and sandboxed. */
export async function GET(request: Request) {
  const user = await requireAdminApi();
  if (user instanceof Response) return new Response("请先登录后台。", { status: 401 });
  const params = new URL(request.url).searchParams;
  let post: string;
  try {
    post = repositoryContentPath(params.get("post") ?? "");
  } catch {
    return new Response("稿件路径不合法。", { status: 400 });
  }
  const resolved = resolveSidecarPath(post, params.get("path") ?? "");
  if (!resolved.path) return new Response(resolved.error ?? "路径不合法。", { status: 400 });
  const type = previewAssetType(resolved.path);
  if (!type) return new Response("不支持这种文件。", { status: 415 });
  const body = await readRaw(resolved.path).catch(() => null);
  if (!body) return new Response("找不到文件。", { status: 404 });
  const headers = new Headers({
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=60",
  });
  // HTML and SVG can carry scripts: an opaque-origin sandbox keeps them away from the admin.
  if (type.startsWith("text/html")) headers.set("Content-Security-Policy", "sandbox allow-scripts");
  if (type === "image/svg+xml") headers.set("Content-Security-Policy", "sandbox");
  return new Response(body, { headers });
}
