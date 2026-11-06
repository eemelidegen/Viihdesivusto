// Uutisvahti for the newsroom.
//   GET /api/toimitus/uutisvahti            -> list of sources and topics
//   GET /api/toimitus/uutisvahti?lahde=id   -> latest headlines from one source (cached 10 min)
// One source per request keeps each call well inside the Functions CPU limit; the page asks for
// all sources at once and groups the stories in the browser.
import { LAHTEET, AIHEET, haeLahde } from "../../../lib/uutisvahti.js";

const MAX_AGE = 600;
const json = (data, extra = {}) => Response.json(data, { headers: { "Cache-Control": "no-store", ...extra } });

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("lahde");
  if (!id) {
    return json({
      lahteet: LAHTEET.map(({ id, nimi, ryhma }) => ({ id, nimi, ryhma })),
      aiheet: AIHEET.map(({ id, nimi }) => ({ id, nimi })).concat([{ id: "muut", nimi: "Muut" }]),
    });
  }
  const lahde = LAHTEET.find((l) => l.id === id);
  if (!lahde) return Response.json({ virhe: "Tuntematon lähde." }, { status: 404 });

  const cache = caches.default;
  const key = `https://hulina.net/__uutisvahti/v2/${lahde.id}`;
  if (!url.searchParams.has("paivita")) {
    const hit = await cache.match(key);
    if (hit) return new Response(hit.body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
  let body;
  try {
    const jutut = await haeLahde(lahde, AbortSignal.timeout(9000));
    body = JSON.stringify({ id: lahde.id, nimi: lahde.nimi, ok: true, haettu: Date.now(), jutut });
  } catch (e) {
    return json({ id: lahde.id, nimi: lahde.nimi, ok: false, virhe: String(e.message || e).slice(0, 80), jutut: [] });
  }
  waitUntil(cache.put(key, new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${MAX_AGE}` } })));
  return new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
