// GitHub OAuth for Decap CMS, step 2: swap the code for a token and hand it
// back to the /admin/ window that opened this popup.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)decap_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== cookieState) {
    return reply(url.origin, "error", { message: "Kirjautuminen epäonnistui (virheellinen tila). Yritä uudelleen." });
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "valokeila-cms" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/callback`,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (!data.access_token) {
    return reply(url.origin, "error", { message: data.error_description || "GitHub ei palauttanut tunnusta." });
  }
  return reply(url.origin, "success", { token: data.access_token, provider: "github" });
}

// Decap's popup handshake: announce "authorizing", then answer the opener with
// the result — only if the opener is this same site.
function reply(origin, status, content) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html><meta charset="utf-8"><title>Kirjaudutaan…</title>
<p>Kirjaudutaan…</p>
<script>
  const origin = ${JSON.stringify(origin)};
  window.addEventListener("message", (e) => {
    if (e.origin !== origin) return;
    window.opener.postMessage(${JSON.stringify(message)}, origin);
  }, { once: true });
  window.opener.postMessage("authorizing:github", origin);
</script>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}
