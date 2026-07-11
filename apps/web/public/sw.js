self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("coa-bot-v1").then((cache) => cache.addAll(["/", "/manifest.webmanifest"])));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/pending-changes"));
});
