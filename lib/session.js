// Signed login session for editor-only pages (e.g. /admin/somekuva/).
// The cookie holds {login, exp} plus an HMAC keyed from GITHUB_CLIENT_SECRET,
// so it cannot be forged without the secret.
const enc = new TextEncoder();
export const SESSION_COOKIE = "vk_session";
export const SESSION_DAYS = 30;
export const repoName = (env) => env.GITHUB_REPO || "eemelidegen/Viihdesivusto";

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function sign(env, payload) {
  const key = await crypto.subtle.importKey("raw", enc.encode(`valokeila-session:${env.GITHUB_CLIENT_SECRET}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export function getCookie(request, name) {
  const match = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

export async function createSession(env, login) {
  const payload = b64url(enc.encode(JSON.stringify({ login, exp: Date.now() + SESSION_DAYS * 864e5 })));
  return `${payload}.${await sign(env, payload)}`;
}

// Returns the GitHub login of a valid, unexpired session, otherwise null.
export async function readSession(env, request) {
  const value = getCookie(request, SESSION_COOKIE);
  if (!value || !env.GITHUB_CLIENT_SECRET) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(env, payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff) return null;
  try {
    const { login, exp } = JSON.parse(fromB64url(payload));
    return exp > Date.now() ? login : null;
  } catch {
    return null;
  }
}

// Only same-site paths are allowed as a post-login destination.
export const safeNext = (next) => (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/admin/somekuva/");
