// POST /api/vinkki {teksti, yhteys?, juttu?} -> a reader's news tip or error report, read in the writing tool.
import { db, fail, json, sameOrigin } from "../../lib/users.js";

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  const D = await db(env); if (!D) return fail("Viestien vastaanotto ei ole vielä käytössä.", 503);
  const { teksti = "", yhteys = "", juttu = "", sivusto = "" } = await request.json().catch(() => ({}));
  if (sivusto) return json({ ok: true }); // honeypot field filled in by bots
  const body = String(teksti).replace(/\r\n/g, "\n").trim(), contact = String(yhteys).trim(), story = String(juttu).trim();
  if (body.length < 10) return fail("Kirjoita viestiin vähän enemmän.");
  if (body.length > 4000) return fail("Viesti on liian pitkä (enintään 4000 merkkiä).");
  if (contact.length > 200 || story.length > 300) return fail("Tarkista kentät.");

  // Rate limit by a daily-salted hash of the address; the address itself is never stored.
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const sender = hex(await crypto.subtle.digest("SHA-256", enc.encode(`${ip}|${new Date().toISOString().slice(0, 10)}|${env.GITHUB_CLIENT_SECRET || env.USER_SECRET || ""}`))).slice(0, 32);
  const recent = await D.prepare("SELECT COUNT(*) AS n FROM tips WHERE sender = ? AND created > ?").bind(sender, Date.now() - 3600e3).first();
  if (recent && recent.n >= 5) return fail("Olet lähettänyt jo useamman viestin. Yritä myöhemmin uudelleen.", 429);

  await D.prepare("INSERT INTO tips (body, contact, story, created, sender) VALUES (?, ?, ?, ?, ?)").bind(body, contact, story, Date.now(), sender).run();
  return json({ ok: true });
}
