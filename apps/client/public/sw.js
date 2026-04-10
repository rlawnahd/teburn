// Minimal service worker for PWA installability.
// No offline caching — teburn is a real-time data app where stale data hurts.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
