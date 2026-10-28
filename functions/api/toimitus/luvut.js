// Read counts per story for the writing tool: total, last 7 days and today (Finnish time).
import { db, finnishDay } from "../../../lib/users.js";

export async function onRequestGet({ env }) {
  const D = await db(env); if (!D) return Response.json({ luvut: {} });
  const today = finnishDay(), weekAgo = finnishDay(Date.now() - 6 * 864e5);
  const { results } = await D.prepare(
    `SELECT story, SUM(n) AS yht, SUM(CASE WHEN day >= ? THEN n ELSE 0 END) AS viikko, SUM(CASE WHEN day = ? THEN n ELSE 0 END) AS tanaan
     FROM views GROUP BY story`).bind(weekAgo, today).all();
  const luvut = {};
  for (const r of results) luvut[r.story] = { yht: r.yht, viikko: r.viikko, tanaan: r.tanaan };
  return Response.json({ luvut }, { headers: { "Cache-Control": "no-store" } });
}
