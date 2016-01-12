/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */
!function (context) {
  
  //indexedDB.deleteDatabase("localforage");
  //navigator.serviceWorker.getRegistration().then(function(r) {r.unregister()})
  
  context.user = undefined;
  
  /// Utilities ///
  
  function $ (sel, node, a) { return (a = [].slice.call( (node || document).querySelectorAll(sel) )).length > 1 ? a : a[0] }
  function addEvents (obj) {
    function add(el) { el.addEventListener(a[c], obj[id][e].bind(el), false) }
    for (var id in obj) for (var e in obj[id]) {
      var el = id ? $(id) : context, a = e.split(" "), b = a.length, c = 0;
      for (; c < b; c++) typeof el === "undefined" ? 0 : el.constructor.name === "Array" ? el.forEach(add) : add(el)
    }
  }
  
  /// UI ///
  addEvents({
    "#toggle-nav": {
      click: function () {
        this.classList.toggle("plus");
        this.classList.toggle("minus")
      }
    }
  })
  
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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service.js", { scope: "." })
      .then(navigator.serviceWorker.ready)
      .then(function () {
        sendMessage({ messageType: "checklogin" }).then(loadUser);
      })
      .catch(function(error) {});
  } else {
    console.log("Service Workers are unavailable.") // Handle it!
  }
}(self.top||self);