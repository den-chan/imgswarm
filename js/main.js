/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */
  
//indexedDB.deleteDatabase("localforage");
//navigator.serviceWorker.getRegistration().then(function(r) {r.unregister()})
//var reader = new FileReader(); reader.onloadend = function () { return console.log(reader.result) }; fetch("iconfont.ttf").then(function (response) { return response.blob() }).then(function (blob) { reader.readAsDataURL(blob) })

window.user = undefined;

/// Utilities ///

function $ (sel, node, a) { return (a = [].slice.call( (node || document).querySelectorAll(sel) )).length > 1 ? a : a[0] }
function addEvents (obj) {
  function add(el) { el.addEventListener(a[c], obj[id][e].bind(el), false) }
  for (var id in obj) for (var e in obj[id]) {
    var el = id ? $(id) : [window, document], a = e.split(" "), b = a.length, c = 0;
    for (; c < b; c++) typeof el === "undefined" ? 0 : el.constructor.name === "Array" ? el.forEach(add) : add(el)
  }
}

addEvents(uiEvents);

/// ServiceWorker Response ///

/**
 * Adapted from https://googlechrome.github.io/samples/service-worker/post-message/
 */
function sendMessage(message) {
  return new Promise(function (resolve, reject) {
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function (event) {
      if (event.data.error) reject(event.data.error);
      else resolve(event.data.value)
    };
    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2])
  })
}

if (SERVICE_WORKERS) {  
  navigator.serviceWorker.register("service.js", { scope: "." })
    .then(navigator.serviceWorker.ready)
    .then(function (registration) {
      return registration.active || new Promise(function (resolve) {
        navigator.serviceWorker.oncontrollerchange = function (e) { resolve(e.target) }
      })
    })
    .then(service)
    .catch(function(error) {});
} else {
  console.log("Service Workers are unavailable.") // Handle it!
}