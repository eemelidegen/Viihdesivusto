// Editor moderation. GET: latest comments (review queue first). POST {id, toiminto}: hyvaksy | piilota | poista | estä
import { db } from "../../../lib/users.js";
const json = (d, s = 200) => Response.json(d, { status: s, headers: { "Cache-Control": "no-store" } });

export async function onRequestGet({ env }) {
  const D = await db(env); if (!D) return json({ kaytossa: false, kommentit: [] });
  const { results } = await D.prepare(
    `SELECT c.id, c.story, c.body, c.created, c.status, c.reports, c.user_id, u.name, u.banned FROM comments c JOIN users u ON u.id = c.user_id
     ORDER BY CASE WHEN c.status = 'ok' THEN 1 ELSE 0 END, c.created DESC LIMIT 200`).all();
  const counts = await D.prepare("SELECT (SELECT COUNT(*) FROM users) AS kayttajat, (SELECT COUNT(*) FROM comments) AS kommentit, (SELECT COUNT(*) FROM comments WHERE status != 'ok') AS jonossa").first();
  return json({ kaytossa: true, ...counts, kommentit: results });
}

export async function onRequestPost({ request, env }) {
  const D = await db(env); if (!D) return json({ virhe: "Tietokantaa ei ole liitetty." }, 503);
  const { id, toiminto } = await request.json().catch(() => ({}));
  const c = await D.prepare("SELECT id, user_id FROM comments WHERE id = ?").bind(Number(id)).first();
  if (!c) return json({ virhe: "Kommenttia ei löytynyt." }, 404);
  if (toiminto === "hyvaksy") await D.prepare("UPDATE comments SET status = 'ok', reports = 0 WHERE id = ?").bind(c.id).run();
  else if (toiminto === "piilota") await D.prepare("UPDATE comments SET status = 'hidden' WHERE id = ?").bind(c.id).run();
  else if (toiminto === "poista") await D.batch([D.prepare("DELETE FROM reports WHERE comment_id = ?").bind(c.id), D.prepare("DELETE FROM comments WHERE id = ? OR parent = ?").bind(c.id, c.id)]);
  else if (toiminto === "esta") await D.batch([D.prepare("UPDATE users SET banned = 1 WHERE id = ?").bind(c.user_id), D.prepare("UPDATE comments SET status = 'hidden' WHERE user_id = ?").bind(c.user_id)]);
  else return json({ virhe: "Tuntematon toiminto." }, 400);
  return json({ ok: true });
}
