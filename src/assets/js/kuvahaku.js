// Kuvahaku: search freely licensed photos (Openverse, Wikimedia Commons) for the writing
// and social-image tools. Only licences that allow commercial use and editing are shown,
// and every pick comes with a ready credit line.
//
//   Kuvahaku.open({ actions: [{ label: "Käytä pääkuvana", run: async (photo) => { … } }] })
//
// photo = { title, author, license, source, page, credit, short, load() → Blob }
(() => {
  const UA = "HulinaKuvahaku/1.0 (https://hulina.net)";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const strip = (html) => { const d = document.createElement("div"); d.innerHTML = String(html || ""); return d.textContent.replace(/\s+/g, " ").trim(); };
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

  // Commons serves fixed thumbnail sizes; ask for one instead of a huge original.
  function commonsThumb(url, width, want) {
    const m = String(url).match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/(\w\/\w\w)\/([^/?#]+)/);
    if (!m || (width && width <= want) || /\.(svg|tiff?|pdf)$/i.test(m[2])) return url;
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[1]}/${m[2]}/${want}px-${m[2]}`;
  }
  const flickrSize = (url, s) => String(url).replace(/_[a-z]\.jpg$/, `_${s}.jpg`);

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
    p.credit = cut(`${author} / ${p.source}${free ? "" : ", " + p.license}`, 120);
    p.short = cut(`${author} / ${free ? p.source : p.license}`, 52);
    p.load = async () => {
      const res = await fetch("/api/toimitus/kuva?url=" + encodeURIComponent(p.full), { credentials: "same-origin" });
      if (res.status === 401) throw new Error("Kirjaudu ensin juttutyökaluun (/admin/kirjoita/), niin kuvan voi hakea.");
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).virhe || "Kuvaa ei saatu haettua.");
      return res.blob();
    };
    return p;
  }

  // Openverse indexes Commons, Flickr and other open collections.
  async function openverse(q, page) {
    const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license_type=commercial,modification&page_size=20&page=${page}`;
    const res = await fetch(u);
    if (res.status === 429) throw new Error("Hakuja on tehty liikaa hetken sisällä. Odota minuutti tai vaihda lähteeksi Wikimedia Commons.");
    if (!res.ok) throw new Error("Haku ei onnistunut. Kokeile uudelleen.");
    const d = await res.json();
    const items = (d.results || []).filter((r) => r.url && !/\.(svg|gif)$/i.test(r.url)).map((r) => {
      const wiki = r.provider === "wikimedia" || r.source === "wikimedia";
      const flickr = /staticflickr\.com/.test(r.url);
      return finish({
        id: "ov-" + r.id,
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

  const OK_LICENSE = /^(cc0|public domain|pd\b|pdm|cc[- ]by(-sa)?([- ]\d|$)|attribution)/i;
  async function commons(q, page) {
    const offset = (page - 1) * 20;
    const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6"
      + `&gsrsearch=${encodeURIComponent(q + " filetype:bitmap")}&gsrlimit=20&gsroffset=${offset}`
      + "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280&iiextmetadatafilter=Artist|LicenseShortName|ObjectName";
    const res = await fetch(u, { headers: { "Api-User-Agent": UA } });
    if (!res.ok) throw new Error(res.status === 429 ? "Hakuja on tehty liikaa hetken sisällä. Odota minuutti." : "Haku ei onnistunut. Kokeile uudelleen.");
    const d = await res.json();
    const pages = Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index);
    const items = pages.map((p) => {
      const ii = p.imageinfo?.[0]; if (!ii) return null;
      const m = ii.extmetadata || {}, license = strip(m.LicenseShortName?.value);
      if (!OK_LICENSE.test(license) || /\b(nc|nd)\b/i.test(license)) return null;
      const full = ii.thumburl || ii.url;
      return finish({
        id: "wc-" + p.pageid,
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
    return { items, more: !!d.continue };
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
            <select aria-label="Lähde"><option value="ov">Kaikki lähteet (Commons, Flickr ym.)</option><option value="wc">Wikimedia Commons</option></select>
            <button class="kh__btn" type="submit">Hae</button>
          </form>
          <p class="kh__note">Mukana vain kuvat, joiden lisenssi sallii käytön ja muokkauksen (CC0, CC BY, CC BY-SA, public domain). Tekijä ja lisenssi lisätään kuvatekstiin automaattisesti. Avaa kuvan lähdesivu, jos haluat varmistaa tiedot.</p>
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
    if (fresh) Object.assign(state, { q, src, page: 1, items: [], more: false, detail: null });
    else state.page++;
    state.busy = true; render(fresh ? "Haetaan…" : "");
    try {
      const r = await (src === "wc" ? commons : openverse)(q, state.page);
      const seen = new Set(state.items.map((x) => x.id));
      state.items.push(...r.items.filter((x) => !seen.has(x.id)));
      state.more = r.more && r.items.length > 0;
      state.error = "";
    } catch (e) { state.error = e.message; if (!fresh) state.page--; }
    state.busy = false; render();
  }

  function render(msg) {
    if (state.detail) return showDetail(state.detail);
    const b = $b();
    if (msg) { b.innerHTML = `<p class="kh__msg">${esc(msg)}</p>`; return; }
    if (state.error && !state.items.length) { b.innerHTML = `<p class="kh__msg">${esc(state.error)}</p>`; return; }
    if (!state.q) { b.innerHTML = `<p class="kh__msg">Kirjoita hakusana. Julkkiksia ja poliitikkoja kannattaa hakea koko nimellä.</p>`; return; }
    if (!state.items.length) { b.innerHTML = `<p class="kh__msg">Ei vapaasti käytettäviä kuvia haulla ”${esc(state.q)}”. Kokeile toista lähdettä tai hakusanaa.</p>`; return; }
    b.innerHTML = `<div class="kh__grid">${state.items.map((p, i) => `
      <button type="button" class="kh__item" data-kh-i="${i}" title="${esc(p.title)}">
        <img src="${esc(p.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.kh__item').remove()">
        <span>${esc(p.author)} · ${esc(p.license)}</span>
      </button>`).join("")}</div>
      ${state.error ? `<p class="kh__err">${esc(state.error)}</p>` : ""}
      ${state.more ? `<div class="kh__more"><button type="button" class="kh__btn kh__btn--ghost" data-kh="more" ${state.busy ? "disabled" : ""}>${state.busy ? "Haetaan…" : "Näytä lisää"}</button></div>` : ""}`;
  }

  function showDetail(p) {
    state.detail = p;
    $b().innerHTML = `
      <div class="kh__detail">
        <img src="${esc(p.thumb.replace(/\/330px-/, "/960px-").replace(/_n\.jpg$/, "_c.jpg"))}" alt="" referrerpolicy="no-referrer" onerror="if(!this.dataset.f){this.dataset.f=1;this.src=${esc(JSON.stringify(p.thumb))}}">
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
    if (!keep) state = { q: "", src: saved.src || "ov", page: 1, items: [], more: false, detail: null, error: "" };
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
