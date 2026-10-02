export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");

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
  eleventyConfig.addFilter("ohita", (arr, n) => arr.slice(n));

  // Newest first; drafts (draft: true) are excluded from listings and the build.
  eleventyConfig.addCollection("artikkelit", (api) =>
    api.getFilteredByGlob("src/artikkelit/*.md").filter((a) => !a.data.draft).sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addPreprocessor("drafts", "md", (data) => {
    if (data.draft && process.env.ELEVENTY_RUN_MODE === "build") return false;
  });

  return {
    dir: { input: "src", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
