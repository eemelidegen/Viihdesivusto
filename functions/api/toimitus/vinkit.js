// Readers' tips for the newsroom. GET: latest tips (new first). POST {id, toiminto}: luettu | uusi | poista
import { db } from "../../../lib/users.js";
const json = (d, s = 200) => Response.json(d, { status: s, headers: { "Cache-Control": "no-store" } });

export async function onRequestGet({ env }) {
  const D = await db(env); if (!D) return json({ kaytossa: false, vinkit: [] });
  const { results } = await D.prepare("SELECT id, body, contact, story, created, status FROM tips ORDER BY CASE WHEN status = 'new' THEN 0 ELSE 1 END, created DESC LIMIT 200").all();
  return json({ kaytossa: true, vinkit: results });
}

export async function onRequestPost({ request, env }) {
  const D = await db(env); if (!D) return json({ virhe: "Tietokantaa ei ole liitetty." }, 503);
  const { id, toiminto } = await request.json().catch(() => ({}));
  if (toiminto === "luettu" || toiminto === "uusi") await D.prepare("UPDATE tips SET status = ? WHERE id = ?").bind(toiminto === "luettu" ? "read" : "new", Number(id)).run();
  else if (toiminto === "poista") await D.prepare("DELETE FROM tips WHERE id = ?").bind(Number(id)).run();
  else return json({ virhe: "Tuntematon toiminto." }, 400);
  return json({ ok: true });
}
