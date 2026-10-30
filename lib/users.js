// Reader accounts and comments, stored in a Cloudflare D1 database bound as DB.
// Tables are created on first use, so no manual SQL is needed.
const enc = new TextEncoder();
export const USER_COOKIE = "hl_user";
const USER_DAYS = 60;

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

export const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
export const fail = (virhe, status = 400) => json({ virhe }, status);
// Date as YYYY-MM-DD in Finnish time (read counts are kept per day).
export const finnishDay = (t = Date.now()) => new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Helsinki" });

let ready = null;
export function db(env) {
  if (!env.DB) return null;
  ready ||= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, salt TEXT NOT NULL, created INTEGER NOT NULL, banned INTEGER NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, last_comment INTEGER NOT NULL DEFAULT 0)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, story TEXT NOT NULL, user_id INTEGER NOT NULL, parent INTEGER, body TEXT NOT NULL, created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ok', reports INTEGER NOT NULL DEFAULT 0)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS comments_story ON comments (story, created)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS reports (comment_id INTEGER NOT NULL, user_id INTEGER NOT NULL, PRIMARY KEY (comment_id, user_id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS views (story TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (story, day))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS raffle (id INTEGER PRIMARY KEY AUTOINCREMENT, handle TEXT NOT NULL, email TEXT NOT NULL UNIQUE, created INTEGER NOT NULL, sender TEXT NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS tips (id INTEGER PRIMARY KEY AUTOINCREMENT, body TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', story TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, sender TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new')`),
  ]).catch((e) => { ready = null; throw e; });
  return ready.then(() => env.DB);
}

// --- Passwords (PBKDF2-SHA256) ----------------------------------------------
export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? Uint8Array.from(fromB64url(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return { hash: b64url(bits), salt: b64url(salt) };
}
export function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// --- Session cookie: {id, name, exp} + HMAC ---------------------------------
async function sign(env, payload) {
  const key = await crypto.subtle.importKey("raw", enc.encode(`hulina-user:${env.GITHUB_CLIENT_SECRET || env.USER_SECRET || ""}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}
export async function userCookie(env, user) {
  const payload = b64url(enc.encode(JSON.stringify({ id: user.id, name: user.name, exp: Date.now() + USER_DAYS * 864e5 })));
  return `${USER_COOKIE}=${payload}.${await sign(env, payload)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${USER_DAYS * 86400}`;
}
export const clearUserCookie = () => `${USER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export async function currentUser(env, request) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${USER_COOKIE}=([^;]+)`));
  if (!m || !(env.GITHUB_CLIENT_SECRET || env.USER_SECRET)) return null;
  const [payload, sig] = m[1].split(".");
  if (!payload || !sig || !same(await sign(env, payload), sig)) return null;
  try { const u = JSON.parse(new TextDecoder().decode(Uint8Array.from(fromB64url(payload), (c) => c.charCodeAt(0)))); return u.exp > Date.now() ? u : null; } catch { return null; }
}

// Writes are accepted only from this site's own pages.
export const sameOrigin = (request) => request.headers.get("Origin") === new URL(request.url).origin;

// --- Names and comment text ---------------------------------------------------
export const nameKey = (n) => n.toLocaleLowerCase("fi").normalize("NFC");
export function checkName(n) {
  if (!/^[\p{L}\p{N}_.-]{3,24}$/u.test(n)) return "Nimimerkissä voi olla 3–24 kirjainta, numeroa tai merkkejä _ . -";
  if (/^(hulina|toimitus|admin|moderaattori|yllapito|ylläpito)/i.test(n)) return "Tätä nimimerkkiä ei voi käyttää.";
  return null;
}
const HOLD = /(https?:\/\/|www\.|\b(?:homo|neekeri|ryssä|huora|vammanen|tapan|tappaa sut|kuole)\b)/i;
export const needsReview = (text) => HOLD.test(text);
