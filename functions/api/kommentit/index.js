// GET  /api/kommentit?juttu=slug  -> visible comments of a story
// POST /api/kommentit {juttu, teksti, vastaus?} -> new comment (logged-in readers)
import { currentUser, db, fail, json, needsReview, sameOrigin } from "../../../lib/users.js";

const validStory = (s) => typeof s === "string" && /^[a-z0-9-]{1,90}$/.test(s);

export async function onRequestGet({ request, env }) {
  const D = await db(env); if (!D) return json({ kaytossa: false, kommentit: [] });
  const story = new URL(request.url).searchParams.get("juttu");
  if (!validStory(story)) return fail("Tuntematon juttu.");
  const me = await currentUser(env, request);
  const { results } = await D.prepare(
    `SELECT c.id, c.parent, c.body, c.created, c.status, c.user_id, u.name FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.story = ? AND (c.status = 'ok' OR c.user_id = ?) ORDER BY c.created ASC LIMIT 500`).bind(story, me ? me.id : -1).all();
  return json({ kaytossa: true, kommentit: results.map((c) => ({ id: c.id, vastaus: c.parent, teksti: c.body, aika: c.created, nimi: c.name, oma: !!me && c.user_id === me.id, odottaa: c.status !== "ok" })) });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Kommentointi ei ole vielä käytössä.", 503);
  const me = await currentUser(env, request); if (!me) return fail("Kirjaudu sisään kommentoidaksesi.", 401);
  const { juttu, teksti = "", vastaus = null } = await request.json().catch(() => ({}));
  if (!validStory(juttu)) return fail("Tuntematon juttu.");
  const body = String(teksti).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (body.length < 2) return fail("Kirjoita kommentti.");
  if (body.length > 1500) return fail("Kommentti on liian pitkä (enintään 1500 merkkiä).");
  const u = await D.prepare("SELECT id, banned, last_comment FROM users WHERE id = ?").bind(me.id).first();
  if (!u) return fail("Tiliä ei löytynyt. Kirjaudu uudelleen.", 401);
  if (u.banned) return fail("Tilisi ei voi enää kommentoida.", 403);
  if (Date.now() - u.last_comment < 30e3) return fail("Odota hetki ennen seuraavaa kommenttia.", 429);
  let parent = null;
  if (vastaus !== null) {
    const p = await D.prepare("SELECT id, parent FROM comments WHERE id = ? AND story = ?").bind(Number(vastaus), juttu).first();
    if (!p) return fail("Kommenttia, johon vastaat, ei löytynyt.");
    parent = p.parent || p.id; // one level of replies
  }
  const status = needsReview(body) ? "review" : "ok";
  const now = Date.now();
  const r = await D.prepare("INSERT INTO comments (story, user_id, parent, body, created, status) VALUES (?, ?, ?, ?, ?, ?)").bind(juttu, me.id, parent, body, now, status).run();
  await D.prepare("UPDATE users SET last_comment = ? WHERE id = ?").bind(now, me.id).run();
  return json({ id: r.meta.last_row_id, odottaa: status !== "ok" });
}
