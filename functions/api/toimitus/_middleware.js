// Writing tool API: needs the encrypted GitHub token cookie set at editor login
// (scoped to /api/toimitus). A 401 with {kirjaudu: true} sends the editor through login again.
import { TOKEN_COOKIE, decryptToken, getCookie, repoName } from "../../../lib/session.js";
import { github } from "../../../lib/articles.js";

const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function onRequest(context) {
  const { request, env } = context;
  const cookie = getCookie(request, TOKEN_COOKIE);
  const auth = cookie && env.GITHUB_CLIENT_SECRET ? await decryptToken(env, cookie) : null;
  if (!auth) return json({ kirjaudu: true, virhe: "Kirjaudu uudelleen." }, 401);

  // Writes only from this site's own pages.
  if (request.method !== "GET" && request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({ virhe: "Kielletty." }, 403);
  }

  context.data.gh = github(auth.token);
  context.data.repo = repoName(env);
  context.data.branch = env.GITHUB_BRANCH || "main";
  context.data.login = auth.login;
  try {
    return await context.next();
  } catch (e) {
    if (e.status === 401) return json({ kirjaudu: true, virhe: "Kirjautuminen on vanhentunut." }, 401);
    console.log("toimitus error", e.message);
    return json({ virhe: "Tallennus GitHubiin ei onnistunut. Yritä hetken päästä uudelleen." }, 502);
  }
}
