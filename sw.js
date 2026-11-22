/* Belinga Documents — service worker (application utilisable sans réseau).
   - Pages et fichiers de l'application : gardés sur le téléphone.
   - Données (Supabase, fonction serveur, photos) : JAMAIS mises en cache ici
     (l'application garde elle-même la dernière liste et la file des photos à envoyer).
   Nouvelle version : changer VERSION. */
const VERSION = 'v1.1.0';   // 1.1.0 : lecture des photos sur le téléphone (Tesseract)
const CACHE = 'belinga-documents-' + VERSION;
const BASE = new URL('./', self.registration.scope).pathname;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE, BASE + 'index.html', BASE + 'manifest.webmanifest', BASE + 'icones/icone-192.png'])
    .catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('belinga-documents-') && n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Supabase, photos signées : jamais en cache
  if (req.mode === 'navigate') {
    // Réseau d'abord (nouvelle version), sinon la page gardée
    e.respondWith(fetch(req).then((r) => { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(BASE + 'index.html', copie)); return r; })
      .catch(() => caches.match(BASE + 'index.html')));
    return;
  }
  // Fichiers de l'application (noms avec empreinte) : cache d'abord
  e.respondWith(caches.match(req).then((trouve) => trouve || fetch(req).then((r) => {
    if (r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
    return r;
  })));
});
