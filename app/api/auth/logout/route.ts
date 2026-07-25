import { clearSessionCookie, requireAdminMutation } from "../../../lib/admin-auth";

export async function POST(request: Request) {
  const user = await requireAdminMutation(request);
  if (user instanceof Response) return user;
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL("/admin", request.url).toString(),
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
