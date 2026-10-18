import { currentUser, json } from "../../../lib/users.js";
export async function onRequestGet({ request, env }) {
  const u = await currentUser(env, request);
  return json({ nimi: u ? u.name : null, kaytossa: !!env.DB });
}
