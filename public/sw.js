// public/sw.js
self.addEventListener('install', () => {
  console.log('%cService Worker Yüklendi', 'color:#22d3ee');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});
