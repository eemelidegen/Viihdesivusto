// Latest articles (newest file names first) for the writing tool's list.
import { listArticles } from "../../../lib/articles.js";

export async function onRequestGet({ data }) {
  return Response.json({ jutut: await listArticles(data.gh, data.repo, data.branch) }, { headers: { "Cache-Control": "no-store" } });
}
