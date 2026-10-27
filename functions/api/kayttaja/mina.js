import { currentUser, db, json } from "../../../lib/users.js";
export async function onRequestGet({ request, env }) {
  const u = await currentUser(env, request);
  if (!u) return json({ nimi: null, kaytossa: !!env.DB });
  // The account page asks for the profile details too (?tiedot=1); the header only needs the name.
  if (!new URL(request.url).searchParams.has("tiedot")) return json({ nimi: u.name, kaytossa: !!env.DB });
  const D = await db(env);
  const row = D && await D.prepare(
    `SELECT u.created, (SELECT COUNT(*) FROM comments WHERE user_id = u.id AND status = 'ok') AS ok,
            (SELECT COUNT(*) FROM comments WHERE user_id = u.id AND status != 'ok') AS waiting,
            (SELECT COUNT(*) FROM comments r JOIN comments c ON r.parent = c.id WHERE c.user_id = u.id AND r.user_id != u.id AND r.status = 'ok') AS replies
     FROM users u WHERE u.id = ?`).bind(u.id).first();
  return json({ nimi: u.name, kaytossa: true, luotu: row ? row.created : null, kommentteja: row ? row.ok : 0, odottaa: row ? row.waiting : 0, vastauksia: row ? row.replies : 0 });
}
