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

// Newsletter forms: submit in place, fall back to a normal POST without JavaScript.
document.querySelectorAll("[data-newsletter]").forEach((form) => {
  const status = form.querySelector(".newsletter__status");
  const button = form.querySelector("button");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = "Tilataan…";
    try {
      const res = await fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      const data = await res.json();
      if (data.ok) {
        form.reset();
        status.textContent = "Kiitos! Vahvista tilaus sähköpostiisi tulleesta linkistä.";
      } else {
        status.textContent = data.message || "Tilaus ei onnistunut. Yritä uudelleen.";
      }
    } catch {
      status.textContent = "Tilaus ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.";
    }
    button.disabled = false;
  });
});
