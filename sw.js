// kubilaykenan.com servis çalışanı (21.10.2026): siteyi telefona "uygulama gibi" kurulabilir ve çevrimdışı kullanılabilir yapar.
// Üretici sürümü ve ön bellek listesini aşağıya yazar; sürüm, ön belleğe alınan dosyaların içerik özetidir (içerik değişince yenilenir).
// Sayfalar: önce ağ, olmazsa önbellek (güncel içerik önce). Veri/stil/görsel: önbellekten hemen, arkada tazele.
const SURUM = "0c866630ed";
const KAP = "kk-" + SURUM;
const ON_BELLEK = ["/", "/en/", "/sozluk/", "/sozluk/calis/", "/haftanin-10-kelimesi/", "/deneme/", "/plan/", "/calisma-plani/", "/deneme/veri.json", "/duello/", "/seviye-testi/", "/puan-hesaplama/", "/cevrimdisi/", "/defter/", "/sayac/", "/ada-tokenler.css?v=48b342d0", "/ada-bilesenler.css?v=48b342d0", "/site.css?v=a2a0118d", "/fontlar/fontlar.css?v=1", "/fontlar/Inter-latin.woff2", "/fontlar/Inter-latin-ext.woff2", "/fontlar/Jost-latin.woff2", "/fontlar/Jost-latin-ext.woff2", "/fontlar/CormorantGaramond-Bold.ttf", "/fontlar/DancingScript-Bold.ttf", "/sozluk/veri.json", "/sozluk/veri.json?v=45db7baa", "/duello/veri.json?v=2c237a45", "/seviye-testi/veri.json?v=e945b772", "/simge.png", "/simge-192.png", "/apple-touch-180.png", "/manifest.webmanifest", "/pdf/"];
const CEVRIMDISI = "/cevrimdisi/";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(KAP).then(c => c.addAll(ON_BELLEK)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("kk-") && k !== KAP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;          // YouTube kapakları, ölçüm, Apple rozeti: dokunma
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(y => { const k = y.clone(); caches.open(KAP).then(c => c.put(r, k)); return y; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(y => y || caches.match(CEVRIMDISI))));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: false }).then(eski => {
    const taze = fetch(r).then(y => { if (y.ok) { const k = y.clone(); caches.open(KAP).then(c => c.put(r, k)); } return y; }).catch(() => eski);
    return eski || taze;
  }));
});
