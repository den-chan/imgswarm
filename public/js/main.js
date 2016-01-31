/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */

//indexedDB.deleteDatabase("imgswarm");
//navigator.serviceWorker.getRegistration().then(function(r) {r.unregister()})
//var reader = new FileReader(); reader.onloadend = function () { return console.log(reader.result) }; fetch("iconfont.ttf").then(function (response) { return response.blob() }).then(function (blob) { reader.readAsDataURL(blob) })

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

var iceReader = new FileReader(), iceServers;
iceReader.onloadend = function () {
  iceServers = JSON.parse(iceReader.result)
};
fetch("data/ice-servers.json").then(function (response) {
  return response.blob()
}).then(function (blob) {
  iceReader.readAsText(blob)
})

/// App events ///

function eventHandler(data) {
  function postBack (result) {
    return Promise.resolve({ eventType: data.eventType, value: result })
  }
  function errorBack (result) {
    console.log(result)
    var errmsg = /^(.*) \(([0-9]+)\.([0-9]+)\)$/.exec(result.message),
        error = {code: [errmsg[2], errmsg[3]], name: result.name, message: errmsg[1]};
    return Promise.resolve({ eventType: data.eventType, error: error })
  }

  switch (data.eventType) {

    case "checklogin":
      return postBack( user && user.loggedIn ? { userid: user.handle, imageFeeds: [] } : null );

    case "checkunique":
      var authObj = new Auth(data.value);
      user = new User(authObj);
      return user.checkunique().then(postBack).catch(errorBack)

    case "createuser":
      return user.create(data.value).then(postBack).catch(errorBack);

    case "login":
      var authObj = new Auth(data.value);
      user = new User(authObj);
      return user.login().then(postBack).catch(errorBack)

    case "logout":
      return user.logout().then(postBack);

    case "updateImageFeed":
      return user.updateImageFeed(data.value).then(postBack).catch(errorBack)

  }
}

/// Errors ///
//
// 1.0, "Auth error: Password failed."
//  .1, "Auth error: Cannot change credentials."
//  .2, "Auth error: Malformed key."
//  .3, "Auth error: Name mismatch."
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

/// Storage ///

function Drum () {
  var req = indexedDB.open("imgswarm", 1), drum = this;
  return new Promise(function (resolve, reject) {
    req.onupgradeneeded = function (e) {
      drum._db = e.target.result;
      var users = drum._db.createObjectStore("uservars", { autoIncrement: false});
      var imagefeeds = drum._db.createObjectStore("imagefeeds", { autoIncrement: true });
    };
    req.onsuccess = function (e) { drum._db = e.target.result; resolve(drum) };
    req.onerror = function (e) { return reject(true) }
  })
}

Drum.prototype._db = null;

Drum.prototype._getUser = function (key) {
  var tx = this._db.transaction("uservars", "readwrite"),
      store = tx.objectStore("uservars");
  return new Promise(function (resolve) {
    store.get(key).onsuccess = function (e) { return resolve(e.target.result || null) }
  })
};

Drum.prototype._setUser = function (key, val) {
  var tx = this._db.transaction("uservars", "readwrite"),
      store = tx.objectStore("uservars");
  return new Promise (function (resolve) {
    if (val === null) store.delete(key).onsuccess = function (e) { return resolve(e.target.result) };
    else {
      store.put(val, key); // error
      return resolve(val)
    }
  })
};

Drum.prototype.getUserSalt = function (user) {
  return this._getUser(user + " salt")
};
Drum.prototype.setUserSalt = function (user, salt) {
  return this._setUser(user + " salt", salt)
};

Drum.prototype.getUserVar = function (user, key) {
  return Promise.all([
    this._getUser(user + " " + key + " cipher"),
    this._getUser(user + " " + key + " nonce")
  ])
};
Drum.prototype.setUserVar = function (user, key, value) {
  return Promise.all([
    this._setUser(user + " " + key + " cipher", value[0]),
    this._setUser(user + " " + key + " nonce", value[1])
  ])
};

Drum.prototype.getStorageKey = function (handle) {
  return this._getUser("storagekey")
};
Drum.prototype.setStorageKey = function (handle, key) {
  return this._setUser("storagekey", handle ? [handle, key] : null)
};

Drum.prototype.constructor = Drum;

/// Authentication and authorisation ///

function Auth (handle) {
  var auth = this;

  Object.defineProperty(this, "handle", {
    get: function () { return auth._handle },
    set: function () { throw new CodedError([1, 1], "Auth error", "Cannot change credentials.") }
  });

  Object.defineProperty(this, "privateKey", { // Synchronous method, subsequent calls
    get: function () { return auth._privateKey },
    set: function () { throw new CodedError([1, 1], "Auth error", "Cannot change credentials.") }
  });

  Object.defineProperty(this, "password", { // Synchronous method, subsequent calls
    set: function (p) { if (typeof auth._password === "undefined") return (auth._password = p) }
  });

  if (typeof handle === "object") {
    this._password = handle.password;
    this._handle = handle.handle
  } else if (typeof handle === "undefined") {
    return drum.getStorageKey()
      .then(function (key) {
        if (key !== null) auth._handle = key[0];
        return auth
      })
      .catch(function () { return null })
  }

  return false
}

/**
 * Adapted from https://github.com/ttaubert/secret-notes
 */
Auth.prototype._encode = function (str) {
  return new TextEncoder("utf-8").encode(str);
}

Auth.prototype._decode = function (buf) {
  return new TextDecoder("utf-8").decode(new Uint8Array(buf));
}

Auth.prototype._deriveKey = function (pwKey, salt) {
  var params = { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: 100 };
  return crypto.subtle.deriveKey(params, pwKey, {name: "AES-GCM", length: 256}, true, ["encrypt", "decrypt"])
}

Auth.prototype._retrieveKey = function (handle) {
  var auth = this, keyExists;
  function retrievePWKey(handle) {
    var buffer = Auth.prototype._encode(handle + auth._password); // broken! find how to mix handle with password
    this._password = null;
    return crypto.subtle.importKey("raw", buffer, "PBKDF2", false, ["deriveKey"]);
  }
  function getSalt (handle) {
    return drum.getUserSalt(handle)
      .then(function (salt) {
        if (!auth.handle || salt) return salt;
        var salt = crypto.getRandomValues(new Uint8Array(8));
        return drum.setUserSalt(handle, salt);
      });
  }
  return drum.getStorageKey(auth.handle).then(function (result) {
    if (result === null) return Promise.all([ retrievePWKey(handle), getSalt(handle) ])
      .then(function (values) { return auth._deriveKey.apply(null, values) })
      .then(function (key) { return Promise.all([key, crypto.subtle.exportKey("raw", key)]) })
      .then(function (keys) {
        return drum.setStorageKey(auth.handle, new Uint8Array(keys[1])).then(function() { return keys[0] })
      });
    else return crypto.subtle.importKey("raw", result[1].buffer, {name: "AES-GCM"}, false, ["encrypt", "decrypt"])
  })
}

Auth.prototype._load = function (name) {
  var auth = this,
      values = drum.getUserVar(this.handle, name);
  return values.then(function (values) {
    var cipher = values[0];
    var nonce = values[1];
    if (!cipher || !nonce) return null;
    return auth._retrieveKey(auth.handle).then(function (key) {
      return crypto.subtle.decrypt({name: "AES-GCM", iv: nonce}, key, cipher)
        .then(auth._decode, function (err) {
          throw new CodedError([1, 0], "Auth error", "Password failed")
        })
    })
  })
}

Auth.prototype._save = function (name, value) {
  var auth = this;
  if (typeof value !== "string") value = JSON.stringify(value);
  var buffer = this._encode(value);
  return this._retrieveKey(auth.handle).then(function (key) {
    var nonce = crypto.getRandomValues(new Uint8Array(16));
    return crypto.subtle.encrypt({name: "AES-GCM", iv: nonce}, key, buffer)
      .then(function (cipher) { return drum.setUserVar(auth.handle, name, [new Uint8Array(cipher), nonce]) })
      .then(Promise.resolve(value))
  })
}

Auth.prototype.getAddress = function () { return this._load("address") };

Auth.prototype.verify = function () { return this._load("user_object").then(JSON.parse) };

Auth.prototype.initialise = function (userObject) {
  var auth = this;
  return this._save("address", userObject.address).then(function () {
    return auth._save("user_object", userObject)
  })
};

Auth.prototype.setPrivateKey = function (val) { // address key
  var auth = this;
  if (["crv", "d", "ext", "key_ops", "kty", "x", "y"].every(function (b) { return b in Object.keys(val) })) {
    throw new CodedError([1, 2], "Auth error", "Malformed key.")
  }
  return this._load("privateKey").then(function (result) {
    if (result === null) return auth._save("privateKey", auth._privateKey = val);
    else throw new CodedError([1, 1], "Auth error", "Cannot change credentials.")
  })
};

Auth.prototype.getPrivateKey = function () { // Asynchronous method, first call
  var auth = this;
  return this._load("privateKey").then(function (result) {
    return auth._privateKey = JSON.parse(result)
  })
};

Auth.prototype.constructor = Auth;

/// User ///

function User (auth) {
  var user = this;
  this._auth = auth;

  Object.defineProperty(this, "user", {
    get: function () { return user._user },
    set: function () { return false } // error
  });

  Object.defineProperty(this, "handle", {
    get: function () { return user._auth.handle },
    set: function () { throw new CodedError([1, 1], "Auth error", "Cannot change credentials.") }
  });
}

User.prototype.checkunique = function () {
  return drum._getUser(this._auth.handle + " address cipher").then(function (result) {
    if (result !== null) throw new CodedError([2, 0], "User error", "Address already exists.");
    return true
  })
};

User.prototype.create = function (v) {
  var user = this;
  this._auth._password = v.password;
  return this._generate().then(function (result) {
    user.address = result;
    user._user = {
      address: result,
      imageFeeds: []
    }
    return user._auth.initialise(user._user).then(function (userObject) {

      // user.seededImages
      // user.imageFeeds
      // user.subscribedFeeds
      // user.settings

      return { userObject: userObject, userid: user._auth.handle }
    })
  }).then(function (result) { return user.login(result) })
};

User.prototype.login = function () {
  var user = this;
  this.loggedIn = false;
  return new Promise(function (resolve) {
    return resolve(user.address || user._auth.getAddress())
  }).then(function (address) {
    if (address === null) throw new CodedError([2, 1], "User error", "Address not found.");
    return user.address = address
  }).then(function (address) { return user.validate(address) }).then(function (protocolByte) {
    if (protocolByte === "b1") return user._auth.getPrivateKey();
    else throw new CodedError([3, 0], "Protocol error", "Not an imgswarm address.")
  }).then(function (result) { return user._auth.verify(result) }).then(function (obj) {
    user.loggedIn = true;
    return { userid: user._auth.handle }
  }).catch(function () { drum.setStorageKey() })
};

User.prototype.logout = function () {
  return drum.setStorageKey().then(function () { return (window.user = null) || "success" })
};

/// - Address generation and validation ///
//
// Copying bitcoin address format is probably both overkill and misunderstanding the point.
// I need a method to verify that a user is really the author of an imageFeed.
// ECDSA does not help if I need to rederive keys (use PBKDF2, or check bitcoinjs)

User.prototype._generate = function() {
  var user = this;
  return crypto.subtle.generateKey(
    {name: "ECDSA", namedCurve:"P-256"}, true, ["sign", "verify"]
  ).then(function (result) {
    return Promise.all([
      crypto.subtle.exportKey("jwk", result.privateKey), //if only firefox could use pkcs8...
      crypto.subtle.exportKey("spki", result.publicKey)
    ])
  }).then(function (result) {
    return Promise.all([ user._auth.setPrivateKey(result[0]), user._sharipe(new Uint8Array(result[1])) ])
  }).then(function (result) {
    var body = new Uint8Array([0xb1].concat(result[1]));
    return Promise.all([ body, user._shasha(body) ])
  }).then(function (result) {
    return user._toBase58(
      Array.prototype.slice.call(result[0]).concat( Array.prototype.slice.call(result[1].subarray(0, 4)) )
    )
  }).catch(function (err) { console.log(err) })
}

/**
 * Adapted from https://github.com/ognus/wallet-address-validator
 */
User.prototype.validate = function () {
  var user = this;
  var addrBytes = this._fromBase58(user.address),
      length = addrBytes.length;
  if (length !== 25) throw new CodedError([5, 0], "Address error", "Length mismatch.");
  var checksum = addrBytes.subarray(21),
      body = addrBytes.subarray(0, 21);
  return this._shasha(body).then(function (digest) {
    function hex (ar) {
      return Array.prototype.slice.call(ar).reduce(function (a, b) { return a + b.toString(16) }, "")
    }
    if (hex(checksum) === hex(digest.subarray(0, 4))) return hex([addrBytes[0]]);
    else throw new CodedError([4, 1], "Address error", "Bad checksum.")
  })
};

/**
 * Adapted from https://github.com/cryptocoinjs/base-x
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
      BASE = 58;
User.prototype._toBase58 = function (buf) {
  if (buf.length === 0) return "";
  var i, j, digits = [0]
  for (i = 0; i < buf.length; i++) {
    for (j = 0; j < digits.length; j++) digits[j] <<= 8
    digits[0] += buf[i]

    var carry = 0
    for (j = 0; j < digits.length; ++j) {
      digits[j] += carry
      carry = (digits[j] / BASE) | 0
      digits[j] %= BASE
    }

    while (carry) {
      digits.push(carry % BASE)
      carry = (carry / BASE) | 0
    }
  }
  for (i = 0; buf[i] === 0 && i < buffer.length - 1; i++) digits.push(0);
  var str = "";
  for (i = digits.length - 1; i >= 0; i--) str += ALPHABET[digits[i]]
  return str
};

User.prototype._fromBase58 = function (str) {
  var alphabetMap = {},
      i, j, bytes = [0];
  for(i = 0; i < BASE; i++) alphabetMap[ALPHABET.charAt(i)] = i;
  if (str.length === 0) return [];
  for (i = 0; i < str.length; i++) {
    var c = str[i];
    if (!(c in alphabetMap)) throw new CodedError([4, 2], "Address error", "Non-base58 character.");
    for (j = 0; j < bytes.length; j++) bytes[j] *= BASE;
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
};

User.prototype._sharipe = function (publicKey) {
  return crypto.subtle.digest("SHA-256", publicKey).then(function (result) {
    return ripemd160( new Uint8Array(result).subarray(-64) )
  })
};

User.prototype._shasha = function (clear) {
  return crypto.subtle.digest("SHA-256", clear).then(function (intermed) {
    return crypto.subtle.digest("SHA-256", intermed).then(function (result) {
      return new Uint8Array(result)
    })
  })
};

User.prototype.updateImageFeed = function (data) {
  var user = this;
  var id = data.id;
  if (!this.imageFeeds[id]) this.imageFeeds[id] = {images: []};
  if ("name" in data) this.imageFeeds[id].name = data.name;
  if ("imageName" in data) {
    var target = this.imageFeeds[id].images.filter(function (img) { return img.id == data.imageName[0] })[0]
    if (target) target.name = data.imageName[1]; // else error
  }
  if ("add" in data) {
    /*return swScope.caches.open("image cache").then(function (cache) {
      data.add.forEach(function (image, i) {
        delete image.blobURL;
        var ix = user.imageFeeds[id].images.reduce(function (a, b, i) { return b.id === image.id ? i : a }, null); // Array.prototype.find
        user.imageFeeds[id].images[ix].URL = image.URL = "images/feed-" + id + "/" + ix + "." + image.ext;
        var request = new Request(image.URL, {mode: "same-origin", referrer: swScope.location.origin}),
            response = new Response(image.file);
        cache.put(request, response)
      })
    }).then(Promise.resolve("ok"))*/
  } else if ("destroy" in data) {
    /*return swScope.caches.open("image cache").then(function (cache) {
      user.imageFeeds[id].images.forEach(function (image) {
        cache.delete(image.URL)
      })
    }).then(Promise.resolve("ok"))*/
    this.imageFeeds[id] = null
  }
  if ("order" in data) {
    this.imageFeeds[id].images = data.order.map(function (index) {
      return user.imageFeeds[id].images[index]
    })
  }
  return Promise.resolve("ok")
};

User.prototype.constructor = User;

///  ImageFeed ///

function ImageFeed (id, name) {
  if (typeof id === "number") this.id = id;
  else throw "No ID"; // error
  this.name = name || "Untitled imagefeed";
  this.images = []
}
ImageFeed.prototype.capture = function (files) {
  var self = this;
  return Promise.all( Array.prototype.slice.call(files).map(function (file, i) {
    return Promise.resolve( new Image(files[i]) );
  }) ).then(function (images) {
    var j = self.images.length;
    for (var i = 0; i < images.length; i++) {
      images[i].id = i + j;
      self.images.push(images[i])
    }
    return eventHandler({
      eventType: "updateImageFeed",
      value: {id: self.id, name: self.name, add: images.map(function (img) { return img.export() })}
    }).catch(function (err) {
      console.log(err)
      if (!SERVICE_WORKERS) {
        //indexedDB
      }
    }).then(function () { return images })
  })
};
ImageFeed.prototype.import = function (arr) {
  var j = this.images.length;
  this.images = arr.map(function (obj, i) { return new Image(obj, i + j) })
};
ImageFeed.prototype.constructor = ImageFeed;

/// Image ///

function Image (img, id) {
  this.name = img.name;
  this.ext = (/\.(.{0,16})$/.exec(img.name) || [,""])[1];
  this.file = img.file || Blob.prototype.slice.call(img);
  if (typeof id !== "undefined") this.id = id;
  if (img.URL) this.URL = img.URL;
  this.isSeeded = false;
};
Image.prototype.export = function () {
  return {
    name: this.name,
    ext: this.ext,
    file: this.file,
    id: this.id,
    URL: this.URL,
    isSeeded: false
  }
};
Image.prototype.constructor = Image

/// Initialiser ///

new Drum().then(function (drum) {
  window.drum = drum;
  return new Auth()
}).then(function (auth) {
  if (auth.handle) {
    window.user = new User(auth);
    return window.user.login()
  } else {
    return window.user = null
  }
}).then(function () {
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
})

/// ServiceWorker Response ///

/**
 * Adapted from https://googlechrome.github.io/samples/service-worker/post-message/
 */
/*
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
*/
