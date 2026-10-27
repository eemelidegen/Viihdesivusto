// Editor-only: everything under /admin/ needs a signed session from /api/kirjaudu.
import { readSession } from "../../lib/session.js";

export async function onRequest({ request, env, next }) {
  if (!env.GITHUB_CLIENT_SECRET) {
    return new Response("Kirjautuminen ei ole käytössä: GITHUB_CLIENT_SECRET puuttuu Cloudflaren asetuksista.", { status: 503 });
  }
  if (await readSession(env, request)) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "private, no-store");
    for (const [k, v] of Object.entries(securityHeaders(new URL(request.url).pathname))) out.headers.set(k, v);
    return out;
  }
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/api/kirjaudu?next=${encodeURIComponent(url.pathname)}`, 302);
}

// Editor pages never need to be framed, and may only talk to the image sources and GitHub.
// Decap CMS (/admin/decap/) builds its UI at runtime, so it gets the framing rules only.
function securityHeaders(path) {
  const h = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-Robots-Tag": "noindex, nofollow",
  };
  h["Content-Security-Policy"] = path.startsWith("/admin/decap/")
    ? "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    : [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://commons.wikimedia.org https://www.wikidata.org https://api.openverse.org https://api.finna.fi",
      "frame-src https:",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
  return h;
}
