// One article's fields and body for editing.
import { readArticle, validFile } from "../../../lib/articles.js";

export async function onRequestGet({ request, data }) {
  const file = new URL(request.url).searchParams.get("tiedosto");
  if (!validFile(file)) return Response.json({ virhe: "Tuntematon juttu." }, { status: 400 });
  const { fields, body } = await readArticle(data.gh, data.repo, data.branch, file);
  return Response.json({ file, fields, body }, { headers: { "Cache-Control": "no-store" } });
}
