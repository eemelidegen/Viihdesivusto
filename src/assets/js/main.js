document.querySelectorAll(".copy-link").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.url);
      btn.textContent = "Kopioitu!";
    } catch {
      btn.textContent = btn.dataset.url;
    }
  });
});

// Sidebar tabs (Suositut jutut / Tuoreimmat jutut)
document.querySelectorAll(".tabs").forEach((tabs) => {
  const buttons = tabs.querySelectorAll("[role=tab]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => {
        const active = b === btn;
        b.setAttribute("aria-selected", String(active));
        document.getElementById(b.getAttribute("aria-controls")).hidden = !active;
      });
    });
  });
});

// Back-to-top button
const toTop = document.querySelector(".to-top");
if (toTop) {
  const update = () => toTop.classList.toggle("is-visible", scrollY > 600);
  addEventListener("scroll", update, { passive: true });
  update();
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
}

// Reading progress bar on article pages.
const progress = document.querySelector(".read-progress");
const body = document.querySelector(".article .prose");
if (progress && body) {
  let queued = false;
  const update = () => {
    queued = false;
    const top = body.getBoundingClientRect().top + scrollY - innerHeight * 0.3;
    const end = top + body.offsetHeight - innerHeight * 0.4;
    const p = Math.min(1, Math.max(0, (scrollY - top) / Math.max(1, end - top)));
    progress.style.transform = `scaleX(${p})`;
  };
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}

// On small screens the menu scrolls sideways: bring the current section into view.
{
  const nav = document.querySelector(".nav");
  const current = nav?.querySelector("[aria-current=page]");
  if (current && nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
  }
  // The fade at the right edge hints at more items; drop it once scrolled to the end.
  const atEnd = () => nav.classList.toggle("is-end", nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4);
  nav?.addEventListener("scroll", atEnd, { passive: true });
  if (nav) atEnd();
}

// Today's date in the header, e.g. "Tiistai 27.10.2026".
document.querySelectorAll("[data-today]").forEach((el) => {
  const t = new Intl.DateTimeFormat("fi-FI", { weekday: "long", day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Helsinki" }).format(new Date());
  el.textContent = t.charAt(0).toUpperCase() + t.slice(1);
});

// Menu (three lines): opens a panel with the theme switch and page links.
{
  const btn = document.querySelector(".menu-btn");
  const menu = document.getElementById("menu");
  if (btn && menu) {
    const setOpen = (open) => { menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => setOpen(menu.hidden));
    document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setOpen(false); btn.focus(); } });

    // Light theme by default; the choice is remembered in this browser.
    const theme = menu.querySelector(".menu__theme");
    const sync = () => theme.setAttribute("aria-checked", String(document.documentElement.dataset.theme === "dark"));
    theme.addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme !== "dark";
      if (dark) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
      try { localStorage.setItem("hulina-teema", dark ? "dark" : "light"); } catch {}
      sync();
    });
    sync();
  }
}

// "Evästeasetukset" in the footer reopens Google's consent message.
document.querySelectorAll("[data-consent]").forEach((btn) => btn.addEventListener("click", () => {
  window.googlefc = window.googlefc || {};
  googlefc.callbackQueue = googlefc.callbackQueue || [];
  googlefc.callbackQueue.push(() => googlefc.showRevocationMessage());
}));

// Relative times ("15 min sitten") and "Tuore" badges.
{
  const now = Date.now();
  const clock = new Intl.DateTimeFormat("fi-FI", { hour: "2-digit", minute: "2-digit" });
  const rel = (d) => {
    const m = Math.round((now - d) / 60000);
    if (m < 1) return "juuri nyt";
    if (m < 60) return `${m} min sitten`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${h === 1 ? "tunti" : "tuntia"} sitten`;
    if (h < 48) return `eilen klo ${clock.format(d)}`;
    return "";
  };
  document.querySelectorAll("time[datetime]").forEach((t) => {
    const d = new Date(t.dateTime);
    if (Number.isNaN(+d) || d > now + 60000) return;
    const r = rel(d);
    if (r) { t.title = t.textContent.trim(); t.textContent = r; }
  });
  document.querySelectorAll(".card[data-date]").forEach((c) => {
    const f = c.querySelector(".card__figure");
    if (f && now - new Date(c.dataset.date) < 3 * 3600e3) f.insertAdjacentHTML("afterbegin", '<span class="fresh">Tuore</span>');
  });
}

// Photo galleries inside stories: swipe, arrows and a counter.
document.querySelectorAll("[data-gallery]").forEach((g) => {
  const track = g.querySelector(".gallery__track"), n = track.children.length;
  const count = g.querySelector(".gallery__count b");
  const prev = g.querySelector(".gallery__nav--prev"), next = g.querySelector(".gallery__nav--next");
  const update = () => {
    const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    count.textContent = i + 1; prev.disabled = i <= 0; next.disabled = i >= n - 1;
  };
  prev.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth, behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: track.clientWidth, behavior: "smooth" }));
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  update();
});

// Videos and posts from other services load only when the reader asks for them.
document.querySelectorAll("[data-embed]").forEach((box) => {
  box.querySelector(".embed__btn").addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.src = box.dataset.embed; f.title = "Upotettu sisältö"; f.allowFullscreen = true;
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    box.classList.add("is-loaded"); box.replaceChildren(f);
  });
});

// Phone share sheet, when the browser has one.
document.querySelectorAll("[data-share]").forEach((b) => {
  if (!navigator.share) return;
  b.hidden = false;
  b.addEventListener("click", () => navigator.share({ title: b.dataset.title, url: b.dataset.url }).catch(() => {}));
});

// Fit photos to their frames: a portrait or a small photo would be cropped badly or blown up,
// so it is shown whole on a blurred copy of itself instead.
function fitImage(img) {
  const box = img.closest("[data-fit], .card__media, .side-item__thumb, .read-also__thumb, .next-story__thumb");
  if (!box || !img.naturalWidth) return;
  const isArticle = box.hasAttribute("data-fit");
  const boxW = box.clientWidth || 1;
  const boxRatio = isArticle ? (window.innerWidth <= 640 ? 4 / 5 : 16 / 10) : boxW / (box.clientHeight || 1);
  const ratio = img.naturalWidth / img.naturalHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const tooSmall = img.naturalWidth < boxW * dpr * 0.6;
  const wrongShape = ratio < boxRatio * 0.72;
  if (tooSmall || wrongShape) {
    box.classList.add("is-fit");
    box.style.setProperty("--fit-bg", `url("${img.currentSrc || img.src}")`);
  }
}
document.querySelectorAll(".card__media img, .side-item__thumb img, .read-also__thumb img, .next-story__thumb img, [data-fit] img").forEach((img) => {
  if (img.complete) fitImage(img); else img.addEventListener("load", () => fitImage(img), { once: true });
});

// ---------- Reader accounts ----------
const accApi = async (path, body) => {
  const res = await fetch(`/api/${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.virhe || "Jokin meni pieleen. Yritä uudelleen."), { status: res.status });
  return data;
};
const me = fetch("/api/kayttaja/mina", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : { nimi: null, kaytossa: false })).catch(() => ({ nimi: null, kaytossa: false }));
me.then((u) => {
  document.querySelectorAll("[data-acc-name]").forEach((el) => { el.textContent = u.nimi || ""; });
  document.querySelectorAll("[data-acc-menu]").forEach((el) => { el.textContent = u.nimi ? `Oma tili (${u.nimi})` : "Kirjaudu / luo tili"; });
});

// Account page
if (document.getElementById("accLoading")) {
  const $a = (id) => document.getElementById(id);
  let stories = {};
  try { stories = JSON.parse($a("accStories").textContent); } catch {}
  const dateFmt = new Intl.DateTimeFormat("fi-FI", { day: "numeric", month: "long", year: "numeric" });
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "juuri nyt" : m < 60 ? `${m} min sitten` : m < 1440 ? `${Math.floor(m / 60)} t sitten` : m < 10080 ? `${Math.floor(m / 1440)} pv sitten` : new Intl.DateTimeFormat("fi-FI").format(new Date(t)); };
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const hue = (name) => [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

  const refreshStats = async () => {
    try {
      const d = await accApi("kayttaja/mina?tiedot=1");
      $a("statC").textContent = d.kommentteja ?? 0; $a("statR").textContent = d.vastauksia ?? 0; $a("statW").textContent = d.odottaa ?? 0;
      if (d.luotu) $a("accSince").textContent = `Jäsen ${dateFmt.format(new Date(d.luotu))} alkaen`;
    } catch {}
  };
  const loadComments = async () => {
    const box = $a("myComments");
    try {
      const { kommentit = [] } = await accApi("kayttaja/kommentit");
      box.textContent = "";
      if (!kommentit.length) {
        const empty = mk("div", "acc__empty");
        empty.append(mk("b", "", "Et ole vielä kommentoinut."), mk("span", "", "Kommentoi juttuja niiden alla. Kommenttisi kootaan tähän."));
        const go = mk("a", "acc__submit acc__submit--ghost", "Lue uusimmat jutut"); go.href = "/";
        empty.append(go); box.append(empty); return;
      }
      for (const c of kommentit) {
        const item = mk("article", "acc__item");
        const link = mk("a", "acc__story", stories[c.juttu] || "Juttu"); link.href = `/${c.juttu}/#kommentit`;
        const meta = mk("div", "acc__meta");
        meta.append(mk("span", "", ago(c.aika)));
        if (c.vastaus) meta.append(mk("span", "acc__tag", "Vastaus"));
        if (c.odottaa) meta.append(mk("span", "acc__tag acc__tag--wait", "Odottaa tarkistusta"));
        if (c.vastauksia) meta.append(mk("span", "acc__tag acc__tag--hot", `${c.vastauksia} ${c.vastauksia === 1 ? "vastaus" : "vastausta"}`));
        const del = mk("button", "acc__del", "Poista"); del.type = "button";
        del.addEventListener("click", async () => {
          if (!confirm("Poistetaanko kommentti? Myös sen vastaukset poistuvat.")) return;
          del.disabled = true;
          try { await accApi("kommentit/poista", { id: c.id }); item.remove(); refreshStats(); if (!box.children.length) loadComments(); }
          catch (x) { alert(x.message); del.disabled = false; }
        });
        meta.append(del);
        item.append(link, mk("p", "acc__body", c.teksti), meta);
        box.append(item);
      }
    } catch { box.textContent = ""; box.append(mk("p", "acc__muted", "Kommentteja ei saatu ladattua. Päivitä sivu.")); }
  };

  const show = (u) => {
    $a("accLoading").hidden = true;
    $a("accOff").hidden = u.kaytossa;
    $a("accIn").hidden = !u.kaytossa || !u.nimi;
    $a("accOut").hidden = !u.kaytossa || !!u.nimi;
    if (u.kaytossa && u.nimi) {
      $a("accName").textContent = u.nimi;
      const av = $a("accAvatar"), h = hue(u.nimi);
      av.textContent = [...u.nimi][0].toLocaleUpperCase("fi");
      av.style.background = `linear-gradient(135deg, hsl(${h} 85% 72%), hsl(${(h + 40) % 360} 70% 45%))`;
      refreshStats(); loadComments();
    }
  };
  me.then(show);
  const back = () => { const n = new URLSearchParams(location.search).get("takaisin"); location.href = n && n.startsWith("/") && !n.startsWith("//") ? n : "/tili/"; };

  const tab = (t) => {
    document.querySelectorAll(".acc__switch button").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.t === t)));
    $a("loginForm").hidden = t !== "login"; $a("regForm").hidden = t !== "register";
    const f = $a(t === "login" ? "loginForm" : "regForm").querySelector("input");
    if (f && matchMedia("(min-width: 700px)").matches) f.focus();
  };
  document.querySelector(".acc__switch").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) tab(b.dataset.t); });
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => tab(b.dataset.go)));
  if (location.hash === "#luo") tab("register");

  // Show / hide password
  document.querySelectorAll("[data-eye]").forEach((b) => b.addEventListener("click", () => {
    const i = b.previousElementSibling, on = i.type === "password";
    i.type = on ? "text" : "password"; b.classList.toggle("is-on", on); b.setAttribute("aria-label", on ? "Piilota salasana" : "Näytä salasana");
  }));
  // Password strength
  const PW_HINT = "Pitkä salasana on paras. Sitä ei voi palauttaa sähköpostilla, joten pidä se tallessa.";
  const LEVELS = ["Liian lyhyt", "Heikko", "Kohtalainen", "Hyvä", "Vahva"];
  const strength = (p) => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[A-ZÅÄÖ]/.test(p) && /[a-zåäö]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^\p{L}\p{N}]/u.test(p) || p.length >= 16) s++; return Math.min(4, s); };
  const resetMeter = (m) => { m.dataset.level = ""; m.firstElementChild.style.width = "0"; };
  document.querySelectorAll(".acc__meter").forEach((m) => {
    const label = m.closest("label"), input = label.querySelector("input"), hint = label.querySelector("[data-pw-hint]");
    input.addEventListener("input", () => {
      const v = input.value, lv = v.length < 8 ? 0 : strength(v);
      if (!v) resetMeter(m); else { m.dataset.level = lv; m.firstElementChild.style.width = `${Math.max(12, lv * 25)}%`; }
      if (hint) hint.textContent = v ? `Salasanan vahvuus: ${LEVELS[lv]}` : PW_HINT;
    });
  });
  // Nickname format check while typing (availability is checked when the form is sent)
  const nameIn = $a("regForm").querySelector("input[name=nimi]"), nameHint = $a("regForm").querySelector("[data-name-hint]");
  nameIn.addEventListener("input", () => {
    const v = nameIn.value.trim(), ok = /^[\p{L}\p{N}_.-]{3,24}$/u.test(v);
    nameHint.classList.toggle("is-bad", !!v && !ok); nameHint.classList.toggle("is-ok", ok);
    nameHint.textContent = !v ? "3–24 merkkiä: kirjaimia, numeroita tai _ . -" : ok ? "Nimimerkki kelpaa" : v.length < 3 ? "Vähintään 3 merkkiä" : "Vain kirjaimia, numeroita tai _ . -";
  });

  const handle = (form, path, done) => form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = form.querySelector(".acc__err"), btn = form.querySelector("button[type=submit]");
    err.classList.remove("is-ok");
    const bad = [...form.querySelectorAll("input")].find((i) => !i.checkValidity());
    if (bad) {
      err.textContent = bad.type === "checkbox" ? "Hyväksy säännöt ja tietosuojaseloste." : bad.validity.tooShort ? `${bad.closest("label").firstElementChild.firstChild.textContent.trim()}: liian lyhyt.` : "Täytä kaikki kentät.";
      bad.focus(); return;
    }
    const body = Object.fromEntries(new FormData(form)); if ("hyvaksyn" in body) body.hyvaksyn = true;
    err.textContent = ""; btn.disabled = true; btn.classList.add("is-busy");
    try { await accApi(path, body); done(form); } catch (x) { err.textContent = x.message; } finally { btn.disabled = false; btn.classList.remove("is-busy"); }
  });
  handle($a("loginForm"), "kayttaja/kirjaudu", back);
  handle($a("regForm"), "kayttaja/rekisteroidy", back);
  handle($a("pwForm"), "kayttaja/salasana", (form) => {
    form.reset(); form.querySelectorAll(".acc__meter").forEach(resetMeter);
    const ok = form.querySelector(".acc__err"); ok.textContent = "Salasana vaihdettu ✓"; ok.classList.add("is-ok");
  });
  handle($a("delForm"), "kayttaja/poista", () => { location.href = "/"; });
  $a("logout").addEventListener("click", async () => { await accApi("kayttaja/ulos", {}).catch(() => {}); location.href = "/"; });
}

// Comments under stories
const cBox = document.getElementById("kommentit");
if (cBox) {
  const story = cBox.dataset.story, list = cBox.querySelector(".comments__list"), formBox = cBox.querySelector(".comments__form");
  const fmt = new Intl.DateTimeFormat("fi-FI", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const when = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "juuri nyt" : m < 60 ? `${m} min sitten` : m < 1440 ? `${Math.floor(m / 60)} t sitten` : fmt.format(new Date(t)); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let user = null, replyTo = null;

  const composer = (parentId) => {
    const f = el("form", "comments__compose");
    const ta = el("textarea"); ta.maxLength = 1500; ta.rows = parentId ? 3 : 4; ta.required = true;
    ta.placeholder = parentId ? "Kirjoita vastaus…" : "Kirjoita kommentti…"; ta.setAttribute("aria-label", ta.placeholder);
    const row = el("div", "comments__row");
    const info = el("span", "comments__info", `Kommentoit nimimerkillä ${user}`);
    const btn = el("button", "btn-ink", parentId ? "Vastaa" : "Lähetä"); btn.type = "submit";
    const err = el("p", "comments__err"); err.setAttribute("role", "alert");
    row.append(info, btn); f.append(ta, row, err);
    f.addEventListener("submit", async (e) => {
      e.preventDefault(); err.textContent = ""; btn.disabled = true;
      try {
        const r = await accApi("kommentit", { juttu: story, teksti: ta.value, vastaus: parentId || null });
        ta.value = ""; replyTo = null;
        if (r.odottaa) err.textContent = "Kiitos! Kommenttisi näkyy muille, kun toimitus on tarkistanut sen.";
        await load();
      } catch (x) {
        if (x.status === 401) location.href = `/tili/?takaisin=${encodeURIComponent(location.pathname + "#kommentit")}`;
        err.textContent = x.message;
      } finally { btn.disabled = false; }
    });
    return f;
  };

  const item = (c, kids) => {
    const li = el("li", "comment" + (c.odottaa ? " comment--pending" : ""));
    const head = el("div", "comment__head");
    head.append(el("b", "comment__name", c.nimi), el("time", "comment__time", when(c.aika)));
    if (c.odottaa) head.append(el("span", "comment__flag", "Odottaa tarkistusta"));
    const body = el("p", "comment__body", c.teksti);
    const acts = el("div", "comment__acts");
    if (!c.vastaus) { const b = el("button", "", "Vastaa"); b.type = "button"; b.onclick = () => { if (!user) return (location.href = `/tili/?takaisin=${encodeURIComponent(location.pathname + "#kommentit")}`); replyTo = replyTo === c.id ? null : c.id; render(); }; acts.append(b); }
    if (c.oma) { const b = el("button", "", "Poista"); b.type = "button"; b.onclick = async () => { if (confirm("Poistetaanko kommenttisi?")) { await accApi("kommentit/poista", { id: c.id }).catch((x) => alert(x.message)); load(); } }; acts.append(b); }
    else if (user) { const b = el("button", "", "Ilmoita asiaton"); b.type = "button"; b.onclick = async () => { if (confirm("Ilmoitetaanko kommentti toimitukselle asiattomana?")) { await accApi("kommentit/ilmoita", { id: c.id }).catch((x) => alert(x.message)); b.textContent = "Ilmoitettu"; b.disabled = true; } }; acts.append(b); }
    li.append(head, body, acts);
    if (replyTo === c.id) li.append(composer(c.id));
    if (kids.length) { const ol = el("ol", "comments__replies"); kids.forEach((k) => ol.append(item(k, []))); li.append(ol); }
    return li;
  };

  let data = [];
  const render = () => {
    const top = data.filter((c) => !c.vastaus);
    cBox.querySelector(".comments__count").textContent = data.length ? `(${data.length})` : "";
    list.replaceChildren(...top.map((c) => item(c, data.filter((k) => k.vastaus === c.id))));
    if (!data.length) list.replaceChildren(el("li", "comments__empty", "Ei vielä kommentteja. Kirjoita ensimmäinen!"));
  };
  const load = async () => { const r = await accApi(`kommentit?juttu=${encodeURIComponent(story)}`); data = r.kommentit; render(); return r; };

  me.then(async (u) => {
    if (!u.kaytossa) return;
    user = u.nimi;
    cBox.hidden = false;
    if (user) formBox.replaceChildren(composer(null));
    else {
      const p = el("p", "comments__login");
      const a1 = el("a", "", "Kirjaudu sisään"); a1.href = `/tili/?takaisin=${encodeURIComponent(location.pathname + "#kommentit")}`;
      const a2 = el("a", "", "luo tili"); a2.href = `/tili/?takaisin=${encodeURIComponent(location.pathname + "#kommentit")}#luo`;
      p.append(a1, " tai ", a2, " kommentoidaksesi. ", Object.assign(el("a", "", "Kommentointisäännöt"), { href: "/kommentointi/" }));
      formBox.replaceChildren(p);
    }
    await load().catch(() => { cBox.hidden = true; });
  });
}
