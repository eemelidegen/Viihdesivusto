// Ends the editor session.
import { SESSION_COOKIE, TOKEN_COOKIE } from "../../lib/session.js";

export async function onRequestGet({ request }) {
  const headers = new Headers({ Location: `${new URL(request.url).origin}/` });
  headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  headers.append("Set-Cookie", `${TOKEN_COOKIE}=; Path=/api/toimitus; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  return new Response(null, { status: 302, headers });
}
