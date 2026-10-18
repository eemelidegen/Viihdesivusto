import { db, fail, hashPassword, json, nameKey, same, sameOrigin, userCookie } from "../../../lib/users.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Kirjautuminen ei ole vielä käytössä.", 503);
  const { nimi = "", salasana = "" } = await request.json().catch(() => ({}));
  const u = await D.prepare("SELECT * FROM users WHERE name_key = ?").bind(nameKey(String(nimi).trim())).first();
  const wrong = () => fail("Väärä nimimerkki tai salasana.", 401);
  if (!u) { await hashPassword(String(salasana)); return wrong(); }
  if (u.locked_until > Date.now()) return fail("Liian monta yritystä. Yritä 15 minuutin päästä uudelleen.", 429);
  const { hash } = await hashPassword(String(salasana), u.salt);
  if (!same(hash, u.hash)) {
    const fails = u.fails + 1;
    await D.prepare("UPDATE users SET fails = ?, locked_until = ? WHERE id = ?").bind(fails >= 8 ? 0 : fails, fails >= 8 ? Date.now() + 15 * 60e3 : 0, u.id).run();
    return wrong();
  }
  if (u.banned) return fail("Tili on suljettu kommentointisääntöjen rikkomisen vuoksi.", 403);
  await D.prepare("UPDATE users SET fails = 0, locked_until = 0 WHERE id = ?").bind(u.id).run();
  return json({ nimi: u.name }, 200, { "Set-Cookie": await userCookie(env, u) });
}
