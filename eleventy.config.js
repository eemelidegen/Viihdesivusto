import { renderOgImages } from "./lib/og-image.js";
import site from "./src/_data/site.js";
import { aiheLista, kokoaAiheet } from "./lib/aiheet.js";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  // ads.txt: tells ad networks which accounts may sell ads on this site (Google AdSense)
  eleventyConfig.addPassthroughCopy({ "src/ads.txt": "ads.txt" });

  const fiDate = new Intl.DateTimeFormat("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
  const fiDateTime = new Intl.DateTimeFormat("fi-FI", {
    day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Helsinki",
  });

  eleventyConfig.addFilter("pvm", (d) => fiDate.format(new Date(d)));
  eleventyConfig.addFilter("pvmAika", (d) => fiDateTime.format(new Date(d)));
  eleventyConfig.addFilter("iso", (d) => new Date(d).toISOString());
  eleventyConfig.addFilter("rfc822", (d) => new Date(d).toUTCString());
  eleventyConfig.addFilter("absUrl", (path, base) => new URL(path, base).href);
  eleventyConfig.addFilter("lukuaika", (content = "") => {
    const words = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  });
  eleventyConfig.addFilter("kategoria", (slug, categories) => categories.find((c) => c.slug === slug) || { slug, name: slug, color: "#555" });
  eleventyConfig.addFilter("kategoriassa", (articles, slug) => articles.filter((a) => a.data.category === slug));
  eleventyConfig.addFilter("ilman", (articles, url) => articles.filter((a) => a.url !== url));
  // Articles marked `nosto: true`, falling back to the newest ones.
  eleventyConfig.addFilter("nostot", (articles) => {
    const picked = articles.filter((a) => a.data.nosto);
    return picked.length ? picked : articles;
  });
  eleventyConfig.addFilter("alku", (arr, n) => arr.slice(0, n));
  // "Lue myös": two other stories, same category first.
  eleventyConfig.addFilter("lueMyos", (articles, url, category) => {
    const others = articles.filter((a) => a.url !== url);
    return [...others.filter((a) => a.data.category === category), ...others.filter((a) => a.data.category !== category)].slice(0, 2);
  });
  // Insert a block after the middle top-level paragraph of an article body
  // (not inside quotes or lists); short articles are left as they are.
  eleventyConfig.addFilter("keskelle", (html, block) => {
    if (!block || !html) return html;
    const ends = [];
    let depth = 0;
    for (const m of html.matchAll(/<(\/?)(blockquote|ul|ol|table|figure|div|aside)\b[^>]*>|<\/p>/gi)) {
      if (m[0].toLowerCase() === "</p>") { if (depth === 0) ends.push(m.index + 4); }
      else depth += m[1] ? -1 : 1;
    }
    if (ends.length < 4) return html;
    const at = ends[Math.floor(ends.length / 2) - 1];
    return html.slice(0, at) + block + html.slice(at);
  });
  eleventyConfig.addFilter("ohita", (arr, n) => arr.slice(n));
  eleventyConfig.addFilter("aiheLista", aiheLista);
  // "Nyt puhutaan": the most used topics of the last two weeks (or of all time if quiet).
  eleventyConfig.addFilter("nytPuhutaan", (aiheet, n = 6) => {
    const since = Date.now() - 14 * 86400e3;
    const recent = aiheet.filter((a) => a.latest >= since);
    return (recent.length ? recent : aiheet).slice(0, n);
  });
  // Newest story flagged as breaking news ("kiire").
  eleventyConfig.addFilter("kiireinen", (articles) => articles.find((a) => a.data.kiire) || null);
  // The next (older) story, wrapping around to the newest.
  eleventyConfig.addFilter("seuraava", (articles, url) => {
    const i = articles.findIndex((a) => a.url === url);
    return articles.length > 1 && i >= 0 ? articles[(i + 1) % articles.length] : null;
  });
  // Stories published within the last `days` days (Google News sitemap).
  eleventyConfig.addFilter("tuoreet", (articles, days) => articles.filter((a) => a.date >= Date.now() - days * 86400e3));
  eleventyConfig.addFilter("rikasta", rikasta);

  // Newest first; drafts (draft: true) are excluded from listings and the build.
  // Articles seen in this build; their share images are drawn after the build.
  let ogArticles = [];
  eleventyConfig.addCollection("artikkelit", (api) => {
    const items = api.getFilteredByGlob("src/artikkelit/*.md").filter((a) => !a.data.draft).sort((a, b) => b.date - a.date);
    ogArticles = items.map((a) => ({ slug: a.page.fileSlug, title: a.data.title, category: a.data.category, image: a.data.image }));
    return items;
  });
  eleventyConfig.addCollection("aiheet", (api) =>
    kokoaAiheet(api.getFilteredByGlob("src/artikkelit/*.md").filter((a) => !a.data.draft).sort((a, b) => b.date - a.date)));
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    await renderOgImages({ outDir: `${dir.output}/og`, srcDir: dir.input, site, articles: ogArticles });
  });
  eleventyConfig.addPreprocessor("drafts", "md", (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") return false;
  });

  return {
    dir: { input: "src", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}

// ---------- Article body extras ----------
// Two or more photos in a row become a swipeable gallery, a single photo a figure
// with a caption (Markdown title), and a lone video/post link a click-to-load embed.
const attr = (tag, name) => (tag.match(new RegExp(`${name}="([^"]*)"`)) || [])[1] || "";
function figure(img, cls) {
  const cap = attr(img, "title");
  return `<figure class="${cls}">${img.replace(/ title="[^"]*"/, "").replace("<img ", '<img loading="lazy" ')}${cap ? `<figcaption>${cap}</figcaption>` : ""}</figure>`;
}
const EMBEDS = [
  { name: "YouTube", re: /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/, src: (id, url) => `https://www.youtube-nocookie.com/embed/${id}`, shape: (url) => (url.includes("/shorts/") ? "tall" : "wide") },
  { name: "TikTok", re: /^https?:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/, src: (id) => `https://www.tiktok.com/embed/v2/${id}`, shape: () => "tall" },
  { name: "Instagram", re: /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([\w-]+)/, src: (id) => `https://www.instagram.com/p/${id}/embed`, shape: () => "tall" },
  { name: "X", re: /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/\w+\/status\/(\d+)/, src: (id) => `https://platform.twitter.com/embed/Tweet.html?id=${id}&lang=fi`, shape: () => "post" },
];
export function rikasta(html = "") {
  html = html.replace(/(?:<p><img [^>]*><\/p>\s*){2,}/g, (block) => {
    const imgs = block.match(/<img [^>]*>/g);
    return `<div class="gallery" data-gallery><div class="gallery__track">${imgs.map((i) => figure(i, "gallery__slide")).join("")}</div>`
      + `<button class="gallery__nav gallery__nav--prev" type="button" aria-label="Edellinen kuva">‹</button><button class="gallery__nav gallery__nav--next" type="button" aria-label="Seuraava kuva">›</button>`
      + `<span class="gallery__count"><b>1</b> / ${imgs.length}</span></div>`;
  });
  html = html.replace(/<p>(<img [^>]*>)<\/p>/g, (m, img) => figure(img, "inline-img"));
  return html.replace(/<p>(https?:\/\/[^\s<]+)<\/p>/g, (m, raw) => {
    const url = raw.replace(/&amp;/g, "&");
    for (const e of EMBEDS) {
      const id = (url.match(e.re) || [])[1];
      if (id) return `<div class="embed embed--${e.shape(url)}" data-embed="${e.src(id, url)}"><button class="embed__btn" type="button"><span aria-hidden="true">▶</span> Näytä sisältö: ${e.name}</button><p class="embed__note">Sisältö ladataan palvelusta ${e.name} vasta, kun painat. <a href="${raw}" target="_blank" rel="noopener">Avaa alkuperäinen</a></p></div>`;
    }
    return m;
  });
}
