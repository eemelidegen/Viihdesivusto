// Starts GitHub login for editor-only pages. The callback (/api/callback)
// recognises this flow by the vk_login cookie and issues a session.
import { safeNext } from "../../lib/session.js";

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("GITHUB_CLIENT_ID puuttuu Cloudflaren asetuksista.", { status: 500 });
  }
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const next = safeNext(url.searchParams.get("next"));
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/callback`);
  authorize.searchParams.set("scope", "repo");
  authorize.searchParams.set("state", state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": `vk_login=${state}.${encodeURIComponent(next)}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
