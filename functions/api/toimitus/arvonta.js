// Giveaway entries for the writing tool. GET: entries. POST {toiminto}: arvo (draws a random winner) | tyhjenna (deletes all entries).
import { db } from "../../../lib/users.js";
const json = (d, s = 200) => Response.json(d, { status: s, headers: { "Cache-Control": "no-store" } });

export async function onRequestGet({ env }) {
  const D = await db(env); if (!D) return json({ kaytossa: false, osallistujat: [] });
  const { results } = await D.prepare("SELECT id, handle, email, created FROM raffle ORDER BY created DESC").all();
  return json({ kaytossa: true, osallistujat: results });
}

export async function onRequestPost({ request, env }) {
  const D = await db(env); if (!D) return json({ virhe: "Tietokantaa ei ole liitetty." }, 503);
  const { toiminto } = await request.json().catch(() => ({}));
  if (toiminto === "arvo") {
    const { results } = await D.prepare("SELECT id, handle, email, created FROM raffle").all();
    if (!results.length) return json({ virhe: "Ei osallistujia." }, 400);
    const pick = crypto.getRandomValues(new Uint32Array(1))[0] % results.length;
    return json({ voittaja: results[pick], osallistujia: results.length });
  }
  if (toiminto === "tyhjenna") { await D.prepare("DELETE FROM raffle").run(); return json({ ok: true }); }
  return json({ virhe: "Tuntematon toiminto." }, 400);
}
