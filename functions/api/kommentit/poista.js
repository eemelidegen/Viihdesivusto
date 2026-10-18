// A reader deletes their own comment (replies to it go too).
import { currentUser, db, fail, json, sameOrigin } from "../../../lib/users.js";
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Ei käytössä.", 503);
  const me = await currentUser(env, request); if (!me) return fail("Kirjaudu sisään.", 401);
  const { id } = await request.json().catch(() => ({}));
  const c = await D.prepare("SELECT id FROM comments WHERE id = ? AND user_id = ?").bind(Number(id), me.id).first();
  if (!c) return fail("Kommenttia ei löytynyt.", 404);
  await D.batch([
    D.prepare("DELETE FROM reports WHERE comment_id IN (SELECT id FROM comments WHERE id = ? OR parent = ?)").bind(c.id, c.id),
    D.prepare("DELETE FROM comments WHERE id = ? OR parent = ?").bind(c.id, c.id),
  ]);
  return json({ ok: true });
}
