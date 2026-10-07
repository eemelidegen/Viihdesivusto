// Search index for /haku/: every published story in a compact form.
import { aiheLista } from "../lib/aiheet.js";

export const data = { permalink: "/haku.json", eleventyExcludeFromCollections: true };

export function render({ collections, site }) {
  const cats = Object.fromEntries(site.categories.map((c) => [c.slug, c.name]));
  return JSON.stringify(collections.artikkelit.map((a) => ({
    t: a.data.title, e: a.data.excerpt || "", u: a.url, i: a.data.image || "", c: cats[a.data.category] || "",
    a: aiheLista(a.data.aiheet).map((x) => x.name).join(", "), d: a.date.toISOString(),
  })));
}
