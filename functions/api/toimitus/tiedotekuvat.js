// Press-release photos from STT Info (MTV, Nelonen, Yle, publishers…) for the image search.
// STT doesn't allow these calls from the browser, so the search runs here.
const API = "https://www.sttinfo.fi/public-website-api";
const PER = 10;
const get = (path) => fetch(API + path, { headers: { "User-Agent": "HulinaKuvahaku/1.0 (https://hulina.net)", Accept: "application/json" } })
  .then((r) => { if (!r.ok) throw new Error("stt " + r.status); return r.json(); });
const clean = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(20, Number(url.searchParams.get("page")) || 1));
  if (!q) return Response.json({ items: [], more: false });
  try {
    const found = await get(`/releases?page=${page - 1}&size=${PER}&search=${encodeURIComponent(q)}`);
    const releases = await Promise.all((found.releases || []).map((r) => get(`/release/${r.id}`).catch(() => null)));
    const items = [];
    for (const r of releases.filter(Boolean)) {
      const v = r.versions?.fi || Object.values(r.versions || {})[0] || {};
      const publisher = clean(r.publisher?.name) || "STT Info";
      for (const im of (v.images || []).slice(0, 12)) {
        if (!/^\/data\/images\/public\/[\w/-]+\.(jpe?g|png)$/i.test(im.path || "")) continue;
        const base = "https://www.sttinfo.fi" + im.path.replace(/\.(jpe?g|png)$/i, "");
        items.push({
          title: clean(im.caption) || clean(im.altText) || clean(v.title),
          release: clean(v.title),
          date: r.date,
          publisher,
          photographer: clean(im.credits),
          copyright: clean(im.copyright),
          page: "https://www.sttinfo.fi" + (v.url || r.url || ""),
          thumb: base + "-w_480.jpg",
          preview: base + "-w_960.jpg",
          full: base + "-w_1600.jpg",
          fallback: "https://www.sttinfo.fi" + im.path,
        });
      }
    }
    return Response.json({ items, more: page * PER < (found.totalCount || 0) }, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (e) {
    console.log("tiedotekuvat", e.message);
    return Response.json({ virhe: "Tiedotekuvien haku ei onnistunut juuri nyt." }, { status: 502 });
  }
}
