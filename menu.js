// Ortak açılır menü (ek/ust_menu.py). Bilgisayarda üzerine gelince, dokunmatikte dokununca açılır; Esc ve dışarı tıklama kapatır.
// Dar ekranda (<900 px) ☰ tam ekran listeyi açar, başlıklar katlanır.
(() => {
  const ust = document.querySelector(".mega-ust");
  if (!ust) return;
  const dar = matchMedia("(max-width: 899px)");
  const fare = matchMedia("(hover: hover) and (pointer: fine)");
  const ogeler = [...ust.querySelectorAll(".mega-oge:not(.mega-duz)")];
  const ac = ust.querySelector(".mega-ac");
  let bekle;
  let uzerineAcildi = 0;   // fareyle açılan panoya hemen tıklanırsa kapanmasın

  const kapat = (haric) => ogeler.forEach((o) => {
    if (o === haric) return;
    o.classList.remove("acik");
    o.querySelector(".mega-dug").setAttribute("aria-expanded", "false");
  });
  const goster = (o, durum) => {
    kapat(durum ? o : null);
    o.classList.toggle("acik", durum);
    o.querySelector(".mega-dug").setAttribute("aria-expanded", String(durum));
  };

  ogeler.forEach((o) => {
    const dug = o.querySelector(".mega-dug");
    dug.addEventListener("click", () => {
      const acik = o.classList.contains("acik");
      if (acik && performance.now() - uzerineAcildi < 500) return;
      goster(o, !acik);
    });
    o.addEventListener("pointerenter", () => {
      if (dar.matches || !fare.matches) return;
      clearTimeout(bekle);
      bekle = setTimeout(() => { goster(o, true); uzerineAcildi = performance.now(); }, 70);
    });
    o.addEventListener("pointerleave", () => {
      if (dar.matches || !fare.matches) return;
      clearTimeout(bekle);
      bekle = setTimeout(() => goster(o, false), 160);
    });
  });

  // Şeridin atalarındaki bulanık zemin (backdrop-filter), transform ya da filter tam ekran listeyi şeride hapseder;
  // liste açıkken geçici olarak kaldırılır, kapanınca geri konur.
  const hapsedenler = [];
  const serbestBirak = (durum) => {
    if (!durum) { hapsedenler.splice(0).forEach(([el, eski]) => el.setAttribute("style", eski)); return; }
    for (let el = ust.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      const s = getComputedStyle(el);
      if ([s.backdropFilter, s.webkitBackdropFilter, s.transform, s.filter].some((v) => v && v !== "none")
          || /paint|layout|strict|content/.test(s.contain)) {
        hapsedenler.push([el, el.getAttribute("style") || ""]);
        el.style.setProperty("backdrop-filter", "none");
        el.style.setProperty("-webkit-backdrop-filter", "none");
        el.style.setProperty("transform", "none");
        el.style.setProperty("filter", "none");
        el.style.setProperty("contain", "none");
      }
    }
  };
  const cekmece = (durum) => {
    if (dar.matches || !durum) serbestBirak(durum);
    document.documentElement.classList.toggle("mega-acik", durum);
    ac?.setAttribute("aria-expanded", String(durum));
    if (!durum) kapat();
  };
  ac?.addEventListener("click", () => cekmece(!document.documentElement.classList.contains("mega-acik")));
  ust.querySelectorAll(".mega a").forEach((a) => a.addEventListener("click", () => cekmece(false)));
  dar.addEventListener("change", () => cekmece(false));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const acik = ogeler.find((o) => o.classList.contains("acik"));
    cekmece(false);
    acik?.querySelector(".mega-dug").focus();
  });
  document.addEventListener("click", (e) => { if (!ust.contains(e.target)) kapat(); });
})();
