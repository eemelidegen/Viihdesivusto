// Ends the editor session.
import { SESSION_COOKIE } from "../../lib/session.js";

export async function onRequestGet({ request }) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${new URL(request.url).origin}/`,
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}
