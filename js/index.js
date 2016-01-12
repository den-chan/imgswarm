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
    "div#auth > button": {
      click: function () {
        if (this.textContent === "Log in") $("#modal").classList.remove("hide");
        else if (this.textContent === "Log out") {
          $("div#auth > button").classList.remove("hide");
          $("#user-menu").classList.add("hide");
          $("div#auth > button").textContent = "Log in";
          $("#user-menu").textContent = null;
          return sendMessage({ messageType: "logout" }).then(function (response) {
            if (response !== "success") console.log("Couldn't log out", response); //Errorify
            else user = null
          })
        }
        
      }
    },
    "button#existing-user": {
      click: function () {
        $("#modal").classList.add("hide")
        return sendMessage({
          messageType: "login",
          value: {handle: $("#username").value, password: prompt("Please enter your password")}
        }).then(loadUser)
      }
    },
    "button#new-user": {
      click: function () {
        return sendMessage({ messageType: "checkunique", value: $("#username").value }).then(function (response) {
          if (response) {
            sendMessage({
              messageType: "createuser",
              value: { password: prompt("Please enter your password") }
            }).then(loadUser)
          }
          $("#modal").classList.add("hide")
        })
      }
    }
  });
  function loadUser(response) {
    if (response) {
      context.user = response.userObject;
      $("div#auth > button").classList.add("hide");
      $("#user-menu").classList.remove("hide");
      $("div#auth > button").textContent = "Log out";
      $("#user-menu").textContent = response.userid
    }
    else console.log(response);
  }

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