/* Belinga Documents — service worker (application utilisable sans réseau).
   - Pages et fichiers de l'application : gardés sur le téléphone.
   - Données (Supabase, fonction serveur, photos) : JAMAIS mises en cache ici
     (l'application garde elle-même la dernière liste et la file des photos à envoyer).
   Nouvelle version : changer VERSION. */
const VERSION = 'v1.8.0';   // 1.8.0 : couleurs rouge clair et blanc, modifier un kilométrage saisi ;   // 1.7.0 : kilométrage et vidange ;   // 1.6.0 : statut réel, carte grise, doublons, modifier, installer, actualiser ;   // 1.5.1 : nouveau logo (document + coche) ;   // 1.5.0 : décompte automatique sur tous les documents à jour ;    // 1.4.0 : nom du document, carte grise provisoire, documents perdus ;    // 1.3.0 : tous les véhicules + filtres ;    // 1.2.3 : photos décodées en petit (décodeur du téléphone), outil de lecture libéré ; 1.2.1 : secours
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
// Alertes documents (version 1.2) : notification reçue même application fermée
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { corps: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titre || '⚠️ Belinga Documents', {
    body: d.corps || '', tag: d.tag || 'alerte-document', icon: BASE + 'icones/icone-192.png', badge: BASE + 'icones/icone-192.png',
    data: { url: d.url || './' }, requireInteraction: true,
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const cible = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    const ouverte = l.find((c) => c.url.startsWith(self.registration.scope));
    return ouverte ? ouverte.focus() : self.clients.openWindow(cible);
  }));
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
