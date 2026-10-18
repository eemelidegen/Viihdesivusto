import { checkName, db, fail, hashPassword, json, nameKey, sameOrigin, userCookie } from "../../../lib/users.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Kommentointi ei ole vielä käytössä.", 503);
  const { nimi = "", salasana = "", hyvaksyn } = await request.json().catch(() => ({}));
  const name = String(nimi).trim(), pass = String(salasana);
  const bad = checkName(name); if (bad) return fail(bad);
  if (pass.length < 8 || pass.length > 200) return fail("Salasanassa pitää olla vähintään 8 merkkiä.");
  if (hyvaksyn !== true) return fail("Hyväksy kommentointisäännöt ja tietosuojaseloste.");
  if (await D.prepare("SELECT 1 FROM users WHERE name_key = ?").bind(nameKey(name)).first()) return fail("Nimimerkki on jo käytössä.", 409);
  const { hash, salt } = await hashPassword(pass);
  const r = await D.prepare("INSERT INTO users (name, name_key, hash, salt, created) VALUES (?, ?, ?, ?, ?)").bind(name, nameKey(name), hash, salt, Date.now()).run();
  const user = { id: r.meta.last_row_id, name };
  return json({ nimi: name }, 200, { "Set-Cookie": await userCookie(env, user) });
}
