/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */
var cacheName = "v1.109 16-1-2016", swScope = self;

/// Life Cycle ///
// Can I load once only on first visit?

self.addEventListener("install", function(event) {
  event.waitUntil(
    self.caches.open(cacheName).then(function(cache) { // Promise.all with "image cache"?
      return cache.addAll([
        "/",
        "index.html",
        "imagefeed.html",
        "actions.html",
        "js/main.js",
        "js/index.js",
        "js/imagefeed.js",
        "js/actions.js",
        "lib/webtorrent.min.js",
        "lib/ripemd160.js",
        "css/main.css",
        "css/fonts.css",
        "data/ice-servers.json"
      ]);
    }).then(function () { self.skipWaiting() })
  )
});

self.addEventListener("activate", function(event) {
  var cacheWhitelist = [cacheName/*, "image cache"*/];
  event.waitUntil(
    self.caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key, i) {
        if (cacheWhitelist.indexOf(key) === -1) return self.caches.delete(keyList[i]);
      }));
    }).then(function () { self.clients.claim() })
  )
});

self.addEventListener("fetch", function(event) {
  event.respondWith(
    self.caches.match(event.request)
      .then(function (response) {
        if (response) return response;
        else return fetch(event.request)
      })
  )
});

self.addEventListener("message", function(event) {
  // return event.ports[0].postMessage()
})
