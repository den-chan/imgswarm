/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */
!function (context) {
  
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
        $(".modal.hide").classList.remove("hide");
      }
    },
    "button#existing-user": {
      click: function () {
        
      }
    },
    "button#new-user": {
      click: function () {
        
      }
    }
  })
  
  /// Authentication and authorisation
  
  /**
   * Adapted from https://github.com/ttaubert/secret-notes
   */
  function Auth (handle) {
    var derived_key, self = this;
    
    function encode (str) {
      return new TextEncoder("utf-8").encode(str);
    }
    function decode (buf) {
      return new TextDecoder("utf-8").decode(new Uint8Array(buf));
    }
    
    function deriveKey (pwKey, salt) {
      var params = { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: 100 };
      return crypto.subtle.deriveKey(params, pwKey, {name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"])
    }
    function retrieveKey (handle) {
      function retrievePWKey(handle) {
        var buffer = encode(prompt("Please enter your password"));
        return crypto.subtle.importKey("raw", handle + buffer, "PBKDF2", false, ["deriveKey"]);
      }
      function getSalt (handle) {
        return localforage.getItem("imgswarm: " + handle + " salt")
          .then(function (salt) {
            if (salt) return salt;
            var salt = crypto.getRandomValues(new Uint8Array(8));
            return localforage.setItem("imgswarm: " + handle + " salt", salt);
          });
      }
      return Promise.all([ derived_key || retrievePWKey(handle), getSalt(handle) ])
        .then(function (values) { derived_key = values[0]; return deriveKey.apply(null, values) });
    }
    
    function load (name) {
      var values = Promise.all([
        localforage.getItem("imgswarm: " + handle + " " + name + " cipher"),
        localforage.getItem("imgswarm: " + handle + " " + name + " nonce")
      ]);
      return values.then(function (values) {
        var cipher = values[0];
        var nonce = values[1];
        if (!cipher || !nonce) return null;
        return self.retrieveKey(handle).then(function (key) {
          return crypto.subtle.decrypt({name: "AES-GCM", iv: nonce}, key, cipher)
            .then(self.decode, function (err) {
              throw "Auth error."
            })
        })
      })
    }
    function save (name, value) {
      var buffer = self.encode(value);
      return self.retrieveKey(handle).then(function (key) {
        var nonce = crypto.getRandomValues(new Uint8Array(16));
        return crypto.subtle.encrypt({name: "AES-GCM", iv: nonce}, key, buffer)
          .then(function (cipher) {
            return Promise.all([
              localforage.setItem("imgswarm: " + handle + " " + name + " cipher", cipher),
              localforage.setItem("imgswarm: " + handle + " " + name + " nonce", nonce)
            ])
          })
      })
    }
    
    this.verify = function () { return load("userid") }
    
    this.initialise = function (addr) { //validate address
      return save("userid", addr)
    }

    Object.defineProperty(self, "handle", {
      get: function () { return handle },
      set: function () { throw "Method error. Cannot change credentials." }
    });
  }
  
  context.Auth = Auth;
  
  /// User
  
  function User (auth) {
    var self = this;
    this.find = function () {
      return auth.verify().then(function (obj) { return JSON.parse(obj) });
    }

    this.create = function () {
      function generateAddress(h) { //build address
        return h
      }
      self.address = generateAddress(auth.handle);
      return auth.initialise(self.address).then(function () {
        
        // user.seededImages
        // user.imageFeeds
        // user.subscribedFeeds
        // user.settings
        
      })
    }
  }

  /// Cache
  if ("serviceWorker" in context.navigator) context.navigator.serviceWorker.register("service.js", { scope: "." })
}(self.top||self);