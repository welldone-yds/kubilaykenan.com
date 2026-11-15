/* Gazetejim yeniden tasarım denemesi (GEÇİCİ TEST, 15.11.2026) — veri: veri.json (sunucuda RSS'ten üretilir) */
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
    const d = new Date(t * 1000), bugun = new Date(), dun = new Date(Date.now() - 864e5);
    if (d.toDateString() === bugun.toDateString()) return saat(d);
    if (d.toDateString() === dun.toDateString()) return "Dün " + saat(d);
    return d.getDate() + " " + AY[d.getMonth()];
  };
  const YENI = 45 * 60;   // 45 dakikadan yeni manşet "Yeni" rozeti alır
  const alanAdi = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return ""; } };
  const kucuk = s => s.toLocaleLowerCase("tr").replace(/[ıİ]/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let V = null;
  const ONCEKI = oku("son-ziyaret", 0);           // bu ziyaretten önceki son açılış (sn)
  const yeniMi = t => ONCEKI && t && t > ONCEKI;
  const katRenk = kat => "--kat: var(--k-" + kat + ")";
  const durum = {
    kat: oku("kat", "one"),          // one = Öne çıkanlar (takip + her kategoriden ilk)
    gorunum: oku("gorunum", "kart"), // kart | akis
    takip: new Set(oku("takip", [])),
    ara: ""
  };

  /* ---------- tema ---------- */
  const tema = oku("tema", null);
  if (tema) document.documentElement.dataset.theme = tema;
  $("#tema").addEventListener("click", () => {
    const koyu = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const yeni = koyu ? "light" : "dark";
    document.documentElement.dataset.theme = yeni;
    sakla("tema", yeni);
  });

  /* ---------- künye tarihi ---------- */
  const tarihYaz = () => {
    const d = new Date();
    $("#tarih").textContent = d.getDate() + " " + AY[d.getMonth()] + " " + d.getFullYear() + ", " + GUN[d.getDay()];
  };
  tarihYaz();

  /* ---------- logo (favicon) ---------- */
  const logo = k => {
    const kutu = el("span", { class: "logo", "aria-hidden": "true" });
    const harf = (k.ad || "?").replace(/^(the|der|le|el)\s+/i, "").charAt(0).toLocaleUpperCase("tr");
    kutu.dataset.harf = harf;
    const alan = alanAdi(k.site);
    if (alan) {
      const img = el("img", { src: "https://www.google.com/s2/favicons?sz=64&domain=" + alan, alt: "", loading: "lazy", width: 28, height: 28 });
      img.addEventListener("error", () => img.remove());
      img.addEventListener("load", () => { if (img.naturalWidth <= 16) img.remove(); else kutu.classList.add("resimli"); });
      kutu.append(img);
    }
    return kutu;
  };

  /* ---------- yardımcılar ---------- */
  const kaynaklar = () => V.kategoriler.flatMap(k => k.kaynaklar.map(s => ({ ...s, kat: k.id, katAd: k.ad })));
  const manset = id => (V.haber[id] || []);
  const sonZaman = id => (manset(id)[0] || {}).t || 0;

  const takipDegis = (id, dugme) => {
    if (durum.takip.has(id)) durum.takip.delete(id); else durum.takip.add(id);
    sakla("takip", [...durum.takip]);
    if (dugme) {
      const on = durum.takip.has(id);
      dugme.setAttribute("aria-pressed", on);
      dugme.title = on ? "Takipten çıkar" : "Takip et";
    }
    if (durum.kat === "one") ciz();
    else ozetYaz();
  };

  const vurgula = (metin) => {
    if (!durum.ara) return metin;
    const i = kucuk(metin).indexOf(kucuk(durum.ara));
    if (i < 0) return metin;
    const f = document.createDocumentFragment();
    f.append(metin.slice(0, i), el("mark", {}, metin.slice(i, i + durum.ara.length)), metin.slice(i + durum.ara.length));
    return f;
  };

  /* ---------- kart ---------- */
  const kart = (k, sira) => {
    let m = manset(k.id);
    if (durum.ara) {   // aramada eşleşen manşetler kartın başına
      const a = kucuk(durum.ara);
      m = [...m.filter(h => kucuk(h.b).includes(a)), ...m.filter(h => !kucuk(h.b).includes(a))];
    }
    const takipte = durum.takip.has(k.id);
    const ust = el("header", { class: "kart-ust" },
      logo(k),
      el("span", { class: "kart-ad" }, el("a", { href: k.site, target: "_blank", rel: "noopener" }, k.ad)),
      m.length ? el("time", { class: "kart-zaman", datetime: new Date(m[0].t * 1000 || Date.now()).toISOString() }, once(m[0].t)) : null,
      el("button", { class: "yildiz", type: "button", "aria-pressed": takipte, title: takipte ? "Takipten çıkar" : "Takip et", "aria-label": k.ad + " takip",
        onclick: e => takipDegis(k.id, e.currentTarget) })
    );
    $(".yildiz", ust).innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';

    let govde;
    if (!m.length) {
      govde = el("div", { class: "kart-bos" },
        el("p", {}, k.rss ? "Şu an manşet alınamadı." : "Bu kaynak manşet yayımlamıyor."),
        el("a", { class: "git", href: k.site, target: "_blank", rel: "noopener" }, "Siteye git ", el("span", { "aria-hidden": "true" }, "→")));
    } else {
      const [ilk, ...kalan] = m;
      govde = el("div", { class: "kart-govde" },
        el("a", { class: "manset" + (yeniMi(ilk.t) ? " okunmadi" : ""), href: ilk.u, target: "_blank", rel: "noopener", onclick: e => e.currentTarget.classList.remove("okunmadi") },
          (ilk.t && Date.now() / 1000 - ilk.t < YENI) ? el("span", { class: "rozet" }, "Yeni") : null, vurgula(ilk.b)),
        el("ul", { class: "diger" }, kalan.slice(0, 3).map(h =>
          el("li", {}, el("a", { href: h.u, target: "_blank", rel: "noopener", class: yeniMi(h.t) ? "okunmadi" : null, onclick: e => e.currentTarget.classList.remove("okunmadi") }, vurgula(h.b)), h.t ? el("time", {}, once(h.t)) : null))),
        el("a", { class: "git", href: k.site, target: "_blank", rel: "noopener" }, alanAdi(k.site), el("span", { "aria-hidden": "true" }, " ↗")));
    }
    const a = el("article", { class: "kart" + (takipte ? " takipte" : ""), style: "--i:" + Math.min(sira, 14) + ";" + katRenk(k.kat) }, ust, govde);
    return a;
  };

  /* ---------- akış satırı ---------- */
  const satir = h => el("li", { class: "akis-satir", style: katRenk(h.k.kat) },
    el("time", { class: "akis-saat", datetime: new Date(h.t * 1000).toISOString() }, saat(new Date(h.t * 1000))),
    el("div", {},
      el("a", { class: "akis-baslik" + (yeniMi(h.t) ? " okunmadi" : ""), href: h.u, target: "_blank", rel: "noopener", onclick: e => e.currentTarget.classList.remove("okunmadi") },
        (Date.now() / 1000 - h.t < YENI) ? el("span", { class: "rozet" }, "Yeni") : null, vurgula(h.b)),
      el("span", { class: "akis-kaynak" }, logo(h.k), h.k.ad, el("span", { class: "nokta" }, "·"), el("span", { class: "kat-nokta" }), h.k.katAd, el("span", { class: "nokta" }, "·"), once(h.t))));

  /* ---------- sekmeler ---------- */
  const sekmeler = () => {
    const nav = $("#kategoriler");
    nav.textContent = "";
    const liste = [{ id: "one", ad: "Öne çıkanlar" }, ...V.kategoriler.map(k => ({ id: k.id, ad: k.ad }))];
    for (const k of liste) {
      nav.append(el("button", { type: "button", role: "tab", "aria-selected": durum.kat === k.id, "data-kat": k.id,
        style: k.id === "one" ? null : katRenk(k.id),
        onclick: () => { durum.kat = k.id; sakla("kat", k.id); sekmeSec(); ciz(); window.scrollTo({ top: 0, behavior: "smooth" }); } },
        k.id === "one" ? null : el("span", { class: "kat-nokta", "aria-hidden": "true" }), k.ad));
    }
    sekmeSec();
  };
  const sekmeSec = () => {
    for (const b of $("#kategoriler").children) {
      const on = b.dataset.kat === durum.kat;
      b.setAttribute("aria-selected", on);
      if (on) {   // yalnız şeridi kaydır (sayfayı değil); ilk sekmede başa yasla
        const nav = b.parentElement;
        nav.scrollTo({ left: b === nav.firstElementChild ? 0 : b.offsetLeft - nav.clientWidth / 2 + b.offsetWidth / 2, behavior: "smooth" });
      }
    }
  };

  /* ---------- görünüm düğmeleri ---------- */
  for (const b of document.querySelectorAll("[data-gorunum]")) {
    b.addEventListener("click", () => { durum.gorunum = b.dataset.gorunum; sakla("gorunum", durum.gorunum); ciz(); });
  }

  /* ---------- arama ---------- */
  let zam;
  $("#ara").addEventListener("input", e => {
    clearTimeout(zam);
    zam = setTimeout(() => { durum.ara = e.target.value.trim(); ciz(); }, 120);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== $("#ara")) { e.preventDefault(); $("#ara").focus(); }
    if (e.key === "Escape" && document.activeElement === $("#ara")) { $("#ara").value = ""; durum.ara = ""; ciz(); $("#ara").blur(); }
  });

  /* ---------- seçim ---------- */
  const secilenKaynaklar = () => {
    const hepsi = kaynaklar();
    if (durum.ara) return hepsi;   // arama bütün kaynaklarda
    if (durum.kat === "one") {
      const takip = hepsi.filter(k => durum.takip.has(k.id));
      const ilkler = V.kategoriler.flatMap(k => k.kaynaklar.filter(s => manset(s.id).length).slice(0, 2).map(s => ({ ...s, kat: k.id, katAd: k.ad })));
      const gor = new Set(takip.map(k => k.id));
      return [...takip, ...ilkler.filter(k => !gor.has(k.id))];
    }
    return hepsi.filter(k => k.kat === durum.kat);
  };

  const ozetYaz = () => {
    const n = durum.takip.size;
    const o = $("#takip-ozet");
    o.textContent = n ? n + " kaynak takipte" : "Yıldızla, takip ettiklerin başa gelsin";
    if (ONCEKI && V) {
      const yeni = Object.values(V.haber).flat().filter(h => yeniMi(h.t)).length;
      if (yeni) o.append(" · ", el("span", { class: "okunmadi-ozet" }, yeni + " yeni manşet"));
    }
  };

  /* ---------- çiz ---------- */
  const ciz = () => {
    for (const b of document.querySelectorAll("[data-gorunum]")) b.setAttribute("aria-pressed", b.dataset.gorunum === durum.gorunum);
    const alan = $("#icerik");
    alan.textContent = "";
    alan.className = durum.gorunum === "akis" ? "akis-alani" : "izgara-alani";
    const sec = secilenKaynaklar();
    const kat = V.kategoriler.find(k => k.id === durum.kat);
    $("#baslik").textContent = durum.ara ? "“" + durum.ara + "” araması" : (kat ? kat.ad : "Öne çıkanlar");
    ozetYaz();

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
        const bugun = new Date(); const dun = new Date(Date.now() - 864e5);
        const g = d.toDateString() === bugun.toDateString() ? "Bugün" : d.toDateString() === dun.toDateString() ? "Dün" : d.getDate() + " " + AY[d.getMonth()];
        if (g !== grup) { grup = g; alan.append(el("h3", { class: "akis-gun" }, g)); ul = el("ol", { class: "akis" }); alan.append(ul); }
        ul.append(satir(h));
      }
      return;
    }

    let liste = sec;
    if (durum.ara) {
      const a = kucuk(durum.ara);
      liste = sec.filter(k => kucuk(k.ad).includes(a) || manset(k.id).some(h => kucuk(h.b).includes(a)));
    } else if (durum.kat !== "one") {
      liste = [...sec].sort((x, y) => (durum.takip.has(y.id) - durum.takip.has(x.id)) || (!!manset(y.id).length - !!manset(x.id).length));
    }
    const dolu = liste.filter(k => manset(k.id).length).length;
    $("#alt-baslik").textContent = liste.length + " kaynak" + (dolu < liste.length ? ", " + dolu + " tanesinde güncel manşet" : "");
    if (!liste.length) return alan.append(bos());
    const izgara = el("div", { class: "izgara" });
    liste.forEach((k, i) => izgara.append(kart(k, i)));
    alan.append(izgara);
  };

  const bos = () => el("div", { class: "bos" }, el("p", {}, "Eşleşen bir şey bulamadım."),
    el("button", { type: "button", class: "hap", onclick: () => { $("#ara").value = ""; durum.ara = ""; ciz(); } }, "Aramayı temizle"));

  /* ---------- güncelleme bilgisi + "x dk önce" tazeleme ---------- */
  const guncelYaz = () => {
    if (!V) return;
    const d = new Date(V.guncel * 1000);
    $("#guncel").textContent = "Manşetler " + saat(d) + "'de toplandı";
    $("#guncel").title = d.toLocaleString("tr-TR");
  };
  setInterval(() => {
    tarihYaz();
    for (const t of document.querySelectorAll("time[datetime]")) {
      if (t.classList.contains("akis-saat")) continue;
      const s = Date.parse(t.getAttribute("datetime")) / 1000;
      if (s) t.textContent = once(s);
    }
  }, 60000);

  /* ---------- yükle ---------- */
  const yukle = async () => {
    try {
      const y = await fetch("veri.json?v=" + Math.floor(Date.now() / 300000));   // 5 dk'lık anahtar: servis çalışanı eski veriyi tutmasın
      if (!y.ok) throw new Error(y.status);
      V = await y.json();
      sakla("son-ziyaret", Math.floor(Date.now() / 1000));
      if (!V.kategoriler.some(k => k.id === durum.kat) && durum.kat !== "one") durum.kat = "one";
      document.body.classList.remove("yukleniyor");
      sekmeler();
      guncelYaz();
      ciz();
    } catch (e) {
      $("#icerik").innerHTML = "";
      $("#icerik").append(el("div", { class: "bos" }, el("p", {}, "Manşetler yüklenemedi. Biraz sonra yeniden dene."),
        el("button", { type: "button", class: "hap", onclick: () => location.reload() }, "Yenile")));
    }
  };
  yukle();
})();
