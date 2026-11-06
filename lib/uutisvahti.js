// Uutisvahti: collects today's headlines from Finnish news and entertainment media,
// sorts them into topics and groups the same story told by several outlets.
// Only headlines, links and the short teaser each outlet publishes in its own feed are used.

// type: "rss" (RSS/Atom feed) or "html" (front page links, for outlets without a feed).
// ryhma: "viihde" outlets are shown in full; "uutiset" outlets only when a story hits a topic.
export const LAHTEET = [
  // Viihde, kohut ja julkkikset
  { id: "is-viihde", nimi: "Ilta-Sanomat Viihde", url: "https://www.is.fi/rss/viihde.xml", ryhma: "viihde" },
  { id: "il-viihde", nimi: "Iltalehti Viihde", url: "https://www.iltalehti.fi/rss/viihde.xml", ryhma: "viihde" },
  { id: "mtv-viihde", nimi: "MTV Uutiset Viihde", url: "https://www.mtvuutiset.fi/api/feed/rss/viihde_uusimmat", ryhma: "viihde" },
  { id: "seiska", nimi: "Seiska", url: "https://www.seiska.fi/", type: "html", ryhma: "viihde" },
  { id: "como", nimi: "Como", url: "https://www.como.fi/feed/", ryhma: "viihde" },
  { id: "voice", nimi: "Voice", url: "https://www.voice.fi/feed", ryhma: "viihde" },
  { id: "gekkonen", nimi: "Gekkonen", url: "https://gekkonen.net/feed/", ryhma: "viihde" },
  { id: "uuno", nimi: "Uuno", url: "https://www.uuno.fi/feed/", ryhma: "viihde" },
  { id: "hymy", nimi: "Hymy", url: "https://hymy.fi/feed/", ryhma: "viihde" },
  { id: "seura", nimi: "Seura", url: "https://seura.fi/feed/", ryhma: "viihde" },
  { id: "anna", nimi: "Anna", url: "https://anna.fi/feed", ryhma: "viihde" },
  { id: "kaksplus", nimi: "Kaksplus", url: "https://kaksplus.fi/feed/", ryhma: "viihde" },
  { id: "hs-nyt", nimi: "HS Nyt", url: "https://www.hs.fi/rss/nyt.xml", ryhma: "viihde" },
  { id: "hs-kulttuuri", nimi: "HS Kulttuuri", url: "https://www.hs.fi/rss/kulttuuri.xml", ryhma: "viihde" },
  { id: "tubetus", nimi: "Tubetus", url: "https://tubetus.fi/feed/", ryhma: "viihde" },
  { id: "episodi", nimi: "Episodi", url: "https://www.episodi.fi/feed/", ryhma: "viihde" },
  { id: "viihdeposti", nimi: "Viihdeposti", url: "https://viihdeposti.fi/feed/", ryhma: "viihde" },
  { id: "newsner", nimi: "Newsner", url: "https://www.newsner.fi/feed/", ryhma: "viihde" },
  { id: "partyclub", nimi: "PartyClub", url: "https://partyclub.fi/feed/", ryhma: "viihde" },
  { id: "sinivalko", nimi: "Sinivalko", url: "https://www.sinivalko.fi/feed/", ryhma: "viihde" },
  { id: "city", nimi: "City", url: "https://www.city.fi/feed/", ryhma: "viihde" },
  { id: "rumba", nimi: "Rumba", url: "https://www.rumba.fi/feed/", ryhma: "viihde" },
  { id: "soundi", nimi: "Soundi", url: "https://www.soundi.fi/feed/", ryhma: "viihde" },
  { id: "muropaketti", nimi: "Muropaketti", url: "https://muropaketti.com/feed/", ryhma: "viihde" },
  // Uutismediat
  { id: "yle", nimi: "Yle", url: "https://yle.fi/rss/uutiset/tuoreimmat", ryhma: "uutiset" },
  { id: "is", nimi: "Ilta-Sanomat", url: "https://www.is.fi/rss/tuoreimmat.xml", ryhma: "uutiset" },
  { id: "il", nimi: "Iltalehti", url: "https://www.iltalehti.fi/rss/uutiset.xml", ryhma: "uutiset" },
  { id: "il-kotimaa", nimi: "Iltalehti Kotimaa", url: "https://www.iltalehti.fi/rss/kotimaa.xml", ryhma: "uutiset" },
  { id: "hs", nimi: "Helsingin Sanomat", url: "https://www.hs.fi/rss/tuoreimmat.xml", ryhma: "uutiset" },
  { id: "mtv", nimi: "MTV Uutiset", url: "https://www.mtvuutiset.fi/api/feed/rss/uutiset_uusimmat", ryhma: "uutiset" },
  { id: "aamulehti", nimi: "Aamulehti", url: "https://www.aamulehti.fi/rss/tuoreimmat.xml", ryhma: "uutiset" },
  { id: "satakunnankansa", nimi: "Satakunnan Kansa", url: "https://www.satakunnankansa.fi/rss/tuoreimmat.xml", ryhma: "uutiset" },
  { id: "savonsanomat", nimi: "Savon Sanomat", url: "https://www.savonsanomat.fi/feed/rss/", ryhma: "uutiset" },
  { id: "ksml", nimi: "Keskisuomalainen", url: "https://www.ksml.fi/feed/rss/", ryhma: "uutiset" },
  { id: "demokraatti", nimi: "Demokraatti", url: "https://wp.demokraatti.fi/feed/", ryhma: "uutiset" },
  { id: "verkkouutiset", nimi: "Verkkouutiset", url: "https://www.verkkouutiset.fi/feed/", ryhma: "uutiset" },
];

// Topics, in priority order: a story goes to the first topic it matches (TV shows first, so a
// YouTuber dancing in TTK is a TTK story).
export const AIHEET = [
  { id: "tositv", nimi: "Tosi-tv", paino: 2, sanat: [
    "tanssii tähtien", "ttk", "maajussi", "love island", "temptation", "big brother", "bachelor", "amazing race", "selviytyjät", "farmi", "vain elämää",
    "ensitreffit", "kolmiodraama", "salkkari", "salatut elämät", "putous", "idols", "the voice", "uuden musiikin kilpailu", "umk", "euroviisu", "tähdet, tähdet",
    "tosi-tv", "realit", "huvila & huussi", "docventures", "100 päivää"] },
  { id: "striimaajat", nimi: "Striimaajat ja some", paino: 3, sanat: [
    "rappiostriim", "striimaa", "striimi", "striimaaja", "kick-", " kick ", "kickissä", "twitch", "pottukoira", "iippadaa", "pullis", "upi pulkkinen", "laitela",
    "jethro", "ruusutossu", "ainasoja", "bämät", "slaybabyangel", "tubettaja", "youtubett", "tiktok-", "tiktokissa", "somevaikuttaja", "onlyfans",
    "chiara eklund", "megarokkistara", "kenukendall", "monnirs", "kieksi", "temppuhemppu", "stagala", "kotkamies", "rappio"] },
  { id: "kohut", nimi: "Kohut ja riidat", paino: 2, sanat: [
    "kohu", "raivo", "riita", "riidan", "kiista", "suuttu", "tyrmisty", "potkut", "erosi", "eroavat", "ero ", "erohuh", "petti", "pettä", "haukku", "somemyrsky", "someraivo",
    "skandaal", "paljastus", "oikeude", "käräjä", "syyte", "tuomi", "rikosilmoit", "pahoinpitel", "pidätet", "vangit", "poliisi", "kännissä", "humala", "kiroil",
    "loukkaantu", "anteeksi", "kritiikki", "arvostel", "vihaviest", "uhkaus", "kärähti", "kuohuu", "järkyt"] },
  { id: "julkkikset", nimi: "Julkkikset", paino: 1, sanat: [
    "julkkis", "laulaja", "näyttelijä", "räppäri", "artisti", "juontaja", "muusikko", "tähti", "malli", "missi", "prinsessa", "prinssi", "kuningas", "kuningatar",
    "rakas", "rakkaus", "kihlo", "häät", "vauva", "raskaus", "odottaa", "seurustel", "lemm", "sinkku", "elämäkerta", "konsertti", "keikka", "kiertue", "comeback", "paluu"] },
];

const STOP = new Set(("ja tai on oli ovat olla ei se ne hän he me te sen sitä siitä joka jotka kun kuin jos niin myös vain nyt jo vielä mutta että sekä kanssa " +
  "yli alle kohti mukaan jälkeen ennen aikana tänään eilen huomenna viime uusi uuden uudet näin tämä tämän tässä tästä tuo nämä kaikki kaikkea mikä mitä miksi " +
  "miten kuka ketä missä mistä mihin paljon sanoo kertoo kertoi sanoi video kuvat kuva katso lue lisää – - vuotta vuoden vuotias").split(" "));

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
export function decode(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
const strip = (s) => decode(decode(s)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
};

// Daily quizzes, crosswords, horoscopes and the like are not news.
const ROSKA = /ratkaise päivän|päivän \d+ kysymys|^visa\b|tietovisa|ristikko|horoskoop|sudoku|päivän sää|tv-opas|tänään tv:ssä:? (?!.*(?:kohu|tubettaja|striim))/i;

export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const raw of blocks.slice(0, 60)) {
    const b = raw.replace(/<content:encoded>[\s\S]*?<\/content:encoded>/i, "");
    const otsikko = strip(tag(b, "title")).replace(/^[^|]{2,40}\s\|\s/, ""); // "Tulipalot | Otsikko" -> "Otsikko"
    let linkki = strip(tag(b, "link"));
    if (!linkki) { const m = b.match(/<link[^>]*href="([^"]+)"/i); linkki = m ? decode(m[1]) : ""; }
    if (!linkki) linkki = strip(tag(b, "guid"));
    const d = strip(tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "published") || tag(b, "updated"));
    const t = d ? Date.parse(d) : NaN;
    const kuvaus = strip(tag(b, "description") || tag(b, "summary")).replace(/\s*The post .* (?:first )?appeared (?:first )?on .*$/i, "").slice(0, 280);
    if (ROSKA.test(otsikko)) continue;
    if (otsikko && /^https?:\/\//.test(linkki)) items.push({ otsikko, linkki, aika: Number.isFinite(t) ? t : null, kuvaus });
  }
  return items;
}

// "10:16" today, or "5.11." with a time, as Finnish local time.
function suomenAika(pv, kk, hh, mm) {
  const now = new Date();
  const fi = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Helsinki" }));
  const offset = fi.getTime() - new Date(now.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const y = fi.getFullYear(), mo = kk ? +kk - 1 : fi.getMonth(), d = pv ? +pv : fi.getDate();
  const t = Date.UTC(y, mo, d, +hh, +mm) - offset;
  return t > Date.now() + 3600e3 ? t - 365 * 864e5 : t;
}

// Seiska has no feed: take article links from the front page. The headline comes from the link text,
// or from the address when the link has no plain text.
export function parseSeiska(html, base = "https://www.seiska.fi") {
  const items = [], seen = new Set();
  const href = /^<a[^>]*?href="(\/(?:kotimaa|katso|ulkomaat|kuninkaalliset|vain-seiskassa|urheilu|viihde)\/([a-z0-9-]+)\/(\d+))"/i;
  // Split on anchors instead of one big regex: much less CPU on a 200 kB page.
  for (const chunk of html.split("<a ").slice(1)) {
    const m = ("<a " + chunk.slice(0, 400)).match(href);
    if (!m) continue;
    const linkki = base + m[1];
    if (seen.has(linkki)) continue;
    const start = chunk.indexOf(">") + 1, end = chunk.indexOf("</a>");
    let otsikko = strip(end > start ? chunk.slice(start, Math.min(end, start + 12000)) : ""), aika = null, kuvaus = "";
    // Link text reads "Kicker kotimaa 10:16 Headline! Teaser." or "… vain seiskassa 5.11. 16:00 …".
    const p = otsikko.match(/^(.*?)\s*(?:kotimaa|katso|ulkomaat|kuninkaalliset|vain seiskassa|urheilu|viihde)\s+(?:(\d{1,2})\.(\d{1,2})\.\s+)?(\d{1,2}):(\d{2})\s+(.*)$/i);
    if (p) {
      const [, kicker, pv, kk, hh, mm, rest] = p;
      const lause = (rest.match(/^.{8,}?[!?.](?=\s|$)/) || [rest])[0].trim();
      kuvaus = rest.slice(lause.length).trim().slice(0, 280);
      otsikko = kicker && kicker.length <= 40 && !lause.toLowerCase().includes(kicker.toLowerCase()) ? `${kicker}: ${lause}` : lause;
      aika = suomenAika(pv, kk, hh, mm);
    }
    if (otsikko.length < 12) otsikko = m[2].replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
    seen.add(linkki);
    items.push({ otsikko, linkki, aika, kuvaus });
  }
  return items;
}

export function aihe(text) {
  const t = " " + text.toLowerCase() + " ";
  for (const a of AIHEET) if (a.sanat.some((w) => t.includes(w))) return a.id;
  return "muut";
}
// The headline decides; the teaser only when the headline alone says nothing.
const aiheJutulle = (items) => {
  const otsikot = aihe(items.map((x) => x.otsikko).join(" | "));
  return otsikot !== "muut" ? otsikot : aihe(items.map((x) => x.kuvaus).join(" | "));
};
// Plain news (accidents, politics) is shown only when it has an entertainment or celebrity angle.
const VIIHDEKULMA = /julkkis|tähti|laulaja|näyttelijä|räppäri|artisti|juontaja|muusikko|tubettaja|striim|kick|tosi-tv|ttk|tanssii tähtien|euroviisu|missi|prinsessa|prinssi|kuninga|onlyfans|somevaikuttaja/i;

// Words that identify a story: proper names count double.
export function avainsanat(otsikko) {
  const words = otsikko.replace(/[”“"'’«»()[\]:;!?.,|]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set();
  words.forEach((w, i) => {
    const base = w.toLowerCase().replace(/^[-–]+|[-–]+$/g, "").replace(/(n|a|ä|lle|lta|ltä|ssa|ssä|sta|stä|lla|llä|ksi|en|in)$/u, "");
    if (base.length < 4 || STOP.has(w.toLowerCase()) || /^\d+$/.test(base)) return;
    out.add((i > 0 && /^\p{Lu}/u.test(w) ? "N:" : "") + base);
  });
  return out;
}

function samaJuttu(a, b) {
  let names = 0, all = 0;
  for (const k of a) if (b.has(k)) { all++; if (k.startsWith("N:")) names++; }
  const jaccard = all / (a.size + b.size - all || 1);
  return names >= 2 || (names >= 1 && all >= 3) || jaccard >= 0.45;
}

// Group items into stories, score them and return the strongest first.
export function kokoa(items, { nyt = Date.now(), tunnit = 48 } = {}) {
  const raja = nyt - tunnit * 3600e3;
  const fresh = items.filter((x) => x.aika === null || (x.aika >= raja && x.aika <= nyt + 3600e3));
  fresh.sort((a, b) => (b.aika || nyt) - (a.aika || nyt));
  const groups = [];
  for (const it of fresh) {
    it.avain = avainsanat(it.otsikko);
    const g = groups.find((g) => g.items.some((o) => samaJuttu(o.avain, it.avain)));
    if (g) { if (!g.items.some((o) => o.linkki === it.linkki)) g.items.push(it); }
    else groups.push({ items: [it] });
  }
  const out = [];
  for (const g of groups) {
    const lahteet = [...new Set(g.items.map((x) => x.lahde))];
    const a = aiheJutulle(g.items);
    const viihde = g.items.some((x) => x.ryhma === "viihde");
    if (!viihde && !(a === "striimaajat" || a === "tositv" || VIIHDEKULMA.test(g.items.map((x) => x.otsikko).join(" ")))) continue;
    const uusin = Math.max(...g.items.map((x) => x.aika || 0)) || null;
    const ika = uusin ? (nyt - uusin) / 3600e3 : 6;
    const paino = (AIHEET.find((x) => x.id === a) || { paino: 0 }).paino;
    const pisteet = lahteet.length * 3 + paino * 2 + (ika < 3 ? 3 : ika < 8 ? 2 : ika < 24 ? 1 : 0);
    const paa = g.items.find((x) => x.ryhma === "viihde") || g.items[0];
    out.push({
      otsikko: paa.otsikko, kuvaus: paa.kuvaus, aihe: a, uusin, pisteet, lahteita: lahteet.length,
      jutut: g.items.map(({ otsikko, linkki, lahde, aika }) => ({ otsikko, linkki, lahde, aika })),
      avain: [...paa.avain].filter((k) => k.startsWith("N:")).map((k) => k.slice(2)),
    });
  }
  out.sort((a, b) => b.pisteet - a.pisteet || (b.uusin || 0) - (a.uusin || 0));
  return out;
}

export async function haeLahde(l, signal) {
  const res = await fetch(l.url, {
    signal, redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; HulinaUutisvahti/1.0; +https://hulina.net)", Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const items = l.type === "html" ? parseSeiska(text) : parseFeed(text);
  return items.slice(0, 60).map((x) => ({ ...x, lahde: l.nimi, ryhma: l.ryhma }));
}
