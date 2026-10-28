// POST /api/luettu {juttu} -> counts one read of a story (no cookies, nothing about the reader is stored).
import { db, finnishDay, json, sameOrigin } from "../../lib/users.js";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request) || BOT.test(request.headers.get("User-Agent") || "")) return json({ ok: true });
  const D = await db(env); if (!D) return json({ ok: true });
  const { juttu } = await request.json().catch(() => ({}));
  if (typeof juttu !== "string" || !/^[a-z0-9-]{1,90}$/.test(juttu)) return json({ ok: true });
  await D.prepare("INSERT INTO views (story, day, n) VALUES (?, ?, 1) ON CONFLICT (story, day) DO UPDATE SET n = n + 1").bind(juttu, finnishDay()).run();
  return json({ ok: true });
}
