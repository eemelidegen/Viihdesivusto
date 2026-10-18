// A reader reports a comment; three reports hide it until the editor checks it.
import { currentUser, db, fail, json, sameOrigin } from "../../../lib/users.js";
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Ei käytössä.", 503);
  const me = await currentUser(env, request); if (!me) return fail("Kirjaudu sisään ilmoittaaksesi.", 401);
  const { id } = await request.json().catch(() => ({}));
  const c = await D.prepare("SELECT id FROM comments WHERE id = ?").bind(Number(id)).first();
  if (!c) return fail("Kommenttia ei löytynyt.", 404);
  const r = await D.prepare("INSERT OR IGNORE INTO reports (comment_id, user_id) VALUES (?, ?)").bind(c.id, me.id).run();
  if (r.meta.changes) await D.prepare("UPDATE comments SET reports = reports + 1, status = CASE WHEN reports + 1 >= 3 AND status = 'ok' THEN 'review' ELSE status END WHERE id = ?").bind(c.id).run();
  return json({ ok: true });
}
