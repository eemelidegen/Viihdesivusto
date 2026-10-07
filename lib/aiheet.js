// Story topics ("aiheet"): a comma-separated front matter field, e.g. "Big Brother, Tosi-tv".
// Each topic gets its own page at /aihe/<slug>/.
import { slugify } from "./articles.js";

export function aiheLista(value) {
  const seen = new Set();
  return String(value || "").split(",").map((s) => s.trim()).filter(Boolean).flatMap((name) => {
    const slug = slugify(name);
    if (seen.has(slug)) return [];
    seen.add(slug);
    return [{ name, slug }];
  });
}

// All topics with their stories (newest first), most used first.
export function kokoaAiheet(articles) {
  const map = new Map();
  for (const a of articles) {
    for (const { name, slug } of aiheLista(a.data.aiheet)) {
      if (!map.has(slug)) map.set(slug, { slug, name, items: [], latest: a.date });
      map.get(slug).items.push(a);
    }
  }
  return [...map.values()].sort((x, y) => y.items.length - x.items.length || y.latest - x.latest);
}
