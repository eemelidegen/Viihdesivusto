// POST /api/arvonta {kayttaja, email, saannot} -> enters the AirPods giveaway (one entry per e-mail address).
import { db, fail, json, sameOrigin } from "../../lib/users.js";

const ENDS = Date.parse("2026-11-08T23:59:59+02:00");
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail("Kielletty.", 403);
  if (Date.now() > ENDS) return fail("Arvonta on päättynyt. Kiitos kaikille osallistujille!", 410);
  const D = await db(env); if (!D) return fail("Osallistuminen ei ole juuri nyt mahdollista. Yritä hetken päästä uudelleen.", 503);
  const { kayttaja = "", email = "", saannot, sivusto = "" } = await request.json().catch(() => ({}));
  if (sivusto) return json({ ok: true }); // honeypot field filled in by bots
  const handle = String(kayttaja).trim().replace(/^@/, ""), mail = String(email).trim().toLowerCase();
  if (!/^[\p{L}\p{N}_.]{2,40}$/u.test(handle)) return fail("Tarkista TikTok- tai Instagram-käyttäjänimesi.");
  if (mail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return fail("Tarkista sähköpostiosoite.");
  if (saannot !== true) return fail("Hyväksy arvonnan säännöt.");

  // Rate limit by a daily-salted hash of the address; the address itself is never stored.
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const sender = hex(await crypto.subtle.digest("SHA-256", enc.encode(`${ip}|${new Date().toISOString().slice(0, 10)}|${env.GITHUB_CLIENT_SECRET || env.USER_SECRET || ""}`))).slice(0, 32);
  const recent = await D.prepare("SELECT COUNT(*) AS n FROM raffle WHERE sender = ? AND created > ?").bind(sender, Date.now() - 3600e3).first();
  if (recent && recent.n >= 5) return fail("Liian monta osallistumista samasta yhteydestä. Yritä myöhemmin uudelleen.", 429);

  const r = await D.prepare("INSERT OR IGNORE INTO raffle (handle, email, created, sender) VALUES (?, ?, ?, ?)").bind(handle, mail, Date.now(), sender).run();
  return json({ ok: true, jo: !r.meta.changes });
}
