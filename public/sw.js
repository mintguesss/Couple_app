// 最小化 Service Worker — 只用來觸發 PWA 安裝提示，不做快取
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// fetch 事件必須存在，Chrome 才承認這是 PWA
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
