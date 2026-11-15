/* Gazetejim yeniden tasarım denemesi (GEÇİCİ TEST) — 2. tur 15.11.2026 · veri: veri.json (sunucuda RSS'ten üretilir) */
(() => {
  "use strict";
  const $ = (s, k = document) => k.querySelector(s);
  const el = (etiket, ozellik = {}, ...cocuk) => {
    const e = document.createElement(etiket);
    for (const [a, d] of Object.entries(ozellik)) {
      if (a === "class") e.className = d;
      else if (a.startsWith("on")) e.addEventListener(a.slice(2), d);
      else if (d !== false && d != null) e.setAttribute(a, d === true ? "" : d);
    }
    for (const c of cocuk.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  };
  const sakla = (a, d) => { try { localStorage.setItem("gj-" + a, JSON.stringify(d)); } catch (_) {} };
  const oku = (a, v) => { try { const d = localStorage.getItem("gj-" + a); return d ? JSON.parse(d) : v; } catch (_) { return v; } };

  const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const iki = n => String(n).padStart(2, "0");
  const saat = d => iki(d.getHours()) + "." + iki(d.getMinutes());
  const once = t => {
    if (!t) return "";
    const fark = Math.max(0, Date.now() / 1000 - t);
    if (fark < 60) return "şimdi";
    if (fark < 3600) return Math.floor(fark / 60) + " dk önce";
    const d = new Date(t * 1000);
    if (d.toDateString() === new Date().toDateString()) return saat(d);
    if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return "Dün " + saat(d);
    return d.getDate() + " " + AY[d.getMonth()];
  };
  const YENI = 45 * 60;
  const yeniMi45 = t => t && Date.now() / 1000 - t < YENI;
  const alanAdi = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return ""; } };
  const kucuk = s => s.toLocaleLowerCase("tr").replace(/[ıİ]/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const katRenk = kat => "--kat: var(--k-" + kat + ")";
  const dis = { target: "_blank", rel: "noopener" };

  let V = null;
  const ONCEKI = oku("son-ziyaret", 0);
  const okunmadiMi = t => ONCEKI && t && t > ONCEKI;
  const durum = { kat: oku("kat", "one"), gorunum: oku("gorunum", "kart"), takip: new Set(oku("takip", [])), ara: "" };

  /* ---------- saat ---------- */
  const saatYaz = () => {
    const d = new Date();
    $("#saat").textContent = iki(d.getHours()) + ":" + iki(d.getMinutes());
    $("#tarih").textContent = d.getDate() + " " + AY[d.getMonth()] + " " + d.getFullYear() + " " + GUN[d.getDay()];
  };
  saatYaz();

  /* ---------- görseller ---------- */
  const harf = k => (k.ad || "?").replace(/^(the|der|le|el)\s+/i, "").charAt(0).toLocaleUpperCase("tr");
  const logo = (k, sinif = "logo") => {
    if (k.logo) {
      const kutu = el("span", { class: sinif, "aria-hidden": "true" });
      const img = el("img", { src: k.logo, alt: "", loading: "lazy", width: 96, height: 96 });
      img.addEventListener("error", () => { kutu.className = sinif + " harf"; kutu.textContent = harf(k); });
      kutu.append(img);
      return kutu;
    }
    return el("span", { class: sinif + " harf", "aria-hidden": "true" }, harf(k));
  };
  const resim = (src, sinif) => {
    const img = el("img", { src, alt: "", class: sinif, loading: sinif === "arka" ? "eager" : "lazy", decoding: "async", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => { const k = img.closest(".kart-resim"); img.remove(); if (k) k.remove(); });
    return img;
  };

  /* ---------- yardımcılar ---------- */
  const kaynaklar = () => V.kategoriler.flatMap(k => k.kaynaklar.map(s => ({ ...s, kat: k.id, katAd: k.ad })));
  const manset = id => (V.haber[id] || []);

  const takipDegis = (id, dugme) => {
    if (durum.takip.has(id)) durum.takip.delete(id); else durum.takip.add(id);
    sakla("takip", [...durum.takip]);
    if (dugme) { const on = durum.takip.has(id); dugme.setAttribute("aria-pressed", on); dugme.title = on ? "Takipten çıkar" : "Takip et"; }
    if (durum.kat === "one") ciz(); else ozetYaz();
  };

  const vurgula = metin => {
    if (!durum.ara) return metin;
    const i = kucuk(metin).indexOf(kucuk(durum.ara));
    if (i < 0) return metin;
    const f = document.createDocumentFragment();
    f.append(metin.slice(0, i), el("mark", {}, metin.slice(i, i + durum.ara.length)), metin.slice(i + durum.ara.length));
    return f;
  };
  const okundu = e => e.currentTarget.classList.remove("okunmadi");

  /* ---------- vitrin: son dakika görselleri ---------- */
  const vitrin = () => {
    const gor = new Set(), sec = [];
    const aday = kaynaklar().filter(k => ["gazeteler", "internet", "tv-radyo", "spor", "ekonomi"].includes(k.kat))
      .flatMap(k => manset(k.id).slice(0, 3).filter(h => h.g && h.t).map(h => ({ ...h, k })))
      .sort((a, b) => b.t - a.t);
    for (const h of aday) { if (gor.has(h.k.id)) continue; gor.add(h.k.id); sec.push(h); if (sec.length === 5) break; }
    if (sec.length < 3) return null;
    return el("div", { class: "vitrin" }, sec.map((h, i) => el("a", { href: h.u, ...dis, style: katRenk(h.k.kat) },
      resim(h.g, "arka"),
      i === 0 ? el("span", { class: "son-dakika" }, "Son dakika") : null,
      el("span", { class: "v-kaynak" }, h.k.logo ? el("img", { src: h.k.logo, alt: "" }) : null, h.k.ad, el("time", {}, "· " + once(h.t))),
      el("h3", {}, h.b))));
  };

  /* ---------- logo şeridi ---------- */
  const serit = liste => el("div", {},
    el("div", { class: "serit-baslik" }, el("h2", {}, "Kaynaklar")),
    el("div", { class: "serit" }, liste.map(k => el("button", { type: "button", style: katRenk(k.kat), title: k.ad, onclick: () => kartaGit(k) },
      el("span", { class: "halka" + (yeniMi45((manset(k.id)[0] || {}).t) ? " yeni" : "") },
        k.logo ? el("img", { src: k.logo, alt: "" }) : el("span", { class: "harf" }, harf(k))),
      el("span", { class: "s-ad" }, k.ad)))));

  const kartaGit = k => {
    durum.ara = ""; $("#ara").value = "";
    if (durum.kat !== k.kat || durum.gorunum !== "kart") { durum.kat = k.kat; durum.gorunum = "kart"; sakla("kat", k.kat); sakla("gorunum", "kart"); sekmeSec(); ciz(); }
    const kart = document.getElementById("k-" + k.id);
    if (kart) { kart.scrollIntoView({ behavior: "smooth", block: "center" }); kart.classList.remove("vurgu"); void kart.offsetWidth; kart.classList.add("vurgu"); }
  };

  /* ---------- kart ---------- */
  const kart = (k, sira) => {
    let m = manset(k.id);
    if (durum.ara) { const a = kucuk(durum.ara); m = [...m.filter(h => kucuk(h.b).includes(a)), ...m.filter(h => !kucuk(h.b).includes(a))]; }
    const takipte = durum.takip.has(k.id);
    const yildiz = el("button", { class: "yildiz", type: "button", "aria-pressed": takipte, title: takipte ? "Takipten çıkar" : "Takip et",
      "aria-label": k.ad + " takip", onclick: e => takipDegis(k.id, e.currentTarget) });
    yildiz.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
    const ust = el("header", { class: "kart-ust" },
      el("a", { href: k.site, ...dis, tabindex: "-1" }, logo(k)),
      el("div", { class: "kart-kimlik" },
        el("a", { class: "kart-ad", href: k.site, ...dis }, vurgula(k.ad)),
        el("div", { class: "kart-alt" },
          k.il ? el("span", { class: "cip il" }, k.il) : el("span", { class: "cip" }, k.katAd),
          m.length && m[0].t ? el("time", { datetime: new Date(m[0].t * 1000).toISOString() }, once(m[0].t)) : null)),
      yildiz);

    let govde, resimKutu = null;
    if (!m.length) {
      govde = el("div", { class: "kart-bos" },
        el("p", {}, k.rss ? "Şu an manşet alınamadı." : "Bu kaynak manşet yayımlamıyor; haberleri kendi sitesinde."),
        el("a", { class: "git", href: k.site, ...dis }, alanAdi(k.site) + " ↗"));
    } else {
      const [ilk, ...kalan] = m;
      if (ilk.g) resimKutu = el("a", { class: "kart-resim", href: ilk.u, ...dis, tabindex: "-1", "aria-hidden": "true" }, resim(ilk.g, ""));
      govde = el("div", { class: "kart-govde" },
        el("a", { class: "manset" + (okunmadiMi(ilk.t) ? " okunmadi" : ""), href: ilk.u, ...dis, onclick: okundu },
          yeniMi45(ilk.t) ? el("span", { class: "rozet" }, "Yeni") : null, vurgula(ilk.b)),
        el("ul", { class: "diger" }, kalan.slice(0, 3).map(h => el("li", {},
          h.g ? resim(h.g, "kucuk-resim") : null,
          el("div", { class: "metin" },
            el("a", { href: h.u, ...dis, class: okunmadiMi(h.t) ? "okunmadi" : null, onclick: okundu }, vurgula(h.b)),
            h.t ? el("time", { datetime: new Date(h.t * 1000).toISOString() }, once(h.t)) : null)))),
        el("a", { class: "git", href: k.site, ...dis }, alanAdi(k.site) + " ↗"));
    }
    return el("article", { class: "kart" + (takipte ? " takipte" : ""), id: "k-" + k.id, style: "--i:" + Math.min(sira, 14) + ";" + katRenk(k.kat) },
      ust, resimKutu, govde);
  };

  /* ---------- akış satırı ---------- */
  const satir = h => el("li", { class: "akis-satir", style: katRenk(h.k.kat) },
    el("time", { class: "akis-saat" }, saat(new Date(h.t * 1000))),
    el("div", {},
      el("a", { class: "akis-baslik" + (okunmadiMi(h.t) ? " okunmadi" : ""), href: h.u, ...dis, onclick: okundu },
        yeniMi45(h.t) ? el("span", { class: "rozet" }, "Yeni") : null, vurgula(h.b)),
      el("span", { class: "akis-kaynak" }, logo(h.k), el("b", {}, h.k.ad), el("span", { class: "cip" }, h.k.il || h.k.katAd), once(h.t))),
    h.g ? el("a", { href: h.u, ...dis, tabindex: "-1", "aria-hidden": "true" }, resim(h.g, "akis-resim")) : null);

  /* ---------- sekmeler ---------- */
  const sekmeler = () => {
    const nav = $("#kategoriler");
    nav.textContent = "";
    for (const k of [{ id: "one", ad: "Öne çıkanlar" }, ...V.kategoriler]) {
      nav.append(el("button", { type: "button", role: "tab", "aria-selected": durum.kat === k.id, "data-kat": k.id,
        style: k.id === "one" ? "--kat: var(--kirmizi)" : katRenk(k.id),
        onclick: () => { durum.kat = k.id; sakla("kat", k.id); durum.ara = ""; $("#ara").value = ""; sekmeSec(); ciz(); window.scrollTo({ top: 0, behavior: "smooth" }); } },
        el("span", { class: "kat-nokta", "aria-hidden": "true" }), k.ad,
        k.kaynaklar ? el("span", { class: "sayi" }, String(k.kaynaklar.length)) : null));
    }
    sekmeSec();
  };
  const sekmeSec = () => {
    const nav = $("#kategoriler");
    for (const b of nav.children) {
      const on = b.dataset.kat === durum.kat;
      b.setAttribute("aria-selected", on);
      if (on) nav.scrollTo({ left: b === nav.firstElementChild ? 0 : b.offsetLeft - nav.clientWidth / 2 + b.offsetWidth / 2, behavior: "smooth" });
    }
  };

  for (const b of document.querySelectorAll("[data-gorunum]")) {
    b.addEventListener("click", () => { durum.gorunum = b.dataset.gorunum; sakla("gorunum", durum.gorunum); ciz(); });
  }

  /* ---------- arama ---------- */
  let zam;
  $("#ara").addEventListener("input", e => { clearTimeout(zam); zam = setTimeout(() => { durum.ara = e.target.value.trim(); ciz(); }, 120); });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== $("#ara")) { e.preventDefault(); $("#ara").focus(); }
    if (e.key === "Escape" && document.activeElement === $("#ara")) { $("#ara").value = ""; durum.ara = ""; ciz(); $("#ara").blur(); }
  });

  /* ---------- seçim ---------- */
  const secilenKaynaklar = () => {
    const hepsi = kaynaklar();
    if (durum.ara) return hepsi;
    if (durum.kat === "one") {
      const takip = hepsi.filter(k => durum.takip.has(k.id));
      const gor = new Set(takip.map(k => k.id));
      const ilkler = hepsi.filter(k => manset(k.id).length && !gor.has(k.id))
        .filter((k, i, a) => a.filter(x => x.kat === k.kat).indexOf(k) < 2);
      return [...takip, ...ilkler];
    }
    return hepsi.filter(k => k.kat === durum.kat);
  };

  const ozetYaz = () => {
    const n = durum.takip.size, o = $("#takip-ozet");
    o.textContent = n ? n + " kaynak takipte" : "Yıldızla, takip ettiklerin başa gelsin";
    if (ONCEKI && V) {
      const yeni = Object.values(V.haber).flat().filter(h => okunmadiMi(h.t)).length;
      if (yeni) o.append(" · ", el("span", { class: "okunmadi-ozet" }, yeni + " yeni manşet"));
    }
  };

  /* ---------- çiz ---------- */
  const ciz = () => {
    for (const b of document.querySelectorAll("[data-gorunum]")) b.setAttribute("aria-pressed", b.dataset.gorunum === durum.gorunum);
    const alan = $("#icerik"), ustAlan = $("#ust-alan");
    alan.textContent = ""; ustAlan.textContent = "";
    alan.className = durum.gorunum === "akis" ? "akis-alani" : "izgara-alani";
    const sec = secilenKaynaklar();
    const kat = V.kategoriler.find(k => k.id === durum.kat);
    const h1 = $("#baslik");
    h1.textContent = durum.ara ? "“" + durum.ara + "” araması" : (kat ? kat.ad : "Öne çıkanlar");
    h1.parentElement.style.cssText = kat && !durum.ara ? katRenk(kat.id) : "";
    ozetYaz();

    if (!durum.ara) {
      if (durum.kat === "one") { const v = vitrin(); if (v) ustAlan.append(v); }
      if (durum.gorunum === "kart") ustAlan.append(serit(durum.kat === "one" ? kaynaklar().filter(k => k.kat === "gazeteler" || durum.takip.has(k.id)) : sec));
    }

    if (durum.gorunum === "akis") {
      let satirlar = sec.flatMap(k => manset(k.id).filter(h => h.t).map(h => ({ ...h, k })));
      if (durum.ara) { const a = kucuk(durum.ara); satirlar = satirlar.filter(h => kucuk(h.b).includes(a) || kucuk(h.k.ad).includes(a)); }
      satirlar.sort((x, y) => y.t - x.t);
      satirlar = satirlar.slice(0, 160);
      $("#alt-baslik").textContent = satirlar.length + " manşet, en yeni üstte";
      if (!satirlar.length) return alan.append(bos());
      let grup = null, ul = null;
      for (const h of satirlar) {
        const d = new Date(h.t * 1000);
        const g = d.toDateString() === new Date().toDateString() ? "Bugün" : d.toDateString() === new Date(Date.now() - 864e5).toDateString() ? "Dün" : d.getDate() + " " + AY[d.getMonth()];
        if (g !== grup) { grup = g; alan.append(el("h3", { class: "akis-gun" }, g)); ul = el("ol", { class: "akis" }); alan.append(ul); }
        ul.append(satir(h));
      }
      return;
    }

    let liste = sec;
    if (durum.ara) {
      const a = kucuk(durum.ara);
      liste = sec.filter(k => kucuk(k.ad).includes(a) || manset(k.id).some(h => kucuk(h.b).includes(a)));
    } else if (durum.kat !== "one") {   // takip edilenler başa; manşeti olmayanlar sona; dosyadaki sıra korunur (Yerel'de Erzincan önde)
      liste = [...sec].sort((x, y) => (durum.takip.has(y.id) - durum.takip.has(x.id)) || (!!manset(y.id).length - !!manset(x.id).length));
    }
    const dolu = liste.filter(k => manset(k.id).length).length;
    $("#alt-baslik").textContent = liste.length + " kaynak" + (dolu < liste.length ? ", " + dolu + " tanesinde güncel manşet" : "");
    if (!liste.length) return alan.append(bos());
    alan.append(el("div", { class: "izgara" }, liste.map((k, i) => kart(k, i))));
  };

  const bos = () => el("div", { class: "bos" }, el("p", {}, "Eşleşen bir şey bulamadım."),
    el("button", { type: "button", class: "hap", onclick: () => { $("#ara").value = ""; durum.ara = ""; ciz(); } }, "Aramayı temizle"));

  /* ---------- tazeleme ---------- */
  setInterval(() => {
    saatYaz();
    for (const t of document.querySelectorAll("time[datetime]")) { const s = Date.parse(t.getAttribute("datetime")) / 1000; if (s) t.textContent = once(s); }
  }, 30000);

  /* ---------- yükle ---------- */
  (async () => {
    try {
      const y = await fetch("veri.json?v=" + Math.floor(Date.now() / 300000));
      if (!y.ok) throw new Error(y.status);
      V = await y.json();
      sakla("son-ziyaret", Math.floor(Date.now() / 1000));
      if (!V.kategoriler.some(k => k.id === durum.kat)) durum.kat = "one";
      document.body.classList.remove("yukleniyor");
      $("#guncel").textContent = "Güncellendi " + saat(new Date(V.guncel * 1000));
      $("#guncel").title = "Manşetlerin toplandığı saat: " + new Date(V.guncel * 1000).toLocaleString("tr-TR");
      sekmeler();
      ciz();
    } catch (e) {
      $("#icerik").textContent = "";
      $("#icerik").append(el("div", { class: "bos" }, el("p", {}, "Manşetler yüklenemedi. Biraz sonra yeniden dene."),
        el("button", { type: "button", class: "hap", onclick: () => location.reload() }, "Yenile")));
    }
  })();
})();
