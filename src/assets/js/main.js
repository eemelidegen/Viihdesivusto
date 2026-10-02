const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("nav");
toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});

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
