/* Uygulama sayfaları ortak betiği (16.11.2026): belirme, üst şerit gölgesi, galeri düğmeleri, Suflör süre hesabı. Ölçüm yok. */
(() => {
  const ust = document.querySelector(".uy-ust");
  const golge = () => ust && ust.classList.toggle("golge", scrollY > 8);
  addEventListener("scroll", golge, { passive: true }); golge();

  const ogeler = document.querySelectorAll("[data-gor]");
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver((kayit) => {
      kayit.forEach((k) => { if (k.isIntersecting) { k.target.classList.add("gor"); io.unobserve(k.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    ogeler.forEach((o, i) => { o.style.transitionDelay = (o.parentElement.children.length > 2 ? (i % 4) * 70 : 0) + "ms"; io.observe(o); });
  } else ogeler.forEach((o) => o.classList.add("gor"));

  document.querySelectorAll(".galeri-sar").forEach((sar) => {
    const g = sar.querySelector(".galeri"), sol = sar.querySelector(".gal-dug.sol"), sag = sar.querySelector(".gal-dug.sag");
    if (!g) return;
    const adim = () => (g.querySelector("figure")?.getBoundingClientRect().width || 250) + 28;
    const durum = () => { if (sol) sol.disabled = g.scrollLeft < 8; if (sag) sag.disabled = g.scrollLeft + g.clientWidth > g.scrollWidth - 8; };
    sar.querySelectorAll("[data-gal]").forEach((d) => d.addEventListener("click", () => g.scrollBy({ left: adim() * 2 * +d.dataset.gal, behavior: "smooth" })));
    g.addEventListener("scroll", durum, { passive: true }); addEventListener("resize", durum); durum();
  });

  const f = document.querySelector("[data-sure]");
  if (f) {
    const k = f.elements.k, h = f.elements.h, ho = f.elements.ho, s = f.querySelector("[data-sonuc]");
    const hesap = () => {
      const kel = Math.max(0, +k.value || 0), hiz = +h.value || 130;
      ho.value = hiz;
      const sn = Math.round(kel / hiz * 60), dk = Math.floor(sn / 60), kalan = sn % 60;
      s.textContent = (dk ? dk + " " + f.dataset.dk + " " : "") + kalan + " " + f.dataset.sn;
    };
    f.addEventListener("input", hesap); hesap();
  }
})();
