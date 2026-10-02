// GitHub OAuth callback, shared by two flows:
// - Decap CMS (/admin/): hand the token back to the window that opened this popup.
// - Editor pages (/api/kirjaudu): check repo write access and issue a session cookie.
import { SESSION_COOKIE, SESSION_DAYS, TOKEN_COOKIE, createSession, encryptToken, getCookie, repoName, safeNext } from "../../lib/session.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const login = getCookie(request, "vk_login");
  if (login && state && login.split(".")[0] === state) {
    return editorLogin(url, env, code, decodeURIComponent(login.slice(state.length + 1)));
  }

  const cookieState = getCookie(request, "decap_oauth_state");
  if (!code || !state || state !== cookieState) {
    return reply(url.origin, "error", { message: "Kirjautuminen epäonnistui (virheellinen tila). Yritä uudelleen." });
  }
  const data = await exchangeCode(url, env, code);
  if (!data.access_token) {
    return reply(url.origin, "error", { message: data.error_description || "GitHub ei palauttanut tunnusta." });
  }
  return reply(url.origin, "success", { token: data.access_token, provider: "github" });
}

async function exchangeCode(url, env, code) {
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
  return res.json().catch(() => ({}));
}

// Only people who can push to the site's repository get a session. The GitHub
// token is kept only as an encrypted cookie for the writing tool's API.
async function editorLogin(url, env, code, next) {
  const clearLogin = "vk_login=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
  if (!code) return page("Kirjautuminen peruttiin.", 400, clearLogin);
  const data = await exchangeCode(url, env, code);
  if (!data.access_token) return page("GitHub ei palauttanut tunnusta. Yritä uudelleen.", 400, clearLogin);

  const gh = (path) => fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${data.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "valokeila-cms" },
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [user, repo] = await Promise.all([gh("/user"), gh(`/repos/${repoName(env)}`)]);

  if (!user?.login || !repo?.permissions?.push) {
    return page("Sinulla ei ole oikeutta tähän työkaluun. Kirjaudu GitHub-tunnuksella, jolla on kirjoitusoikeus Valokeilan repoon.", 403, clearLogin);
  }
  const session = await createSession(env, user.login);
  const headers = new Headers({ Location: `${url.origin}${safeNext(next)}` });
  headers.append("Set-Cookie", clearLogin);
  headers.append("Set-Cookie", `${SESSION_COOKIE}=${session}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
  // GitHub tokens may expire (8 h); the writing tool asks for a fresh login when it does.
  const tokenAge = Math.min(Number(data.expires_in) || 8 * 3600, SESSION_DAYS * 86400);
  headers.append("Set-Cookie", `${TOKEN_COOKIE}=${await encryptToken(env, data.access_token, user.login)}; Path=/api/toimitus; HttpOnly; Secure; SameSite=Strict; Max-Age=${tokenAge}`);
  return new Response(null, { status: 302, headers });
}

function page(message, status, cookie) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Valokeila</title>
<body style="font:18px/1.5 system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 16px">
<h1 style="font-size:28px">Kirjautuminen</h1><p>${message}</p><p><a href="/api/kirjaudu">Yritä uudelleen</a> · <a href="/">Etusivulle</a></p></body>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": cookie } });
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
