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

// Relative times ("15 min sitten"), "Tuore" badges and the breaking news bar.
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
  const hot = document.querySelector(".breaking[data-date]");
  if (hot && now - new Date(hot.dataset.date) < 12 * 3600e3) hot.hidden = false;
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
