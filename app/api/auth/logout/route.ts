import { clearSessionCookie } from "../../../lib/admin-auth";

export async function POST(request: Request) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL("/admin", request.url).toString(),
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
