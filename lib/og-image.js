// Share images (Open Graph, 1200×630) generated at build time: one per article
// with its photo, category and headline in the Hulina style, plus a default image for other pages.
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
    ["League Spartan", 800, "@fontsource/league-spartan/files/league-spartan-latin-800-normal.woff"],
    ["League Spartan", 700, "@fontsource/league-spartan/files/league-spartan-latin-700-normal.woff"],
    ["Shrikhand", 400, "@fontsource/shrikhand/files/shrikhand-latin-400-normal.woff"],
  ].map(async ([name, weight, file]) => ({ name, weight, style: "normal", data: await readFile(require.resolve(file)) })));
  return fonts;
}

// Minimal element helper for satori (it takes React-like objects).
const h = (type, style, ...children) => ({ type, props: { style, children: children.flat().filter((c) => c !== null && c !== false) } });
const img = (src, style, width = W, height = H) => ({ type: "img", props: { src, width, height, style } });

const PLUM = "#2A1A4A", PINK = "#FF8FB1";
const glow = `radial-gradient(circle at 82% 12%, rgba(255,143,177,0.55) 0%, rgba(255,143,177,0) 42%), linear-gradient(135deg, #3b2766 0%, ${PLUM} 70%)`;

// The pink logo (speech bubble + wordmark), read from the site's own SVG file.
const LOGO_RATIO = 787.4 / 224;
let logoSrc;
async function loadLogo(srcDir) {
  logoSrc ??= `data:image/svg+xml;base64,${(await readFile(path.join(srcDir, "assets/img/hulina-logo-pinkki.svg"))).toString("base64")}`;
  return logoSrc;
}
const logo = (height) => img(logoSrc, { width: Math.round(height * LOGO_RATIO), height }, Math.round(height * LOGO_RATIO), height);

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
  return h("div", { width: W, height: H, display: "flex", position: "relative", backgroundColor: PLUM, ...(photoSrc ? {} : { backgroundImage: glow }) },
    photoSrc ? img(photoSrc, { position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }) : null,
    h("div", { position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
      backgroundImage: "linear-gradient(to bottom, rgba(42,26,74,0.45) 0%, rgba(42,26,74,0) 24%, rgba(42,26,74,0) 32%, rgba(42,26,74,0.82) 64%, rgba(42,26,74,0.97) 100%)" }),
    h("div", { position: "absolute", top: 36, left: 56, display: "flex" }, logo(78)),
    h("div", { position: "absolute", left: 64, right: 64, bottom: 54, display: "flex", flexDirection: "column", alignItems: "flex-start" },
      category ? h("div", { display: "flex", backgroundColor: PINK, color: PLUM, fontFamily: "League Spartan", fontWeight: 800, fontSize: 26,
        textTransform: "uppercase", letterSpacing: 1.5, padding: "10px 20px 6px", borderRadius: 999, marginBottom: 20 }, category) : null,
      h("div", { display: "flex", color: "#fff", fontFamily: "League Spartan", fontWeight: 800, fontSize: titleSize(text), lineHeight: 1.08, letterSpacing: -1, textShadow: "0 2px 12px rgba(0,0,0,0.4)" }, text)));
}

function defaultTree(tagline) {
  return h("div", { width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: PLUM, backgroundImage: glow },
    logo(210),
    h("div", { display: "flex", marginTop: 34, color: "#fff", fontFamily: "League Spartan", fontWeight: 700, fontSize: 40, textTransform: "uppercase", letterSpacing: 3 }, tagline));
}

async function png(tree) {
  const svg = await satori(tree, { width: W, height: H, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
}

export async function renderOgImages({ outDir, srcDir, site, articles }) {
  await mkdir(outDir, { recursive: true });
  await loadLogo(srcDir);
  await writeFile(path.join(outDir, "default.png"), await png(defaultTree(site.tagline)));
  const names = Object.fromEntries(site.categories.map((c) => [c.slug, c.name]));
  for (const a of articles) {
    const base = { title: a.title, category: names[a.category] || "" };
    let image;
    try {
      image = await png(articleTree({ ...base, photoSrc: await photo(srcDir, a.image) }));
    } catch (e) {
      // A broken or unusual photo must not stop the whole site from building.
      console.warn(`[og] ${a.slug}: kuvaa ei voitu käyttää (${e.message}), käytetään taustaa`);
      image = await png(articleTree(base));
    }
    await writeFile(path.join(outDir, `${a.slug}.png`), image);
  }
}
