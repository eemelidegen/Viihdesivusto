// POST /api/kayttaja/salasana {nykyinen, uusi} -> change the reader's password
import { currentUser, db, fail, hashPassword, json, same, sameOrigin } from "../../../lib/users.js";
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Ei käytössä.", 503);
  const me = await currentUser(env, request); if (!me) return fail("Kirjaudu sisään.", 401);
  const { nykyinen = "", uusi = "" } = await request.json().catch(() => ({}));
  const next = String(uusi);
  if (next.length < 8 || next.length > 200) return fail("Uudessa salasanassa pitää olla vähintään 8 merkkiä.");
  const u = await D.prepare("SELECT * FROM users WHERE id = ?").bind(me.id).first();
  if (!u) return fail("Tiliä ei löytynyt.", 404);
  if (u.locked_until > Date.now()) return fail("Liian monta yritystä. Yritä 15 minuutin päästä uudelleen.", 429);
  const { hash } = await hashPassword(String(nykyinen), u.salt);
  if (!same(hash, u.hash)) {
    const fails = u.fails + 1;
    await D.prepare("UPDATE users SET fails = ?, locked_until = ? WHERE id = ?").bind(fails >= 8 ? 0 : fails, fails >= 8 ? Date.now() + 15 * 60e3 : 0, u.id).run();
    return fail("Nykyinen salasana on väärin.", 401);
  }
  const fresh = await hashPassword(next);
  await D.prepare("UPDATE users SET hash = ?, salt = ?, fails = 0, locked_until = 0 WHERE id = ?").bind(fresh.hash, fresh.salt, u.id).run();
  return json({ ok: true });
}
