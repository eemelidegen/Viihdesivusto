// Editor-only: /admin/somekuva/ needs a signed session from /api/kirjaudu.
import { readSession } from "../../../lib/session.js";

export async function onRequest({ request, env, next }) {
  if (!env.GITHUB_CLIENT_SECRET) {
    return new Response("Kirjautuminen ei ole käytössä: GITHUB_CLIENT_SECRET puuttuu Cloudflaren asetuksista.", { status: 503 });
  }
  if (await readSession(env, request)) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-store");
    return out;
  }
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/api/kirjaudu?next=${encodeURIComponent(url.pathname)}`, 302);
}
