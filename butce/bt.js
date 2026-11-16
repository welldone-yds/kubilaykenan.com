/* Bütçe Defteri sayfası (16.11.2026): kaydırınca beliren bölümler, akan tutarlar, telefon ekran gösterisi, yazma örneği.
   Yalnız transform/opacity; ekran dışındaki her şey durur (IntersectionObserver), sekme arka plandayken gösteri durur.
   prefers-reduced-motion: hareket yok, son durum hemen görünür, sekmeler elle çalışır. Dış kitaplık yok. */
(function () {
  "use strict";
  var az = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IO = "IntersectionObserver" in window;
  var tl = new Intl.NumberFormat("tr-TR");

  /* 1) Gerçek ekran görüntüleri (body data-ekran="gercek" olunca; bkz. index.html başı) */
  if (document.body.dataset.ekran === "gercek") {
    document.querySelectorAll("[data-ekran-dosya]").forEach(function (el) {
      var img = new Image();
      img.src = "/butce/ekran/" + el.dataset.ekranDosya;
      img.alt = el.dataset.alt || "";
      img.loading = el.classList.contains("ekr") ? "eager" : "lazy";
      img.decoding = "async";
      el.textContent = "";
      el.appendChild(img);
      el.classList.add("gercek");
    });
  }

  /* 2) Akan tutarlar: "₺9.120", "%62". Metin baştan son değerdir (betiksiz ve arama motoru için). */
  function say(el) {
    var son = +el.dataset.say, on = el.dataset.on || "";
    if (az || !son) { el.textContent = on + tl.format(son); return; }
    var bas = performance.now(), sure = 1100;
    (function adim(t) {
      var p = Math.min(1, (t - bas) / sure), e = 1 - Math.pow(1 - p, 3);
      el.textContent = on + tl.format(Math.round(son * e));
      if (p < 1) requestAnimationFrame(adim);
    })(bas);
  }

  /* 3) Kaydırınca beliren bölümler (bir kez); içlerindeki halka/çubuk CSS geçişiyle çizilir */
  var belirler = document.querySelectorAll(".belir");
  function goster(el) {
    el.classList.add("gorundu");
    el.querySelectorAll("[data-say]").forEach(function (s) { if (!s.closest(".ekr")) say(s); });
  }
  if (!IO || az) {
    belirler.forEach(goster);
  } else {
    var gozcu = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) {
        if (g.isIntersecting) { goster(g.target); gozcu.unobserve(g.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    belirler.forEach(function (el) { gozcu.observe(el); });
  }

  /* 4) Telefon: dört sekme arasında kendiliğinden geçiş (görünürken), sekmeye dokununca elle */
  var tel = document.querySelector(".tel");
  if (tel) {
    var ekranlar = tel.querySelectorAll(".ekr");
    var dugmeler = tel.querySelectorAll(".sekmeler button");
    var imlec = tel.querySelector(".imlec");
    var yuzer = document.querySelectorAll(".yuzer");
    var sira = 0, zaman = null, gorunur = false, ARA = 3800;

    var sec = function (i, odak) {
      var once = sira;
      sira = (i + ekranlar.length) % ekranlar.length;
      ekranlar.forEach(function (e, j) {
        e.classList.toggle("aktif", j === sira);
        e.classList.toggle("sol", j === once && j !== sira);
      });
      dugmeler.forEach(function (d, j) {
        d.setAttribute("aria-selected", j === sira ? "true" : "false");
        d.tabIndex = j === sira ? 0 : -1;
      });
      if (imlec) imlec.style.transform = "translateX(" + sira * 100 + "%)";
      var e = ekranlar[sira];
      if (!e.classList.contains("gercek")) {
        // halka ve çubuklar yeniden çizilsin: sınıfı bir kare kaldırıp geri ver
        if (!az && once !== sira) {
          e.classList.remove("aktif"); void e.offsetWidth; e.classList.add("aktif");
        }
        e.querySelectorAll("[data-say]").forEach(say);
      }
      if (odak) dugmeler[sira].focus();
    };
    var dur = function () { clearInterval(zaman); zaman = null; };
    var basla = function () {
      dur();
      if (az || !gorunur || document.hidden) return;
      zaman = setInterval(function () { sec(sira + 1); }, ARA);
    };
    dugmeler.forEach(function (d, j) {
      d.addEventListener("click", function () { sec(j); basla(); });
      d.addEventListener("keydown", function (ev) {
        if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
          ev.preventDefault(); sec(sira + (ev.key === "ArrowRight" ? 1 : -1), true); basla();
        }
      });
    });
    tel.addEventListener("pointerenter", dur);
    tel.addEventListener("pointerleave", basla);
    document.addEventListener("visibilitychange", basla);
    if (IO) {
      new IntersectionObserver(function (g) {
        gorunur = g[0].isIntersecting;
        if (gorunur) yuzer.forEach(function (y, k) { setTimeout(function () { y.classList.add("g"); }, az ? 0 : 500 + k * 450); });
        basla();
      }, { threshold: 0.35 }).observe(tel);
    } else {
      gorunur = true; yuzer.forEach(function (y) { y.classList.add("g"); });
    }
    sec(0);
  }

  /* 5) Yazma örneği: "migros 450" yazılır → Market önerisi → Kaydet → listeye iner. Yalnız görünürken döner. */
  var demo = document.getElementById("demo");
  if (demo) {
    var yaz = demo.querySelector(".yaz"), yer = demo.querySelector(".yer"), on = demo.querySelector(".d-on");
    var cip = demo.querySelector('[data-c="market"]'), kaydet = demo.querySelector(".d-kaydet"), liste = demo.querySelector(".d-liste");
    var METIN = "migros 450", tur = 0;
    var bekle = function (ms, t) {
      return new Promise(function (ok, hayir) { setTimeout(function () { t === tur ? ok() : hayir(); }, ms); });
    };
    var sifirla = function () {
      yaz.textContent = ""; yer.style.display = ""; on.classList.remove("g"); cip.classList.remove("s");
    };
    var sonDurum = function () {
      yaz.textContent = METIN; yer.style.display = "none"; on.classList.add("g"); cip.classList.add("s");
      demo.classList.add("durgun");
    };
    var dongu = function () {
      var t = ++tur;
      sifirla();
      var p = bekle(700, t);
      METIN.split("").forEach(function (h, i) {
        p = p.then(function () { if (i === 0) yer.style.display = "none"; yaz.textContent += h; return bekle(h === " " ? 160 : 95, t); });
      });
      p.then(function () { on.classList.add("g"); cip.classList.add("s"); return bekle(900, t); })
        .then(function () { kaydet.classList.add("bas-t"); return bekle(180, t); })
        .then(function () {
          kaydet.classList.remove("bas-t");
          var s = document.createElement("div");
          s.className = "d-sat";
          s.innerHTML = '<span class="s" style="background:#30B0C7">M</span><span><b>Market</b><small>Market · şimdi</small></span><em>−₺450</em>';
          liste.insertBefore(s, liste.firstChild);
          while (liste.children.length > 3) liste.removeChild(liste.lastChild);
          return bekle(2200, t);
        })
        .then(dongu, function () { /* görünmez oldu: durdu */ });
    };
    if (az || !IO) {
      sonDurum();
    } else {
      new IntersectionObserver(function (g) {
        if (g[0].isIntersecting) dongu();
        else { tur++; kaydet.classList.remove("bas-t"); }
      }, { threshold: 0.3 }).observe(demo);
    }
  }
})();
