/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */
!function (context) {
  
  //indexedDB.deleteDatabase("localforage");
  //navigator.serviceWorker.getRegistration().then(function(r) {r.unregister()})
  
  context.user = undefined;
  
  /// Utilities
  
  function $ (sel, node, a) { return (a = [].slice.call( (node || document).querySelectorAll(sel) )).length > 1 ? a : a[0] }
  function addEvents (obj) {
    function add(el) { el.addEventListener(a[c], obj[id][e].bind(el), false) }
    for (var id in obj) for (var e in obj[id]) {
      var el = id ? $(id) : context, a = e.split(" "), b = a.length, c = 0;
      for (; c < b; c++) typeof el === "undefined" ? 0 : el.constructor.name === "Array" ? el.forEach(add) : add(el)
    }
  }
  
  /// UI
  addEvents({})
  
  /// Shared Context
  
  var sharedContext = new SharedWorker("js/shared.js");
  sharedContext.port.start();
  sharedContext.port.onmessage = function (e) {
    var response = e.data;
    switch (response.messageType) {}
  }

  /// Cache
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service.js", { scope: "." })
}(self.top||self);