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
  const commons = (q, page) => commonsSearch(q + " filetype:bitmap", page);

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
        let cats = [];
        if (cat) {
          // Photos are often sorted into sub-categories ("Sanna Marin in 2022"); include one level.
          const sub = await wmFetch({ list: "categorymembers", cmtitle: "Category:" + cat, cmtype: "subcat", cmlimit: "40" }).catch(() => ({}));
          cats = [cat, ...(sub.query?.categorymembers || []).map((x) => x.title.replace(/^Category:/, ""))
            .filter((t) => !/\b(signatures?|logos?|maps?|graves?|videos?|audio|drawings?|caricatures?)\b/i.test(t))].slice(0, 25);
        }
        const name = ent.entities[id].labels?.fi?.value || ent.entities[id].labels?.en?.value || q;
        return { name, cats, img };
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
    if (page === 1 && who.img.length) tasks.push(wmFetch({ titles: who.img.slice(0, 5).map((f) => "File:" + f).join("|"), ...II }).then((d) => ({ items: commonsItems(Object.values(d.query?.pages || {})), more: false })));
    if (who.cats.length) tasks.push(commonsSearch("filetype:bitmap incategory:" + who.cats.map((c) => c.replace(/[\s"]+/g, "_")).join("|"), page));
    const res = await Promise.all(tasks);
    return { items: res.flatMap((r) => r.items), more: res.some((r) => r.more), who: who.name };
  }

  // ---------- Finna: Finnish museums and archives (Museovirasto, kaupunginmuseot…) ----------
  async function finna(q, page) {
    const params = new URLSearchParams({ lookfor: q, type: "AllFields", limit: String(PER), page: String(page) });
    ["~usage_rights_str_mv:\"usage_A\"", "~usage_rights_str_mv:\"usage_B\"", "format:\"0/Image/\""].forEach((f) => params.append("filter[]", f));
    ["id", "title", "year", "images", "imageRights", "nonPresenterAuthors", "buildings"].forEach((f) => params.append("field[]", f));
    const d = await getJSON("https://api.finna.fi/v1/search?" + params);
    const items = (d.records || []).map((r) => {
      const rights = String(r.imageRights?.copyright || "");
      if (!r.images?.length || /\b(nc|nd)\b/i.test(rights) || !/cc|public|pdm|vapaa/i.test(rights)) return null;
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
    all: { label: "Kaikki lähteet", parts: ["wiki", "ov", "finna"] },
    wiki: { label: "Henkilö (Wikipedia / Commons)", run: wikiPerson },
    ov: { label: "Flickr, Commons ym. (Openverse)", run: openverse },
    flickr: { label: "Vain Flickr", run: (q, page) => openverse(q, page, "&source=flickr") },
    wc: { label: "Wikimedia Commons -haku", run: commons },
    finna: { label: "Finna (museot ja arkistot)", run: finna },
    kuvitus: { label: "Kuvituskuvat (sormus, häät, raha…)", run: kuvitus },
  };

  // One "page" of a source mix: every source that still has more, results interleaved.
  async function fetchPage(src, q, cursor) {
    const parts = SOURCES[src].parts || [src];
    const live = parts.filter((k) => cursor[k] !== false);
    const res = await Promise.allSettled(live.map((k) => SOURCES[k].run(q, (cursor[k] || 0) + 1)));
    const lists = [], errors = [];
    let who = "";
    res.forEach((r, i) => {
      const k = live[i];
      if (r.status === "rejected") { errors.push(r.reason?.message || "Haku ei onnistunut."); return; }
      cursor[k] = r.value.more && r.value.items.length ? (cursor[k] || 0) + 1 : false;
      if (r.value.who) who = r.value.who;
      lists.push(r.value.items);
    });
    const items = [];
    for (let i = 0; lists.some((l) => i < l.length); i++) lists.forEach((l) => l[i] && items.push(l[i]));
    if (!lists.length && errors.length) throw new Error(errors[0]);
    return { items, more: live.some((k) => cursor[k] !== false), who, error: errors.length ? (errors.includes(busyMsg) ? "Osa lähteistä ei vastannut juuri nyt. " + busyMsg : "Osa lähteistä ei vastannut.") : "" };
  }

  const CSS = `
  .kh{position:fixed;inset:0;z-index:1000;background:rgba(10,8,14,.6);display:grid;place-items:center;padding:16px;font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1a1720}
  .kh__box{background:#fff;border-radius:12px;width:min(980px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  .kh__head{padding:16px 18px 12px;border-bottom:1px solid #e6e3ea;display:grid;gap:10px}
  .kh__row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .kh__title{margin:0;font-weight:800;font-size:18px;flex:1}
  .kh__x{border:0;background:none;font-size:26px;line-height:1;cursor:pointer;color:#6b6575;padding:4px 8px}
  .kh__q{flex:1 1 220px;font:16px/1.4 inherit;padding:10px 12px;border:1px solid #cfcad6;border-radius:8px;min-width:0}
  .kh select{font:15px inherit;padding:9px 8px;border:1px solid #cfcad6;border-radius:8px;background:#fff}
  .kh__btn{border:0;border-radius:8px;padding:10px 16px;font-weight:700;font-size:15px;cursor:pointer;background:#1a1720;color:#fff}
  .kh__btn--ghost{background:#fff;color:#1a1720;border:1px solid #cfcad6}
  .kh__btn:disabled{opacity:.5;cursor:wait}
  .kh__note{margin:0;font-size:13px;color:#6b6575}
  .kh__body{overflow:auto;padding:14px 18px 18px;flex:1}
  .kh__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
  .kh__item{border:0;padding:0;background:#f2f0f5;border-radius:8px;overflow:hidden;cursor:pointer;text-align:left;display:flex;flex-direction:column;color:inherit;font:inherit}
  .kh__item img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#ddd}
  .kh__item span{padding:6px 8px;font-size:12px;line-height:1.3;color:#4a4552;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .kh__item i{display:block;font-style:normal;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#8a8494;overflow:hidden;text-overflow:ellipsis}
  .kh__who{margin:0 0 10px}
  .kh__item:hover,.kh__item:focus-visible{outline:3px solid #ff5fa2;outline-offset:-3px}
  .kh__msg{padding:30px 10px;text-align:center;color:#6b6575}
  .kh__more{display:flex;justify-content:center;margin-top:14px}
  .kh__detail{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;align-items:start}
  .kh__detail img{width:100%;max-height:60vh;object-fit:contain;background:#111;border-radius:8px}
  .kh__meta{display:grid;gap:10px}
  .kh__meta h3{margin:0;font-size:17px;line-height:1.3}
  .kh__meta dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:14px}
  .kh__meta dt{color:#6b6575}
  .kh__meta dd{margin:0;overflow-wrap:anywhere}
  .kh__credit{background:#f2f0f5;border-radius:8px;padding:10px 12px;font-size:14px}
  .kh__credit b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b6575;margin-bottom:4px}
  .kh__acts{display:flex;gap:8px;flex-wrap:wrap}
  .kh__err{color:#b0003a;font-size:14px;margin:0}
  @media (max-width:640px){.kh{padding:0}.kh__box{max-height:100vh;height:100%;border-radius:0}.kh__detail{grid-template-columns:1fr}.kh__detail img{max-height:42vh}.kh__grid{grid-template-columns:repeat(2,1fr)}}`;

  let root, state;
  function build() {
    const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
    root = document.createElement("div"); root.className = "kh"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Kuvahaku");
    root.innerHTML = `
      <div class="kh__box">
        <div class="kh__head">
          <div class="kh__row"><p class="kh__title">Hae vapaasti käytettäviä kuvia</p><button type="button" class="kh__x" data-kh="close" aria-label="Sulje">×</button></div>
          <form class="kh__row" data-kh="form">
            <input class="kh__q" type="search" placeholder="Esim. Sanna Marin, Linnan juhlat, Eurovision" aria-label="Hakusana" required>
            <select aria-label="Lähde">${Object.entries(SOURCES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}</select>
            <button class="kh__btn" type="submit">Hae</button>
          </form>
          <p class="kh__note">Haku käy läpi Wikipedian henkilökuvat, Wikimedia Commonsin, Flickrin (mm. valtioneuvosto ja EU-parlamentti) ja Finnan museo- ja arkistokuvat. Mukana vain kuvat, joiden lisenssi sallii käytön ja muokkauksen (CC0, CC BY, CC BY-SA, public domain). Tekijä ja lisenssi lisätään kuvatekstiin automaattisesti. Henkilökuvia ei saa käyttää mainonnassa ilman kuvatun lupaa.</p>
        </div>
        <div class="kh__body" data-kh="body"></div>
      </div>`;
    document.body.append(root);
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); state.detail ? showGrid() : close(); } });
    root.querySelector("[data-kh=form]").addEventListener("submit", (e) => { e.preventDefault(); search(true); });
  }
  const $b = () => root.querySelector("[data-kh=body]");

  async function search(fresh) {
    const q = root.querySelector(".kh__q").value.trim(); if (!q) return;
    const src = root.querySelector("select").value;
    try { localStorage.setItem("hulina-kuvahaku", JSON.stringify({ q, src })); } catch {}
    if (fresh) Object.assign(state, { q, src, cursor: {}, items: [], more: false, detail: null, who: "", run: (state.run || 0) + 1 });
    const run = state.run;
    state.busy = true; render(fresh ? "Haetaan…" : "");
    try {
      const r = await fetchPage(src, q, state.cursor);
      if (run !== state.run) return;
      const seen = new Set(state.items.map((x) => x.key));
      state.items.push(...r.items.filter((x) => !seen.has(x.key) && seen.add(x.key)));
      state.more = r.more; state.error = r.error; state.who = r.who || state.who;
    } catch (e) { if (run !== state.run) return; state.error = e.message; }
    state.busy = false; render();
  }

  function render(msg) {
    if (state.detail) return showDetail(state.detail);
    const b = $b();
    if (msg) { b.innerHTML = `<p class="kh__msg">${esc(msg)}</p>`; return; }
    if (state.error && !state.items.length) { b.innerHTML = `<p class="kh__msg">${esc(state.error)}</p>`; return; }
    if (!state.q) { b.innerHTML = `<p class="kh__msg">Kirjoita hakusana. Julkkiksia ja poliitikkoja kannattaa hakea koko nimellä.</p>`; return; }
    if (!state.items.length) { b.innerHTML = `<p class="kh__msg">Ei vapaasti käytettäviä kuvia haulla ”${esc(state.q)}”. Kokeile toista lähdettä tai hakusanaa.</p>`; return; }
    b.innerHTML = `${state.who ? `<p class="kh__note kh__who">Henkilö: <b>${esc(state.who)}</b> · ${state.items.length}${state.more ? "+" : ""} kuvaa</p>` : `<p class="kh__note kh__who">${state.items.length}${state.more ? "+" : ""} kuvaa</p>`}<div class="kh__grid">${state.items.map((p, i) => `
      <button type="button" class="kh__item" data-kh-i="${i}" title="${esc(p.title)}">
        <img src="${esc(p.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.kh__item').remove()">
        <span><i>${esc(p.source)}</i>${esc(p.author)} · ${esc(p.license)}</span>
      </button>`).join("")}</div>
      ${state.error ? `<p class="kh__err">${esc(state.error)}</p>` : ""}
      ${state.more ? `<div class="kh__more"><button type="button" class="kh__btn kh__btn--ghost" data-kh="more" ${state.busy ? "disabled" : ""}>${state.busy ? "Haetaan…" : "Näytä lisää"}</button></div>` : ""}`;
  }

  function showDetail(p) {
    state.detail = p;
    $b().innerHTML = `
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
    root.querySelector("[data-kh-act]")?.focus();
  }
  function showGrid() { state.detail = null; render(); }

  async function onClick(e) {
    if (e.target === root) return close();
    const t = e.target.closest("[data-kh],[data-kh-i],[data-kh-act]"); if (!t) return;
    if (t.dataset.kh === "close") return close();
    if (t.dataset.kh === "more") return search(false);
    if (t.dataset.kh === "back") return showGrid();
    if (t.dataset.khI) return showDetail(state.items[t.dataset.khI]);
    if (t.dataset.khAct) {
      const a = state.actions[t.dataset.khAct], err = root.querySelector("[data-kh=err]");
      root.querySelectorAll("[data-kh-act]").forEach((x) => (x.disabled = true)); err.textContent = "Haetaan kuvaa…";
      try { await a.run(state.detail); close(); }
      catch (x) { err.textContent = x.message || "Kuvaa ei saatu käyttöön."; root.querySelectorAll("[data-kh-act]").forEach((y) => (y.disabled = false)); }
    }
  }

  let lastFocus;
  function open({ actions, query } = {}) {
    if (!root) build();
    lastFocus = document.activeElement;
    let saved = {}; try { saved = JSON.parse(localStorage.getItem("hulina-kuvahaku") || "{}"); } catch {}
    const keep = state && state.items.length && (!query || query === state.q);
    if (!keep) state = { q: "", src: SOURCES[saved.src] ? saved.src : "all", cursor: {}, items: [], more: false, detail: null, error: "", who: "", run: 0 };
    state.actions = actions || []; state.detail = null;
    root.querySelector(".kh__q").value = keep ? state.q : (query || "");
    root.querySelector("select").value = state.src;
    root.hidden = false; document.documentElement.style.overflow = "hidden";
    render();
    root.querySelector(".kh__q").focus();
    if (!keep && query) search(true);
  }
  function close() { root.hidden = true; document.documentElement.style.overflow = ""; lastFocus?.focus?.(); }

  window.Kuvahaku = { open };
})();
