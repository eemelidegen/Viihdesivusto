// GET /api/kayttaja/kommentit -> the signed-in reader's own latest comments
import { currentUser, db, fail, json } from "../../../lib/users.js";
export async function onRequestGet({ request, env }) {
  const D = await db(env); if (!D) return fail("Ei käytössä.", 503);
  const me = await currentUser(env, request); if (!me) return fail("Kirjaudu sisään.", 401);
  const { results } = await D.prepare(
    `SELECT c.id, c.story, c.body, c.created, c.status, c.parent,
            (SELECT COUNT(*) FROM comments r WHERE r.parent = c.id AND r.status = 'ok') AS replies
     FROM comments c WHERE c.user_id = ? ORDER BY c.created DESC LIMIT 100`).bind(me.id).all();
  return json({ kommentit: results.map((c) => ({ id: c.id, juttu: c.story, teksti: c.body, aika: c.created, odottaa: c.status !== "ok", vastaus: !!c.parent, vastauksia: c.replies })) });
}
