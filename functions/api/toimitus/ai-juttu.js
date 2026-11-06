// POST /api/toimitus/ai-juttu  {otsikko, lahteet: [{n, u, o}]}
// Streams newline-delimited JSON: {"tila": "..."} progress lines while Claude reads and writes,
// then {"juttu": {...}} or {"virhe": "..."}. Streaming keeps the connection alive during the
// minute or two the draft takes.
import { kirjoitaJuttu } from "../../../lib/ai-juttu.js";

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ virhe: "Tekoälyavainta ei ole asetettu. Lisää ANTHROPIC_API_KEY Cloudflaren asetuksiin." }, { status: 503 });
  }
  let input;
  try { input = await request.json(); } catch { return Response.json({ virhe: "Virheellinen pyyntö." }, { status: 400 }); }
  const lahteet = Array.isArray(input.lahteet) ? input.lahteet.filter((l) => l && /^https?:\/\//.test(l.u)) : [];
  if (!input.otsikko || !lahteet.length) return Response.json({ virhe: "Aiheesta puuttuu otsikko tai lähteet." }, { status: 400 });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const send = (obj) => writer.write(enc.encode(JSON.stringify(obj) + "\n")).catch(() => {});
  let last = "";
  const tick = setInterval(() => send({ tila: last || "Työn alla…" }), 15000);

  waitUntil((async () => {
    try {
      send({ tila: "Aloitetaan…" });
      const juttu = await kirjoitaJuttu(env, { otsikko: String(input.otsikko).slice(0, 300), lahteet }, (t) => { if (t !== last) { last = t; send({ tila: t }); } });
      await send({ juttu });
    } catch (e) {
      console.log("ai-juttu", e && e.message);
      await send({ virhe: e && e.status === 401 ? "Tekoälyavain ei kelpaa." : e && e.status === 429 ? "Tekoälypalvelu on ruuhkainen. Yritä hetken päästä." : (e && e.message) || "Jutun kirjoittaminen epäonnistui." });
    } finally {
      clearInterval(tick);
      writer.close().catch(() => {});
    }
  })());

  return new Response(readable, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
