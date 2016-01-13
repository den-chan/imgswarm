/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */
var cacheName = "v1.106 10-1-2016";
self.importScripts("../lib/localforage.min.js", "../lib/ripemd160.js");

/// Life Cycle ///

self.addEventListener("install", function(event) {
  event.waitUntil(
    self.caches.open(cacheName).then(function(cache) {
      return cache.addAll([
        "/",
        "index.html",
        "imagefeed.html",
        "js/index.js",
        "js/imagefeed.js",
        "lib/webtorrent.min.js",
        "lib/localforage.min.js",
        "lib/ripemd160.js",
        "css/main.css"
      ]);
    }).then(function () { self.skipWaiting() })
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

self.addEventListener("activate", function(event) {
  var cacheWhitelist = [cacheName];
  event.waitUntil(
    self.caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key, i) {
        if (cacheWhitelist.indexOf(key) === -1) return self.caches.delete(keyList[i]);
      }));
    }).then(function () { self.clients.claim() })
  )
})

/// Message handling ///
//
// To do: load in separately to minimise bandwidth

var persistentUser;

self.addEventListener("message", function(event) {
  function postBack (result) {
    return event.ports[0].postMessage({messageType: data.messageType, value: result})
  }
  function errorBack (result) {
    var errmsg = /^(.*) \(([0-9]+)\.([0-9]+)\)$/.exec(result.message),
        error = {code: [errmsg[2], errmsg[3]], name: result.name, message: errmsg[1]};
    return event.ports[0].postMessage({messageType: data.messageType, error: error})
  }
  var data = event.data;
  switch (data.messageType) {

    case "checklogin":
      return postBack(
        persistentUser && persistentUser.loggedIn ?
          { userObject: persistentUser.user, userid: persistentUser.handle } :
          null
      );

    case "checkunique":
      var authObj = new Auth(data.value);
      persistentUser = new User(authObj);
      return persistentUser.checkunique().then(postBack).catch(errorBack)

    case "createuser":
      return persistentUser.create(data.value).then(persistentUser.login).then(postBack).catch(errorBack);

    case "login":
      var authObj = new Auth(data.value);
      persistentUser = new User(authObj);
      return persistentUser.login().then(postBack).catch(errorBack)

    case "logout":
      return persistentUser.logout().then(postBack);
      
    case "updateImageFeeds":
      return persistentUser.updateImageFeeds(data.value).then(postBack).catch(errorBack)

  }
})

/// Authentication and authorisation ///

/**
 * Adapted from https://github.com/ttaubert/secret-notes
 */
function Auth (handle) {
  var password, privateKey, storageKey, self = this;
  if (typeof handle !== "string") {
    password = handle.password;
    handle = handle.handle
  }

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
      var buffer = encode(handle + password); // broken! find how to mix handle with password
      password = null;
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
            throw new CodedError([1, 0], "Auth error", "Password failed")
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
        }).then(Promise.resolve(value))
    })
  }

  this.getAddress = function () { return load("address") };
  this.verify = function () { return load("user_object").then(JSON.parse) };
  this.initialise = function (userObject) {
    return save("address", userObject.address).then(function () {
      return save("user_object", userObject)
    })
  };

  Object.defineProperty(self, "handle", {
    get: function () { return handle },
    set: function () { throw new CodedError([1, 1], "Auth error", "Cannot change credentials.") }
  });

  this.setPrivateKey = function (val) {
    if (["crv", "d", "ext", "key_ops", "kty", "x", "y"].every(function (b) { return b in Object.keys(val) })) {
      throw new CodedError([1, 2], "Auth error", "Malformed key.")
    }
    return load("privateKey").then(function (result) {
      if (result === null) return save("privateKey", privateKey = val);
      else throw new CodedError([1, 1], "Auth error", "Cannot change credentials.")
    })
  };
  this.getPrivateKey = function () { // Asynchronous method, first call
    return load("privateKey").then(function (result) {
      return privateKey = JSON.parse(result)
    })
  };
  Object.defineProperty(self, "privateKey", { // Synchronous method, subsequent calls
    get: function () { return privateKey },
    set: function () { throw new CodedError([1, 1], "Auth error", "Cannot change credentials.") }
  });

  Object.defineProperty(self, "password", { // Synchronous method, subsequent calls
    set: function (p) { if (typeof password === "undefined") return (password = p) }
  });
}

/// User ///

function User (auth) {
  var user, self = this;
  Object.defineProperty(self, "user", {
    get: function () { return user },
    set: function () { return false }
  });
  
  Object.defineProperty(self, "handle", {
    get: function () { return auth.handle },
    set: function () { throw new CodedError([1, 1], "Auth error", "Cannot change credentials.") }
  });

  this.checkunique = function () {
    return localforage.getItem("imgswarm: " + auth.handle + " address cipher").then(function (result) {
      if (result !== null) throw new CodedError([2, 0], "User error", "Address already exists.");
      return true
    })
  }
  this.create = function (v) {
    auth.password = v.password;
    return generate().then(function (result) {
      self.address = result;
      user = {
        address: result,
        imageFeeds: {}
      }
      return auth.initialise(user).then(function (userObject) {

        // user.seededImages
        // user.imageFeeds
        // user.subscribedFeeds
        // user.settings

        return { userObject: userObject, userid: auth.handle }
      })
    })
  }

  this.login = function () {
    self.loggedIn = false;
    return new Promise(function (resolve) {
      return resolve(self.address || auth.getAddress())
    }).then(function (result) {
      if (result === null) throw new CodedError([2, 1], "User error", "Address not found.");
      self.address = result
    }).then(self.validate).then(function (result) {
      if (result === "b1") return auth.getPrivateKey();
      else throw new CodedError([3, 0], "Protocol error", "Not an imgswarm address.")
    }).then(auth.verify).then(function (obj) {
      self.loggedIn = true;
      return { userObject: (user = obj), userid: auth.handle }
    })
  }
  this.logout = function () { return Promise.resolve((persistentUser = null) || "success") }

  /// - Address generation and validation ///
  //
  // Copying bitcoin address format is probably both overkill and misunderstanding the point.
  // I need a method to verify that a user is really the author of an imageFeed.
  // ECDSA does not help if I need to rederive keys (use PBKDF2, or check bitcoinjs)

  function generate () {
    return crypto.subtle.generateKey(
      {name: "ECDSA", namedCurve:"P-256"}, true, ["sign", "verify"]
    ).then(function (result) {
      return Promise.all([
        crypto.subtle.exportKey("jwk", result.privateKey), //if only firefox could use pkcs8...
        crypto.subtle.exportKey("spki", result.publicKey)
      ])
    }).then(function (result) {
      return Promise.all([ auth.setPrivateKey(result[0]), sharipe(new Uint8Array(result[1])) ])
    }).then(function (result) {
      var body = new Uint8Array([0xb1].concat(result[1]));
      return Promise.all([ body, shasha(body) ])
    }).then(function (result) {
      return toBase58(
        Array.prototype.slice.call(result[0]).concat( Array.prototype.slice.call(result[1].subarray(0, 4)) )
      )
    })
  }

  /**
   * Adapted from https://github.com/ognus/wallet-address-validator
   */
  this.validate = function () {
    var addrBytes = fromBase58(self.address),
        length = addrBytes.length;
    if (length !== 25) throw new CodedError([5, 0], "Address error", "Length mismatch.");
    var checksum = addrBytes.subarray(21),
        body = addrBytes.subarray(0, 21);
    return shasha(body).then(function (digest) {
      function hex (ar) {
        return Array.prototype.slice.call(ar).reduce(function (a, b) { return a + b.toString(16) }, "")
      }
      if (hex(checksum) === hex(digest.subarray(0, 4))) return hex([addrBytes[0]]);
      else throw new CodedError([4, 1], "Address error", "Bad checksum.")
    })
  }

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
      if (!(c in alphabetMap)) throw new CodedError([4, 2], "Address error", "Non-base58 character.");
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

  function sharipe(publicKey) {
    return crypto.subtle.digest("SHA-256", publicKey).then(function (result) {
      return ripemd160( new Uint8Array(result).subarray(-64) )
    })
  }
  function shasha(clear) {
    return crypto.subtle.digest("SHA-256", clear).then(function (intermed) {
      return crypto.subtle.digest("SHA-256", intermed).then(function (result) {
        return new Uint8Array(result)
      })
    })
  }
  
  this.updateImageFeeds = function (imageFeeds) {
    console.log(imageFeeds);
    return "ok"
  }
}

/// Errors ///
//
// 1.0, "Auth error: Password failed."
//  .1, "Auth error: Cannot change credentials."
//  .2, "Auth error: Malformed key."
// 2.0, "User error: Address already exists."
//  .1, "User error: Address not found."
// 3.0, "Protocol error: Not an imgswarm address."
// 4.0, "Address error: Length mismatch."
//  .1, "Address error: Bad checksum."
//  .2, "Address error: Non-base58 character."

function CodedError (code, name, message) {
  var e = new Error(message + " (" + code.join(".") + ")");
  e.name = name;
  return e
}