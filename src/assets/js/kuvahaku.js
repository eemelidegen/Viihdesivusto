// Kuvahaku: search freely licensed photos for the writing and social-image tools.
// Sources: Wikipedia/Wikidata person → their Commons category, Openverse (Flickr, Commons ym.),
// Wikimedia Commons text search and Finna (Finnish museums and archives). Only licences that
// allow commercial use and editing are shown, and every pick comes with a ready credit line.
//
//   Kuvahaku.open({ actions: [{ label: "Käytä pääkuvana", run: async (photo) => { … } }] })
//
// photo = { title, author, license, source, page, credit, short, load() → Blob }
(() => {
  const UA = "HulinaKuvahaku/1.0 (https://hulina.net)";
  const PER = 20;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const strip = (html) => { const d = document.createElement("div"); d.innerHTML = String(html || ""); return d.textContent.replace(/\s+/g, " ").trim(); };
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
  const busyMsg = "Hakuja on tehty liikaa hetken sisällä. Odota minuutti.";

  async function getJSON(url, init) {
    const res = await fetch(url, init);
    if (res.status === 429) throw new Error(busyMsg);
    if (!res.ok) throw new Error("Haku ei onnistunut. Kokeile uudelleen.");
    return res.json();
  }
  const wmFetch = (params) => getJSON("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ action: "query", format: "json", origin: "*", ...params }), { headers: { "Api-User-Agent": UA } });

  // Commons serves fixed thumbnail sizes; ask for one instead of a huge original.
  function commonsThumb(url, width, want) {
    const m = String(url).match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(\w\/\w\w)\/([^/?#]+)/);
    if (!m || (width && width <= want) || /\.(svg|tiff?|pdf)$/i.test(m[2])) return url;
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${want}px-${m[2]}`;
  }
  const flickrSize = (url, s) => String(url).replace(/_[a-z]\.jpg$/, `_${s}.jpg`);
  // Same Commons file found through two sources → show it once.
  const fileKey = (url) => { const m = String(url).match(/upload\.wikimedia\.org\/.*\/(?:\d+px-)?([^/?#]+)$/); return m ? "wm:" + decodeURIComponent(m[1]).toLowerCase() : url; };

  function licenseLabel(code, version) {
    code = String(code || "").toLowerCase();
    if (code === "cc0") return "CC0";
    if (code === "pdm") return "Public domain";
    return `CC ${code.toUpperCase()}${version ? " " + version : ""}`;
  }

  function finish(p) {
    const author = cut(p.author || "Tuntematon tekijä", 70);
    const free = /^(CC0|Public domain)/i.test(p.license);
    p.author = author;
    p.key = fileKey(p.full);
    p.credit = cut(`${author} / ${p.source}${free ? "" : ", " + p.license}`, 120);
    p.short = cut(`${author} / ${free ? p.source : p.license}`, 52);
    p.load = async () => {
      let last;
      for (const url of [p.full, ...(p.fallback || [])]) {
        const res = await fetch("/api/toimitus/kuva?url=" + encodeURIComponent(url), { credentials: "same-origin" });
        if (res.status === 401) throw new Error("Kirjaudu ensin juttutyökaluun (/admin/kirjoita/), niin kuvan voi hakea.");
        if (res.ok) return res.blob();
        last = (await res.json().catch(() => ({}))).virhe;
      }
      throw new Error(last || "Kuvaa ei saatu haettua.");
    };
    return p;
  }

  // ---------- Openverse: Flickr (valtioneuvosto, EU-parlamentti, puolueet…), Commons ym. ----------
  async function openverse(q, page, extra = "") {
    const d = await getJSON(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license_type=commercial,modification&page_size=${PER}&page=${page}${extra}`);
    const items = (d.results || []).filter((r) => r.url && !/\.(svg|gif)$/i.test(r.url)).map((r) => {
      const wiki = r.provider === "wikimedia" || r.source === "wikimedia";
      const flickr = /staticflickr\.com/.test(r.url);
      return finish({
        title: strip(r.title) || "Nimetön kuva",
        author: strip(r.creator),
        license: licenseLabel(r.license, r.license_version),
        source: wiki ? "Wikimedia Commons" : flickr ? "Flickr" : strip(r.source_name || r.source || r.provider),
        page: r.foreign_landing_url || "",
        w: r.width, h: r.height,
        thumb: wiki ? commonsThumb(r.url, r.width, 330) : flickr ? flickrSize(r.url, "n") : r.thumbnail,
        full: wiki ? commonsThumb(r.url, r.width, 1280) : flickr ? flickrSize(r.url, "b") : r.url,
      });
    }).filter((p) => /^https:\/\/(upload\.wikimedia\.org|live\.staticflickr\.com|farm\d+\.staticflickr\.com)\//.test(p.full));
    return { items, more: page < (d.page_count || 1) };
  }

  // ---------- Wikimedia Commons ----------
  const OK_LICENSE = /^(cc0|public domain|pd\b|pdm|cc[- ]by(-sa)?([- ]\d|$)|attribution)/i;
  function commonsItems(pages) {
    return pages.map((p) => {
      const ii = p.imageinfo?.[0]; if (!ii || !/^image\/(jpeg|png|webp)/.test(ii.mime || "image/jpeg")) return null;
      const m = ii.extmetadata || {}, license = strip(m.LicenseShortName?.value);
      if (!OK_LICENSE.test(license) || /\b(nc|nd)\b/i.test(license)) return null;
      const full = ii.thumburl || ii.url;
      return finish({
        title: strip(m.ObjectName?.value) || p.title.replace(/^File:|\.\w+$/g, ""),
        author: strip(m.Artist?.value),
        license: /^public domain|^pd/i.test(license) ? "Public domain" : license,
        source: "Wikimedia Commons",
        page: ii.descriptionurl || "",
        w: ii.width, h: ii.height,
        thumb: /\/\d+px-/.test(full) ? full.replace(/\/\d+px-/, "/330px-") : commonsThumb(ii.url, ii.width, 330),
        full,
      });
    }).filter(Boolean);
  }
  const II = { prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280", iiextmetadatafilter: "Artist|LicenseShortName|ObjectName" };
  async function commonsSearch(search, page) {
    const d = await wmFetch({ generator: "search", gsrnamespace: "6", gsrsearch: search, gsrlimit: PER, gsroffset: (page - 1) * PER, ...II });
    const pages = Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index);
    return { items: commonsItems(pages), more: !!d.continue };
  }
  const phrase = (q) => (/\s/.test(q.trim()) && !/"/.test(q) ? `"${q.trim()}"` : q.trim());
  const commons = (q, page) => commonsSearch(phrase(q) + " filetype:bitmap", page);

  // ---------- Person: Wikidata finds the person, their Commons category holds the photos ----------
  const people = new Map();
  async function person(q) {
    if (people.has(q)) return people.get(q);
    const job = (async () => {
      const wd = (params) => getJSON("https://www.wikidata.org/w/api.php?" + new URLSearchParams({ format: "json", origin: "*", ...params }), { headers: { "Api-User-Agent": UA } });
      const found = await wd({ action: "wbsearchentities", search: q, language: "fi", uselang: "fi", type: "item", limit: "5" });
      const ids = (found.search || []).map((x) => x.id);
      if (!ids.length) return null;
      const ent = await wd({ action: "wbgetentities", ids: ids.join("|"), props: "claims|labels", languages: "fi|en" });
      for (const id of ids) {
        const c = ent.entities?.[id]?.claims || {};
        const val = (k) => (c[k] || []).map((x) => x.mainsnak?.datavalue?.value).filter(Boolean);
        const cat = val("P373")[0], img = val("P18");
        if (!cat && !img.length) continue;
        const name = ent.entities[id].labels?.fi?.value || ent.entities[id].labels?.en?.value || q;
        return { name, cat, img };
      }
      return null;
    })();
    people.set(q, job);
    job.catch(() => people.delete(q));
    return job;
  }
  async function wikiPerson(q, page) {
    const who = await person(q);
    if (!who) return { items: [], more: false };
    const tasks = [];
    if (page === 1 && who.img.length) tasks.push(wmFetch({ titles: who.img.slice(0, 5).map((f) => "File:" + f).join("|"), ...II }).then((d) => ({ items: commonsItems(Object.values(d.query?.pages || {})), more: false })).catch(() => ({ items: [], more: false })));
    // deepcat covers the person's category and its sub-categories (by year, portraits, events…)
    if (who.cat) {
      const cat = who.cat.replace(/"/g, "");
      tasks.push(commonsSearch(`filetype:bitmap deepcat:"${cat}"`, page).catch(() => commonsSearch(`filetype:bitmap incategory:"${cat}"`, page)));
    }
    const res = await Promise.all(tasks);
    return { items: res.flatMap((r) => r.items), more: res.some((r) => r.more), who: who.name };
  }

  // ---------- Finna: Finnish museums and archives (Museovirasto, kaupunginmuseot…) ----------
  async function finna(q, page) {
    const params = new URLSearchParams({ lookfor: phrase(q), type: "AllFields", limit: String(PER), page: String(page) });
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    ["~usage_rights_str_mv:\"usage_A\"", "~usage_rights_str_mv:\"usage_B\"", "format:\"0/Image/\""].forEach((f) => params.append("filter[]", f));
    ["id", "title", "year", "images", "imageRights", "nonPresenterAuthors", "buildings"].forEach((f) => params.append("field[]", f));
    const d = await getJSON("https://api.finna.fi/v1/search?" + params);
    const items = (d.records || []).map((r) => {
      const rights = String(r.imageRights?.copyright || "");
      if (!r.images?.length || /\b(nc|nd)\b/i.test(rights) || !/cc|public|pdm|vapaa/i.test(rights)) return null;
      const title = String(r.title || "").toLowerCase();
      if (!words.every((w) => title.includes(w.slice(0, Math.max(3, w.length - 2))))) return null;
      const img = "https://api.finna.fi" + r.images[0];
      const org = r.buildings?.[0]?.translated || "Finna";
      const who = (r.nonPresenterAuthors || []).map((a) => String(a.name || "").replace(/^([^,]+),\s*(.+)$/, "$2 $1")).filter(Boolean)[0];
      return finish({
        title: (r.title || "Nimetön kuva") + (r.year ? ` (${r.year})` : ""),
        author: who || org,
        license: /pdm|public/i.test(rights) ? "Public domain" : rights.replace(/^CC0.*/i, "CC0"),
        source: who ? org : "Finna",
        page: "https://www.finna.fi/Record/" + encodeURIComponent(r.id),
        thumb: img.replace(/size=\w+/, "size=medium"),
        preview: img.replace(/size=\w+/, "size=large"),
        full: img.replace(/size=\w+/, "size=master"),
        fallback: [img.replace(/size=\w+/, "size=large")],
      });
    }).filter(Boolean);
    return { items, more: page * PER < (d.resultCount || 0) };
  }

  // ---------- Illustration photos (CC0): StockSnap, WordPress Photo Directory, Nappy ----------
  // These collections are tagged in English, so common Finnish words are translated first.
  const FI_EN = {
    sormus: "ring", kihlasormus: "engagement ring", kihlat: "engagement ring", kihlaus: "engagement", häät: "wedding", hääpari: "wedding couple",
    hääpuku: "wedding dress", morsian: "bride", sulhanen: "groom", vihkisormus: "wedding ring", ero: "breakup", avioero: "divorce", riita: "argument",
    rakkaus: "love", pari: "couple", pariskunta: "couple", suudelma: "kiss", pusu: "kiss", treffit: "date", sydän: "heart", sydänsuru: "heartbreak",
    vauva: "baby", raskaus: "pregnancy", raskaana: "pregnant", lapsi: "child", lapset: "children", perhe: "family", koira: "dog", kissa: "cat",
    koti: "home", talo: "house", omakotitalo: "house", asunto: "apartment", muutto: "moving boxes", piha: "garden", joulu: "christmas", joulukuusi: "christmas tree",
    raha: "money", rahat: "money", setelit: "banknotes", velka: "debt", lasku: "bill", luksus: "luxury", auto: "car", urheiluauto: "sports car",
    juhlat: "party", synttärit: "birthday party", syntymäpäivä: "birthday", kakku: "cake", samppanja: "champagne", kuohuviini: "champagne", drinkki: "cocktail",
    gaala: "gala", "punainen matto": "red carpet", kamera: "camera", paparazzi: "paparazzi", mikrofoni: "microphone", lava: "stage", keikka: "concert",
    konsertti: "concert", laulaja: "singer", musiikki: "music", kitara: "guitar", tanssi: "dance", tanssija: "dancer", baletti: "ballet", tv: "television",
    televisio: "television", studio: "studio", podcast: "podcast", radio: "radio", kirja: "book", kirjat: "books", kirjamessut: "book fair",
    puhelin: "smartphone", some: "social media", somekohu: "social media", instagram: "social media", tiktok: "smartphone video", kommentit: "comments",
    nyrkkeily: "boxing", nyrkkeilijä: "boxer", kamppailu: "fighting", kuntosali: "gym", treeni: "workout", juoksu: "running", jalkapallo: "football",
    jääkiekko: "ice hockey", rakennustyömaa: "construction site", raksa: "construction worker", työmaa: "construction site", maatila: "farm", lehmä: "cow",
    traktori: "tractor", palju: "hot tub", sauna: "sauna", järvi: "lake", ranta: "beach", loma: "vacation", matka: "travel", lentokone: "airplane",
    ruoka: "food", kokki: "chef", ravintola: "restaurant", kahvi: "coffee", kahvila: "cafe", vaatteet: "clothes", muoti: "fashion", meikki: "makeup",
    hiukset: "hair", kampaamo: "hair salon", kauneus: "beauty", kirurgia: "cosmetic surgery", syöpä: "pink ribbon", "roosa nauha": "pink ribbon",
    politiikka: "politics", vaalit: "election", äänestys: "voting", eduskunta: "parliament", kokous: "meeting", sopimus: "contract", oikeus: "courthouse",
  };
  function toEnglish(q) {
    let t = " " + q.toLowerCase().trim() + " ";
    for (const [fi, en] of Object.entries(FI_EN).sort((a, b) => b[0].length - a[0].length)) t = t.replace(new RegExp(`(?<=\\s)${fi}(?=\\s)`, "g"), en);
    return t.trim();
  }
  const KUVITUS_NOTE = "Kuvituskuva: sopii jutun tunnelmakuvaksi, kun henkilöstä ei ole kuvaa. Kuvassa ei ole jutun henkilö, joten älä anna kuvatekstissä ymmärtää niin.";
  async function kuvitus(q, page) {
    const en = toEnglish(q);
    const [stock, wiki] = await Promise.allSettled([stockPhotos(en, page), commons(en, page)]);
    if (stock.status === "rejected" && wiki.status === "rejected") throw stock.reason;
    const a = stock.value || { items: [], more: false }, b = wiki.value || { items: [], more: false };
    b.items.forEach((p) => (p.note = KUVITUS_NOTE));
    return { items: [...a.items, ...b.items], more: a.more || b.more };
  }
  async function stockPhotos(en, page) {
    const d = await getJSON(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(en)}&source=stocksnap,wordpress,nappy&license_type=commercial,modification&page_size=${PER}&page=${page}`);
    const host = /^https:\/\/(cdn\.stocksnap\.io|images\.rawpixel\.com|pd\.w\.org|images\.nappy\.co)\//;
    const items = (d.results || []).filter((r) => host.test(r.url || "")).map((r) => finish({
      title: strip(r.title) || "Kuvituskuva",
      author: strip(r.creator) || strip(r.source_name || r.source),
      license: licenseLabel(r.license, r.license_version),
      source: ({ stocksnap: "StockSnap", rawpixel: "Rawpixel", wordpress: "WordPress Photo Directory", nappy: "Nappy" })[r.source] || strip(r.source),
      page: r.foreign_landing_url || "",
      w: r.width, h: r.height,
      thumb: r.url, full: r.url,
      note: KUVITUS_NOTE,
    }));
    return { items, more: page < (d.page_count || 1) };
  }

  const SOURCES = {
    all: { label: "Kaikki lähteet", parts: ["wiki", "wc", "finna"] },
    wiki: { label: "Henkilö (Wikipedia / Commons)", run: wikiPerson },
    ov: { label: "Flickr, Commons ym. (Openverse)", run: openverse },
    flickr: { label: "Vain Flickr", run: (q, page) => openverse(q, page, "&source=flickr") },
    wc: { label: "Wikimedia Commons -haku", run: commons },
    finna: { label: "Finna (museot ja arkistot)", run: finna },
    kuvitus: { label: "Kuvituskuvat (sormus, häät, raha…)", run: kuvitus },
    // NHL and other hockey: the player's own Commons category plus hockey-only Commons and Flickr searches.
    nhl: { label: "NHL ja jääkiekko", parts: ["wiki", "nhlc", "nhlf"] },
    nhlc: { hidden: true, run: (q, page) => commonsSearch(`${phrase(q)} hockey filetype:bitmap`, page) },
    nhlf: { hidden: true, run: (q, page) => openverse(`${q} hockey`, page, "&source=flickr") },
  };

  const SHORT = { all: "Kaikki", nhl: "NHL", wiki: "Henkilö", ov: "Openverse", flickr: "Flickr", wc: "Commons", finna: "Finna", kuvitus: "Kuvitus" };
  const NAME = { nhlc: "Commons", nhlf: "Flickr", wiki: "Wikipedia", ov: "Openverse", flickr: "Flickr", wc: "Commons", finna: "Finna", kuvitus: "Kuvitus" };
  const TIMEOUT = 12000, SLOW = { ov: 25000, flickr: 25000, kuvitus: 25000, nhlf: 25000 };
  const cache = new Map();
  // Each source page is fetched once per session; slow sources give up after TIMEOUT.
  function runSource(k, q, page) {
    const key = `${k}|${q.toLowerCase()}|${page}`;
    if (!cache.has(key)) {
      const job = Promise.race([SOURCES[k].run(q, page), new Promise((_, no) => setTimeout(() => no(new Error("ei vastannut ajoissa")), SLOW[k] || TIMEOUT))]);
      cache.set(key, job); job.catch(() => cache.delete(key));
    }
    return cache.get(key);
  }

  const CSS = `
  .kh{position:fixed;inset:0;z-index:1000;background:rgba(10,8,14,.6);display:grid;place-items:center;padding:16px;font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1a1720}
  .kh__box{background:#fff;border-radius:14px;width:min(1000px,100%);height:min(860px,calc(100vh - 32px));display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  .kh__head{padding:14px 16px 10px;border-bottom:1px solid #ece9f0;display:grid;gap:10px}
  .kh__top{display:flex;gap:8px;align-items:center}
  .kh__qwrap{flex:1;position:relative}
  .kh__q{width:100%;font:17px/1.3 inherit;padding:12px 40px 12px 14px;border:1.5px solid #d6d1dd;border-radius:10px;background:#faf9fb;outline:none;-webkit-appearance:none}
  .kh__q:focus{border-color:#1a1720;background:#fff}
  .kh__clr{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:none;font-size:20px;color:#8a8494;cursor:pointer;padding:6px 8px}
  .kh__x{border:0;background:#f2f0f5;border-radius:10px;font-size:22px;line-height:1;cursor:pointer;color:#4a4552;width:46px;height:46px;flex-shrink:0}
  .kh__chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .kh__chips::-webkit-scrollbar{display:none}
  .kh__chip{flex-shrink:0;border:1.5px solid #e1dde6;background:#fff;border-radius:999px;padding:7px 13px;font:600 14px/1 inherit;color:#4a4552;cursor:pointer;white-space:nowrap}
  .kh__chip[aria-pressed=true]{background:#1a1720;border-color:#1a1720;color:#fff}
  .kh__chip--recent{background:#f6f4f8;border-color:transparent;font-weight:500}
  .kh__status{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12.5px;color:#7b7584;min-height:17px}
  .kh__status b{font-weight:600;color:#4a4552}
  .kh__status .ok{color:#1d7a4a}.kh__status .err{color:#b0003a}
  .kh__body{overflow:auto;padding:12px 16px 20px;flex:1;-webkit-overflow-scrolling:touch}
  .kh__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
  .kh__item{position:relative;background:#f2f0f5;border-radius:10px;overflow:hidden}
  .kh__item img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#e7e4ea;cursor:zoom-in}
  .kh__cap{padding:6px 8px 7px;font-size:12px;line-height:1.3;color:#4a4552;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .kh__cap i{display:block;font-style:normal;font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#8a8494}
  .kh__use{position:absolute;right:6px;top:6px;border:0;border-radius:999px;padding:7px 12px;background:rgba(26,23,32,.88);color:#fff;font:700 13px/1 inherit;cursor:pointer}
  .kh__use:hover{background:#d93a72}
  .kh__sk{background:linear-gradient(90deg,#efedf2 0%,#f8f7fa 50%,#efedf2 100%);background-size:200% 100%;animation:khs 1.1s infinite linear;border-radius:10px;aspect-ratio:4/3.6}
  @keyframes khs{to{background-position:-200% 0}}
  .kh__msg{padding:34px 10px;text-align:center;color:#6b6575}
  .kh__msg b{display:block;color:#1a1720;font-size:16px;margin-bottom:6px}
  .kh__btn{border:0;border-radius:10px;padding:12px 18px;font-weight:700;font-size:15px;cursor:pointer;background:#1a1720;color:#fff}
  .kh__btn--ghost{background:#fff;color:#1a1720;border:1.5px solid #d6d1dd}
  .kh__btn:disabled{opacity:.5;cursor:wait}
  .kh__note{margin:0;font-size:13px;color:#6b6575}
  .kh__detail{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;align-items:start}
  .kh__detail img{width:100%;max-height:62vh;object-fit:contain;background:#111;border-radius:10px}
  .kh__meta{display:grid;gap:10px}
  .kh__meta h3{margin:0;font-size:17px;line-height:1.3}
  .kh__meta dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:14px}
  .kh__meta dt{color:#6b6575}.kh__meta dd{margin:0;overflow-wrap:anywhere}
  .kh__credit{background:#f2f0f5;border-radius:10px;padding:10px 12px;font-size:14px}
  .kh__credit b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b6575;margin-bottom:4px}
  .kh__acts{display:flex;gap:8px;flex-wrap:wrap}
  .kh__err{color:#b0003a;font-size:14px;margin:0}
  .kh__end{height:1px}
  .kh__busy{text-align:center;color:#8a8494;font-size:13px;padding:14px}
  @media (max-width:640px){.kh{padding:0}.kh__box{height:100%;max-height:none;border-radius:0}.kh__detail{grid-template-columns:1fr}.kh__detail img{max-height:46vh}.kh__grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kh__body{padding:10px 10px 24px}}`;

  let root, state, typing, io;
  const $ = (sel) => root.querySelector(sel);
  function recent() { try { return JSON.parse(localStorage.getItem("hulina-kuvahaku-recent") || "[]"); } catch { return []; } }
  function remember(q) { try { localStorage.setItem("hulina-kuvahaku-recent", JSON.stringify([q, ...recent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8))); } catch {} }

  function build() {
    const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
    root = document.createElement("div"); root.className = "kh"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Kuvahaku");
    root.innerHTML = `
      <div class="kh__box">
        <div class="kh__head">
          <form class="kh__top" data-kh="form">
            <div class="kh__qwrap"><input class="kh__q" type="text" enterkeyhint="search" autocomplete="off" placeholder="Hae nimellä tai aiheella, esim. Sanna Marin" aria-label="Hakusana"><button type="button" class="kh__clr" data-kh="clear" aria-label="Tyhjennä">×</button></div>
            <button type="button" class="kh__x" data-kh="close" aria-label="Sulje">×</button>
          </form>
          <div class="kh__chips" data-kh="src">${Object.keys(SOURCES).filter((k) => !SOURCES[k].hidden).map((k) => `<button type="button" class="kh__chip" data-src="${k}" aria-pressed="false">${SHORT[k]}</button>`).join("")}</div>
          <div class="kh__status" data-kh="status"></div>
        </div>
        <div class="kh__body" data-kh="body"></div>
      </div>`;
    document.body.append(root);
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); state.detail ? showGrid() : close(); } });
    $("[data-kh=form]").addEventListener("submit", (e) => { e.preventDefault(); clearTimeout(typing); search(true); $(".kh__q").blur(); });
    $(".kh__q").addEventListener("input", () => { clearTimeout(typing); const q = $(".kh__q").value.trim(); if (q.length >= 3) typing = setTimeout(() => search(true), 650); else if (!q) { Object.assign(state, { q: "", items: [], status: {} }); render(); } });
    io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting) && state.more && !state.busy && !state.detail) search(false); }, { root: $(".kh__body"), rootMargin: "600px" });
  }

  function search(fresh) {
    const q = $(".kh__q").value.trim(); if (!q) return;
    if (fresh && q === state.q && state.src === state.lastSrc && state.items.length) return;
    try { localStorage.setItem("hulina-kuvahaku", JSON.stringify({ q, src: state.src })); } catch {}
    if (fresh) { remember(q); Object.assign(state, { q, lastSrc: state.src, cursor: {}, items: [], seen: new Set(), more: false, detail: null, who: "", status: {}, run: (state.run || 0) + 1 }); }
    const run = state.run, parts = SOURCES[state.src].parts || [state.src];
    const live = parts.filter((k) => state.cursor[k] !== false);
    if (!live.length) return;
    state.busy = live.length; render();
    const lists = {};
    live.forEach((k) => {
      state.status[k] = "…";
      runSource(k, q, (state.cursor[k] || 0) + 1).then((r) => {
        if (run !== state.run) return;
        state.cursor[k] = r.more && r.items.length ? (state.cursor[k] || 0) + 1 : false;
        if (r.who) state.who = r.who;
        const fresh = r.items.filter((x) => !state.seen.has(x.key) && state.seen.add(x.key));
        lists[k] = fresh; state.items.push(...fresh);
        state.status[k] = state.cursor[k] === false && !fresh.length ? "0" : String((Number(state.status[k + "#"]) || 0) + fresh.length);
        state.status[k + "#"] = state.status[k];
      }).catch((e) => {
        if (run !== state.run) return;
        state.cursor[k] = false; state.status[k] = e.message === busyMsg ? "ruuhka" : "ei vastannut";
      }).finally(() => {
        if (run !== state.run) return;
        state.busy--; state.more = parts.some((k) => state.cursor[k] !== false);
        render();
      });
    });
  }

  function statusLine() {
    const parts = SOURCES[state.src].parts || [state.src];
    if (!state.q) return "";
    return (state.who ? `<span>Henkilö: <b>${esc(state.who)}</b></span>` : "") + parts.map((k) => {
      const v = state.status[k];
      if (v == null) return "";
      const cls = v === "…" ? "" : /^\d+$/.test(v) ? "ok" : "err";
      return `<span class="${cls}">${NAME[k]} ${v === "…" ? "…" : /^\d+$/.test(v) ? v : v}</span>`;
    }).join("");
  }

  function tiles(n) { return Array.from({ length: n }, () => '<div class="kh__sk"></div>').join(""); }
  function render() {
    root.querySelectorAll("[data-src]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.src === state.src)));
    $("[data-kh=status]").innerHTML = statusLine();
    if (state.detail) return;
    const b = $("[data-kh=body]");
    if (!state.q) {
      const r = recent();
      b.innerHTML = `<p class="kh__msg"><b>Hae kuvia nimellä tai aiheella</b>Julkkiksia ja poliitikkoja kannattaa hakea koko nimellä. Kuvituskuviin sopivat sanat kuten sormus, häät tai raha.</p>
        ${r.length ? `<p class="kh__note" style="margin:4px 0 8px">Viimeisimmät haut</p><div class="kh__chips" style="flex-wrap:wrap">${r.map((x) => `<button type="button" class="kh__chip kh__chip--recent" data-recent="${esc(x)}">${esc(x)}</button>`).join("")}</div>` : ""}`;
      return;
    }
    const single = state.actions.length === 1;
    const grid = state.items.map((p, i) => `
      <div class="kh__item">
        <img src="${esc(p.thumb)}" alt="${esc(p.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-kh-i="${i}" onerror="this.closest('.kh__item').remove()">
        ${single ? `<button type="button" class="kh__use" data-kh-quick="${i}">Käytä</button>` : ""}
        <div class="kh__cap"><i>${esc(p.source)}</i>${esc(p.author)} · ${esc(p.license)}</div>
      </div>`).join("");
    if (!state.items.length && state.busy) { b.innerHTML = `<div class="kh__grid">${tiles(8)}</div>`; return; }
    if (!state.items.length) { b.innerHTML = `<p class="kh__msg"><b>Ei vapaasti käytettäviä kuvia haulla ”${esc(state.q)}”</b>Kokeile toista lähdettä tai hakusanaa. Kohu- ja somejulkkiksista vapaita kuvia on harvoin, silloin sopii kuvituskuva.</p>`; return; }
    b.innerHTML = `<div class="kh__grid">${grid}${state.busy ? tiles(4) : ""}</div>${state.more || state.busy ? `<div class="kh__busy">${state.busy ? "Haetaan lisää…" : ""}</div>` : ""}<div class="kh__end" data-kh="end"></div>`;
    io.disconnect(); const end = $("[data-kh=end]"); if (end) io.observe(end);
  }

  function showDetail(p) {
    state.detail = p;
    $("[data-kh=body]").innerHTML = `
      <div class="kh__detail">
        <img src="${esc(p.preview || p.thumb.replace(/\/330px-/, "/960px-").replace(/_n\.jpg$/, "_c.jpg"))}" alt="" referrerpolicy="no-referrer" onerror="if(!this.dataset.f){this.dataset.f=1;this.src=${esc(JSON.stringify(p.thumb))}}">
        <div class="kh__meta">
          <h3>${esc(p.title)}</h3>
          <dl>
            <dt>Tekijä</dt><dd>${esc(p.author)}</dd>
            <dt>Lisenssi</dt><dd>${esc(p.license)}</dd>
            <dt>Lähde</dt><dd>${p.page ? `<a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.source)} ↗</a>` : esc(p.source)}</dd>
            ${p.w ? `<dt>Koko</dt><dd>${p.w} × ${p.h} px</dd>` : ""}
          </dl>
          <div class="kh__credit"><b>Kuvateksti</b>Kuva: ${esc(p.credit)}</div>
          <div class="kh__acts">${state.actions.map((a, i) => `<button type="button" class="kh__btn" data-kh-act="${i}">${esc(a.label)}</button>`).join("")}
            <button type="button" class="kh__btn kh__btn--ghost" data-kh="back">← Takaisin</button></div>
          <p class="kh__err" data-kh="err"></p>
          ${p.note ? `<p class="kh__note">${esc(p.note)}</p>` : ""}
          ${p.w && Math.max(p.w, p.h) < 900 ? `<p class="kh__note">Kuva on pieni (${p.w} px), joten se voi näyttää sumealta isona.</p>` : ""}
        </div>
      </div>`;
    $("[data-kh=body]").scrollTop = 0;
    root.querySelector("[data-kh-act]")?.focus();
  }
  function showGrid() { state.detail = null; render(); }

  async function use(p, action, btn, errEl) {
    btn.disabled = true; const old = btn.textContent; btn.textContent = "Haetaan…"; if (errEl) errEl.textContent = "";
    try { await action.run(p); close(); }
    catch (x) { btn.disabled = false; btn.textContent = old; if (errEl) errEl.textContent = x.message || "Kuvaa ei saatu käyttöön."; else alert(x.message || "Kuvaa ei saatu käyttöön."); }
  }

  async function onClick(e) {
    if (e.target === root) return close();
    const t = e.target.closest("[data-kh],[data-kh-i],[data-kh-act],[data-kh-quick],[data-src],[data-recent]"); if (!t) return;
    if (t.dataset.kh === "close") return close();
    if (t.dataset.kh === "clear") { $(".kh__q").value = ""; $(".kh__q").focus(); Object.assign(state, { q: "", items: [], status: {} }); return render(); }
    if (t.dataset.kh === "back") return showGrid();
    if (t.dataset.src) { state.src = t.dataset.src; state.lastSrc = null; return $(".kh__q").value.trim() ? search(true) : render(); }
    if (t.dataset.recent) { $(".kh__q").value = t.dataset.recent; return search(true); }
    if (t.dataset.khI) return showDetail(state.items[t.dataset.khI]);
    if (t.dataset.khQuick) return use(state.items[t.dataset.khQuick], state.actions[0], t);
    if (t.dataset.khAct) return use(state.detail, state.actions[t.dataset.khAct], t, $("[data-kh=err]"));
  }

  let lastFocus;
  function open({ actions, query } = {}) {
    if (!root) build();
    lastFocus = document.activeElement;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem("hulina-kuvahaku") || "{}"); } catch {}
    const keep = state && state.items.length && (!query || query === state.q);
    if (!keep) state = { q: "", src: SOURCES[saved.src] ? saved.src : "all", cursor: {}, items: [], seen: new Set(), more: false, detail: null, who: "", status: {}, run: 0, busy: 0 };
    state.actions = actions || []; state.detail = null;
    $(".kh__q").value = keep ? state.q : (query || "");
    root.hidden = false; document.documentElement.style.overflow = "hidden";
    render();
    if (!keep && query) search(true); else if (!keep) setTimeout(() => $(".kh__q").focus(), 50);
  }
  function close() { root.hidden = true; document.documentElement.style.overflow = ""; clearTimeout(typing); lastFocus?.focus?.(); }

  window.Kuvahaku = { open };
})();
