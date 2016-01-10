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
    var privateKey, storageKey, self = this;
    
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
        var buffer = encode(handle + prompt("Please enter your password"));
        return crypto.subtle.importKey("raw", buffer, "PBKDF2", false, ["deriveKey"]);
      }
      function getSalt (handle) {
        return localforage.getItem("imgswarm: " + handle + " salt")
          .then(function (salt) {
            if (salt) return salt;
            var salt = crypto.getRandomValues(new Uint8Array(8));
            return localforage.setItem("imgswarm: " + handle + " salt", salt);
          });
      }
      return Promise.all([ storageKey || retrievePWKey(handle), getSalt(handle) ])
        .then(function (values) { storageKey = values[0]; return deriveKey.apply(null, values) });
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
        return retrieveKey(handle).then(function (key) {
          return crypto.subtle.decrypt({name: "AES-GCM", iv: nonce}, key, cipher)
            .then(decode, function (err) {
              throw "Auth error."
            })
        })
      })
    }
    function save (name, value) {
      if (typeof value !== "string") value = JSON.stringify(value);
      var buffer = encode(value);
      return retrieveKey(handle).then(function (key) {
        var nonce = crypto.getRandomValues(new Uint8Array(16));
        return crypto.subtle.encrypt({name: "AES-GCM", iv: nonce}, key, buffer)
          .then(function (cipher) {
            return Promise.all([
              localforage.setItem("imgswarm: " + handle + " " + name + " cipher", new Uint8Array(cipher)),
              localforage.setItem("imgswarm: " + handle + " " + name + " nonce", nonce)
            ])
          })
      })
    }
    
    this.verify = function () { return load("userid") }
    
    this.initialise = function (addr) { return save("userid", addr) }

    Object.defineProperty(self, "handle", {
      get: function () { return handle },
      set: function () { throw "Method error. Cannot change credentials." }
    });
    
    this.setPrivateKey = function (val) {
      if (["crv", "d", "ext", "key_ops", "kty", "x", "y"].every(function (b) { return b in Object.keys(val) })) {
        throw "Method error. Malformed key."
      }
      return load("privateKey").then(function (result) {
        if (result === null) return save("privateKey", val);
        else throw "Method error. Cannot change credentials."
      })
    };
    this.getPrivateKey = function () { // Asynchronous method
      return load("privateKey").then(function (result) {
        return privateKey = JSON.parse(result)
      })
    };
    Object.defineProperty(self, "privateKey", { // Synchronous method
      get: function () { return privateKey },
      set: function () { throw "Method error. Cannot change credentials." }
    });
    
  }
  
  context.Auth = Auth;
  
  /// User
  
  function User (auth) {
    var self = this;
    this.find = function () {
      return auth.verify().then(function (obj) { return JSON.parse(obj) }); //not verify, or not userid
    }

    this.create = function () {
      return generate().then(function (result) {
        self.address = result;
        return auth.initialise(self.address).then(function () {

          // user.seededImages
          // user.imageFeeds
          // user.subscribedFeeds
          // user.settings

        })
      })
    }
    
    /// - Address generation and validation
    //
    // Copying bitcoin address format is probably both overkill and misunderstanding the point.
    // I need a method to verify that a user is really the author of an imageFeed.
    // ECDSA does not help if I need to rederive keys (use PBKDF2)
  
    /**
     * Adapted from https://github.com/cryptocoinjs/base-x
     */
    var alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
        base = 58;
    function toBase58 (buf) {
      if (buf.length === 0) return "";
      var i, j, digits = [0]
      for (i = 0; i < buf.length; i++) {
        for (j = 0; j < digits.length; j++) digits[j] <<= 8
        digits[0] += buf[i]

        var carry = 0
        for (j = 0; j < digits.length; ++j) {
          digits[j] += carry
          carry = (digits[j] / base) | 0
          digits[j] %= base
        }

        while (carry) {
          digits.push(carry % base)
          carry = (carry / base) | 0
        }
      }
      for (i = 0; buf[i] === 0 && i < buffer.length - 1; i++) digits.push(0);
      var str = "";
      for (i = digits.length - 1; i >= 0; i--) str += alphabet[digits[i]]
      return str
    }

    function fromBase58(str) {
      var alphabetMap = {},
          i, j, bytes = [0];
      for(i = 0; i < base; i++) alphabetMap[alphabet.charAt(i)] = i;
      if (str.length === 0) return [];
      for (i = 0; i < str.length; i++) {
        var c = str[i];
        if (!(c in alphabetMap)) throw "Address error. Non-base58 character.";
        for (j = 0; j < bytes.length; j++) bytes[j] *= base;
        bytes[0] += alphabetMap[c]

        var carry = 0
        for (j = 0; j < bytes.length; j++) {
          bytes[j] += carry
          carry = bytes[j] >> 8
          bytes[j] &= 0xff
        }

        while (carry) {
          bytes.push(carry & 0xff)
          carry >>= 8
        }
      }
      for (i = 0; str[i] === '1' && i < str.length - 1; i++) bytes.push(0)
      return new Uint8Array( bytes.reverse() )
    }

    function generate () {
      return crypto.subtle.generateKey(
        {name: "ECDSA", namedCurve:"P-256"}, true, ["sign", "verify"]
      ).then(function (result) {
        return Promise.all([
          crypto.subtle.exportKey("jwk", result.privateKey), //if only firefox could use pkcs8...
          crypto.subtle.exportKey("spki", result.publicKey)
        ])
      }).then(function (result) {
        return Promise.all([
          auth.setPrivateKey(result[0]),
          sharipe(new Uint8Array(result[1]))
        ])
      }).then(function (result) {
        var body = new Uint8Array([0xb1].concat(result[1]));
        return Promise.all([ body, shasha(body) ])
      }).then(function (result) {
        return toBase58(
          Array.prototype.slice.call(result[0]).concat( Array.prototype.slice.call(result[1].subarray(0, 4)) )
        )
      })
    }
    
    function sharipe(publicKey) {
      return crypto.subtle.digest("SHA-256", publicKey).then(function (result) {
        return new Promise(function (resolve) {
          var w = new Worker("lib/ripemd160.js"); // rewrite as a single function later
          w.onmessage = function (e) { resolve(e.data) }
          w.postMessage( new Uint8Array(result).subarray(-64) )
        })
      })
    }
    function shasha(clear) {
      return crypto.subtle.digest("SHA-256", clear).then(function (intermed) {
        return crypto.subtle.digest("SHA-256", intermed).then(function (result) {
          return new Uint8Array(result)
        })
      })
    }

    /**
     * Adapted from https://github.com/ognus/wallet-address-validator
     */
    this.validate = function () {
      var addrBytes = fromBase58(self.address),
          length = addrBytes.length;
      if (length !== 25) throw "Address error. Length mismatch.";
      var checksum = addrBytes.subarray(21),
          body = addrBytes.subarray(0, 21);
      return shasha(body).then(function (digest) {
        function hex (ar) {
          return Array.prototype.slice.call(ar).reduce(function (a, b) { return a + b.toString(16) }, "")
        }
        if (hex(checksum) === hex(digest.subarray(0, 4))) return hex([addrBytes[0]]);
        else throw "Address error. Bad checksum."
      })
    }
  }
  
  context.User = User;


  /// Cache
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("service.js", { scope: "." })
}(self.top||self);