// Delete an article (its uploaded image stays in the repository).
import { ARTICLE_DIR, commit, readArticle, validFile } from "../../../lib/articles.js";

export async function onRequestPost({ request, data }) {
  const { file } = (await request.json().catch(() => ({}))) || {};
  if (!validFile(file)) return Response.json({ virhe: "Tuntematon juttu." }, { status: 400 });
  const { fields } = await readArticle(data.gh, data.repo, data.branch, file);
  await commit(data.gh, data.repo, data.branch, `Poista: ${fields.title || file} (${data.login})`, [{ path: `${ARTICLE_DIR}/${file}`, delete: true }]);
  return Response.json({ ok: true });
}
