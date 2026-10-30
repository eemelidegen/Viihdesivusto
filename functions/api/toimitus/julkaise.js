// Save an article (new or existing), optionally with a new main image, as one commit.
import site from "../../../src/_data/site.js";
import { ARTICLE_DIR, UPLOAD_DIR, commit, slugify, toMarkdown, validFile } from "../../../lib/articles.js";

const MAX_IMAGE_BASE64 = 8 * 1024 * 1024;
const MAX_BODY_IMAGES = 30;
const MAX_VIDEOS = 3;
const MAX_VIDEO_BASE64 = 34 * 1024 * 1024; // about 25 MB, Cloudflare Pages' per-file limit
const VIDEO_DIR = "src/assets/video";
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
    aiheet: str(f.aiheet, 200).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8).join(", "),
    date: date.toISOString(),
    author: str(f.author, 80) || "Toimitus",
    image: str(f.image, 300),
    imageAlt: str(f.imageAlt, 300),
    imageCredit: str(f.imageCredit, 120),
    imageLink: /^https:\/\/[^\s"<>]+$/.test(str(f.imageLink, 400)) ? str(f.imageLink, 400) : "",
    imageFocus: /^\d{1,3}% \d{1,3}%$/.test(String(f.imageFocus || "")) ? f.imageFocus : "",
    lahteet: str(f.lahteet, 1000),
    paivitetty: f.paivitetty && !Number.isNaN(Date.parse(f.paivitetty)) ? new Date(f.paivitetty).toISOString() : "",
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
  // Photos added inside the text: only ones the text actually uses, with names the editor generated.
  const body = String(input.body || "");
  const extra = Array.isArray(input.images) ? input.images.slice(0, MAX_BODY_IMAGES) : [];
  for (const img of extra) {
    const name = String(img?.name || "");
    if (!/^kuva-[a-z0-9-]{4,40}\.jpg$/.test(name) || !body.includes(`/assets/img/uploads/${name}`)) continue;
    if (typeof img.base64 !== "string" || img.base64.length > MAX_IMAGE_BASE64) return Response.json({ virhe: "Jokin tekstin kuvista on liian suuri." }, { status: 413 });
    changes.push({ path: `${UPLOAD_DIR}/${name}`, base64: img.base64 });
  }
  // Own videos inside the text, each with the poster frame the editor grabbed.
  const videos = Array.isArray(input.videos) ? input.videos.slice(0, MAX_VIDEOS) : [];
  for (const v of videos) {
    const name = String(v?.name || "");
    if (!/^video-[a-z0-9-]{4,40}\.mp4$/.test(name) || !body.includes(`/assets/video/${name}`)) continue;
    if (typeof v.base64 !== "string" || v.base64.length > MAX_VIDEO_BASE64) return Response.json({ virhe: "Video on liian suuri (enintään 25 Mt)." }, { status: 413 });
    changes.push({ path: `${VIDEO_DIR}/${name}`, base64: v.base64 });
    if (typeof v.poster === "string" && v.poster && v.poster.length < MAX_IMAGE_BASE64) changes.push({ path: `${VIDEO_DIR}/${name.replace(/\.mp4$/, ".jpg")}`, base64: v.poster });
  }
  changes.push({ path: `${ARTICLE_DIR}/${file}`, content: toMarkdown(fields, body) });

  const verb = fields.draft ? "Luonnos" : isNew ? "Julkaise" : "Päivitä";
  await commit(data.gh, data.repo, data.branch, `${verb}: ${title} (${data.login})`, changes);
  return Response.json({ file, url: fields.draft ? null : `/${slug}/`, image: fields.image });
}

async function exists(data, path) {
  try { await data.gh.get(`/repos/${data.repo}/contents/${path}?ref=${data.branch}`); return true; }
  catch (e) { if (e.status === 404) return false; throw e; }
}
