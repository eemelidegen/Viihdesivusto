// Save an article (new or existing), optionally with a new main image, as one commit.
import site from "../../../src/_data/site.json" with { type: "json" };
import { ARTICLE_DIR, UPLOAD_DIR, commit, slugify, toMarkdown, validFile } from "../../../lib/articles.js";

const MAX_IMAGE_BASE64 = 8 * 1024 * 1024;
const helsinkiDay = (d) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(d);
const str = (v, max) => String(v ?? "").trim().slice(0, max);

export async function onRequestPost({ request, data }) {
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object") return Response.json({ virhe: "Virheellinen pyyntö." }, { status: 400 });

  const f = input.fields || {};
  const title = str(f.title, 200);
  if (!title) return Response.json({ virhe: "Jutulta puuttuu otsikko." }, { status: 400 });
  const category = site.categories.some((c) => c.slug === f.category) ? f.category : site.categories[0].slug;
  const date = Number.isNaN(Date.parse(f.date)) ? new Date() : new Date(f.date);
  const fields = {
    title, category,
    excerpt: str(f.excerpt, 400),
    date: date.toISOString(),
    author: str(f.author, 80) || "Toimitus",
    image: str(f.image, 300),
    imageAlt: str(f.imageAlt, 300),
    imageCredit: str(f.imageCredit, 120),
    nosto: f.nosto === true,
    draft: f.draft === true,
  };

  let file = input.file;
  if (file !== undefined && file !== null && !validFile(file)) return Response.json({ virhe: "Tuntematon juttu." }, { status: 400 });
  const isNew = !file;
  if (isNew) {
    const base = `${helsinkiDay(date)}-${slugify(title)}`;
    file = `${base}.md`;
    // Don't overwrite another story that happens to have the same title and day.
    for (let n = 2; await exists(data, `${ARTICLE_DIR}/${file}`); n++) file = `${base}-${n}.md`;
  }
  const slug = file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");

  const changes = [];
  if (input.image?.base64) {
    if (input.image.base64.length > MAX_IMAGE_BASE64) return Response.json({ virhe: "Kuva on liian suuri." }, { status: 413 });
    const name = `${slug}-${crypto.randomUUID().slice(0, 6)}.jpg`;
    changes.push({ path: `${UPLOAD_DIR}/${name}`, base64: input.image.base64 });
    fields.image = `/assets/img/uploads/${name}`;
  }
  changes.push({ path: `${ARTICLE_DIR}/${file}`, content: toMarkdown(fields, input.body) });

  const verb = fields.draft ? "Luonnos" : isNew ? "Julkaise" : "Päivitä";
  await commit(data.gh, data.repo, data.branch, `${verb}: ${title} (${data.login})`, changes);
  return Response.json({ file, url: fields.draft ? null : `/${slug}/`, image: fields.image });
}

async function exists(data, path) {
  try { await data.gh.get(`/repos/${data.repo}/contents/${path}?ref=${data.branch}`); return true; }
  catch (e) { if (e.status === 404) return false; throw e; }
}
