// Share images (Open Graph, 1200×630) generated at build time: one per article
// with its photo, category and headline, plus a default image for other pages.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const W = 1200, H = 630;
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

let fonts;
async function loadFonts() {
  fonts ??= await Promise.all([
    ["Anton", 400, "@fontsource/anton/files/anton-latin-400-normal.woff"],
    ["Barlow Condensed", 800, "@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff"],
    ["Barlow Condensed", 700, "@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff"],
  ].map(async ([name, weight, file]) => ({ name, weight, style: "normal", data: await readFile(require.resolve(file)) })));
  return fonts;
}

// Minimal element helper for satori (it takes React-like objects).
const h = (type, style, ...children) => ({ type, props: { style, children: children.flat().filter((c) => c !== null && c !== false) } });
const img = (src, style) => ({ type: "img", props: { src, width: W, height: H, style } });

const spotlight = "radial-gradient(circle at 30% 0%, #55525c 0%, #1c1b21 50%, #000 100%)";

// The lit wordmark: bright on the left, fading to grey, like the site logo.
// Each letter gets a step of the white-to-grey fade.
const FADE = ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#f4f3f6", "#e2e0e6", "#cfcdd4", "#bcb9c2", "#aaa7b0"];
const wordmark = (size) => h("div", { display: "flex", fontFamily: "Anton", fontSize: size, letterSpacing: size * 0.02, lineHeight: 1 },
  [..."VALOKEILA"].map((ch, i) => h("span", { color: FADE[i] }, ch)));

function titleSize(title) {
  const n = title.length;
  return n <= 45 ? 78 : n <= 75 ? 64 : n <= 110 ? 54 : 46;
}

async function photo(srcDir, image) {
  if (!image) return null;
  const ext = path.extname(image).toLowerCase();
  if (!MIME[ext]) return null;               // e.g. WebP/HEIC: fall back to the plain design
  try {
    const data = await readFile(path.join(srcDir, image.replace(/^\//, "")));
    return `data:${MIME[ext]};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

function articleTree({ title, category, photoSrc }) {
  const text = title.length > 140 ? `${title.slice(0, 137).trimEnd()}…` : title;
  return h("div", { width: W, height: H, display: "flex", position: "relative", backgroundColor: "#000", ...(photoSrc ? {} : { backgroundImage: spotlight }) },
    photoSrc ? img(photoSrc, { position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }) : null,
    h("div", { position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
      backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.78) 62%, rgba(0,0,0,0.96) 100%)" }),
    h("div", { position: "absolute", top: 40, left: 64, display: "flex" }, wordmark(54)),
    h("div", { position: "absolute", left: 64, right: 64, bottom: 54, display: "flex", flexDirection: "column", alignItems: "flex-start" },
      category ? h("div", { display: "flex", backgroundColor: "#ff3d57", color: "#fff", fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 30,
        textTransform: "uppercase", letterSpacing: 1, padding: "6px 16px 4px", borderRadius: 6, marginBottom: 18 }, category) : null,
      h("div", { display: "flex", color: "#fff", fontFamily: "Anton", fontSize: titleSize(text), lineHeight: 1.1, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }, text)));
}

function defaultTree(tagline) {
  return h("div", { width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#000", backgroundImage: spotlight },
    wordmark(190),
    h("div", { display: "flex", marginTop: 26, color: "#c9c6cf", fontFamily: "Barlow Condensed", fontWeight: 700, fontSize: 44, textTransform: "uppercase", letterSpacing: 3 }, tagline));
}

async function png(tree) {
  const svg = await satori(tree, { width: W, height: H, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

export async function renderOgImages({ outDir, srcDir, site, articles }) {
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "default.png"), await png(defaultTree(site.tagline)));
  const names = Object.fromEntries(site.categories.map((c) => [c.slug, c.name]));
  for (const a of articles) {
    const tree = articleTree({ title: a.title, category: names[a.category] || "", photoSrc: await photo(srcDir, a.image) });
    await writeFile(path.join(outDir, `${a.slug}.png`), await png(tree));
  }
}
