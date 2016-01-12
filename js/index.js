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
  addEvents({
    "div#auth > button": {
      click: function () {
        if (this.textContent === "Log in") $("#modal").classList.remove("hide");
        else if (this.textContent === "Log out") {
          sharedContext.port.postMessage({messageType: "logout"})
          $("div#auth > button").classList.remove("hide");
          $("#user-menu").classList.add("hide");
          $("div#auth > button").textContent = "Log in";
          $("#user-menu").textContent = null;
        }
        
      }
    },
    "button#existing-user": {
      click: function () {
        sharedContext.port.postMessage({
          messageType: "login",
          value: {handle: $("#username").value, password: prompt("Please enter your password")}
        });
        $("#modal").classList.add("hide")
      }
    },
    "button#new-user": {
      click: function () {
        sharedContext.port.postMessage({ messageType: "checkunique", value: $("#username").value })
      }
    }
  })
  
  /// Shared Context
  
  var sharedContext = new SharedWorker("js/shared.js");
  sharedContext.port.start();
  sharedContext.port.onmessage = function (e) {
    var response = e.data;
    switch (response.messageType) {
      case "checkunique":
        if ("value" in response) {
          if (response.value) {
            sharedContext.port.postMessage({
              messageType: "createuser",
              value: { password: prompt("Please enter your password") }
            })
          }
        }
        $("#modal").classList.add("hide")
        break
      case "createuser":
      case "login":
        if ("value" in response) {
          context.user = response.value.userObject;
          $("div#auth > button").classList.add("hide");
          $("#user-menu").classList.remove("hide");
          $("div#auth > button").textContent = "Log out";
          $("#user-menu").textContent = response.value.userid
        }
        else console.log(response);
        break;
      case "logout":
        if (response.value !== "success") console.log(response);
        else user = null
        break
    }
  }

  /// Cache
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service.js", { scope: "." })
}(self.top||self);