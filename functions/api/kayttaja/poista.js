// Deletes the reader's account and all their comments (GDPR: right to erasure).
import { clearUserCookie, currentUser, db, fail, hashPassword, json, same, sameOrigin } from "../../../lib/users.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Ei käytössä.", 503);
  const me = await currentUser(env, request); if (!me) return fail("Kirjaudu ensin.", 401);
  const { salasana = "" } = await request.json().catch(() => ({}));
  const u = await D.prepare("SELECT * FROM users WHERE id = ?").bind(me.id).first();
  if (!u) return json({ ok: true }, 200, { "Set-Cookie": clearUserCookie() });
  const { hash } = await hashPassword(String(salasana), u.salt);
  if (!same(hash, u.hash)) return fail("Väärä salasana.", 401);
  await D.batch([
    D.prepare("DELETE FROM reports WHERE user_id = ? OR comment_id IN (SELECT id FROM comments WHERE user_id = ?)").bind(u.id, u.id),
    D.prepare("DELETE FROM comments WHERE user_id = ?").bind(u.id),
    D.prepare("DELETE FROM users WHERE id = ?").bind(u.id),
  ]);
  return json({ ok: true }, 200, { "Set-Cookie": clearUserCookie() });
}
