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
