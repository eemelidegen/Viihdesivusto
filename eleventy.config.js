import { renderOgImages } from "./lib/og-image.js";
import site from "./src/_data/site.js";

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

  // Newest first; drafts (draft: true) are excluded from listings and the build.
  // Articles seen in this build; their share images are drawn after the build.
  let ogArticles = [];
  eleventyConfig.addCollection("artikkelit", (api) => {
    const items = api.getFilteredByGlob("src/artikkelit/*.md").filter((a) => !a.data.draft).sort((a, b) => b.date - a.date);
    ogArticles = items.map((a) => ({ slug: a.page.fileSlug, title: a.data.title, category: a.data.category, image: a.data.image }));
    return items;
  });
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
