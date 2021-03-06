/**
 * @author den-chan | https://den-chan.github.io | den-chan@tuta.io
 */
function service () {
  eventHandler({ eventType: "checklogin" }).then(function (response) {
    if (!response.value) return $("#address").textContent = "Not logged in.";
    window.user.imageFeeds = response.value.imageFeeds;
    $("#address").textContent = window.user.address;
    var label, i;
    for (i in response.value.imageFeeds) {
      user.imageFeeds[i = parseInt(i)] = new ImageFeed(i, response.value.imageFeeds[i].name);
      user.imageFeeds[i].import(response.value.imageFeeds[i].images);
      label = $("#stamps > .if-label").cloneNode(true);
      label.setAttribute("data-imagefeed-id", i);
      label.textContent = window.user.imageFeeds[i].name;
      $("#ifs-list-container").appendChild(label);
      $("#ifs-list-container").appendChild(document.createElement("br"));
    }
    addEvents({ "#ifs-list-container > .if-label": ifLabelEvents });
    if (typeof i !== "undefined") $("#ifs-list-container > .if-label:first-of-type").setAttribute("data-if-current", "");
  })
}

var uiEvents = {
  "": {
    load: function (e) {
      e.stopPropagation();
      var preview = $("#if-image-preview");
      preview.requestFullscreen =
        preview.requestFullscreen ||
        preview.webkitRequestFullscreen ||
        preview.mozRequestFullScreen;
      document.exitFullscreen =
        document.exitFullscreen ||
        document.webkitExitFullScreen ||
        document.webkitCancelFullScreen ||
        document.mozCancelFullScreen
    },
    keydown: function (e) {
      e.stopPropagation();
      var w = e.which;
      if ("imageFocus" in window && !imageFocus || w !== 37 && w !== 39) return false;
      window.getSelection().removeAllRanges();
      var cur = $("#if-directory > label").indexOf($("#if-directory > label[contenteditable]")),
          tot = $("#if-directory > label").length,
          nxt = (cur + w - 38 + tot) % tot + 1;
      $("#if-directory > label:nth-of-type(" + nxt + ")").dispatchEvent(new Event("click"));
      $("#if-image-preview > img:nth-of-type(" + nxt + ")").focus();
      var top = $("#if-directory > [contenteditable]").offsetTop - $("#if-directory").offsetTop,
          hgt = $("#if-directory > [contenteditable]").offsetHeight - $("#if-directory").offsetHeight;
      $("#if-directory").scrollTop = Math.max(Math.min($("#if-directory").scrollTop, top), top + hgt)
    }
  },
  "#if-name-field": {
    input: function (e) {
      $("#ifs-list-container > [data-if-current]").textContent = this.value;
      eventHandler({eventType: "updateImageFeed", value: {id: user.currentId, name: this.value}})
    },
    keypress: function (e) {
      if (e.which === 13) {
        e.preventDefault();
        this.blur();
      }
    }
  },
  "#new-imagefeed": {
    click: function () {
      $("#upload-imagefeed").classList.toggle("hide");
      $("#upload-imagefeed").classList.remove("img-view");
      $("#upload-imagefeed").setAttribute("title", "View feed images");
      $("#if-name-field").value = "";
      var label = $("#stamps > .if-label").cloneNode(true),
          ifLabels = (function (l) {
            return !(l = $("#ifs-list-container > .if-label")) ? [] : l.constructor.name !== "Array" ? [l] : l
          })(),
          nextId = ifLabels.map(function (el) { return el.dataset.imagefeedId }).reduce(Math.max, -1) + 1;
      label.setAttribute("data-imagefeed-id", nextId);
      label.setAttribute("data-if-current", "");
      $("#ifs-list-container").appendChild(label);
      addEvents({ "#ifs-list-container > .if-label:last-child": ifLabelEvents });
      $("#ifs-list-container").appendChild(document.createElement("br"));
      user.currentImageFeed = user.imageFeeds[nextId] = new ImageFeed(nextId);
      user.currentId = nextId;
      $("#ifs-list-container > [data-if-current]").textContent = user.currentImageFeed.name;
      toggleImageFeed()
    }
  },
  "#orphan-imagefeed": {
    click: function () {}
  },
  "#delete-imagefeed": {
    click: function () {
      toggleImageFeed();
      $("#upload-imagefeed").classList.toggle("hide");
      $("#if-image-upload > *").forEach(function (el) { el.classList.toggle("hide") });
      $("#ifs-list-container").removeChild($("#ifs-list-container > [data-if-current] + br"));
      $("#ifs-list-container").removeChild($("#ifs-list-container > [data-if-current]"));
      ($("#if-directory > *, #if-image-preview > img") || []).map(function (el) { el.parentNode.removeChild(el) });
      eventHandler({ eventType: "updateImageFeed", value: {id: user.currentId, destroy: ""} });
      delete user.currentImageFeed;
      delete user.currentId
    }
  },
  "#return-imagefeed": {
    click: function () {
      toggleImageFeed();
      $("#upload-imagefeed").classList.toggle("hide");
      ($("#if-directory > *, #if-image-preview > img") || []).map(function (el) { el.parentNode.removeChild(el) });
      $("#ifs-list-container > [data-if-current]").removeAttribute("data-if-current");
      delete user.currentImageFeed;
      delete user.currentId
    }
  },
  "#publish-imagefeed": {
    click: function () {
      var client = new WebTorrent(); //{ rtcConfig: { iceServers: iceServers } }
      client.seed(user.currentImageFeed.images[0].file, {
        name: user.currentImageFeed.name + ": " + user.currentImageFeed.images[0].name,
        createdBy: "Imgswarm v0.0",
        announceList:[["wss://imgswarm.tk:5001"]]
      }, function (torrent) {
        user.currentImageFeed.images[0].isSeeded = true;
        user.currentImageFeed.images[0].torrent = torrent
      })
    }
  },
  "#upload-imagefeed": {
    click: function () {
      this.classList.toggle("img-view");
      this.classList.contains("img-view") ?
        this.setAttribute("title", "Locally upload images") :
        this.setAttribute("title", "View feed images");
      $("#if-image-upload > *").forEach(function (el) { el.classList.toggle("hide") });
    }
  },
  "#if-file-input": {
    change: function (e) {
      e.stopPropagation();
      //e.preventDefault();
      user.currentImageFeed.capture(e.target.files).then(handleImages);
      $("#upload-imagefeed").classList.toggle("img-view");
      $("#if-image-upload > *").forEach(function (el) { el.classList.toggle("hide") })
    }
  },
  "#if-image-upload": {
    dragenter: function (e) {
      if (!$("#if-image-preview").classList.contains("hide")) return true;
      e.stopPropagation();
      e.preventDefault();
      $("#if-image-upload").classList.add("drag")
    },
    "dragleave dragover drop": function (e) {
      if (!$("#if-image-preview").classList.contains("hide")) return true;
      e.stopPropagation();
      e.preventDefault();
      switch (e.type) {
        case "drop":
          user.currentImageFeed.capture(e.dataTransfer.files).then(handleImages);
          $("#upload-imagefeed").classList.toggle("img-view");
          $("#if-image-upload > *").forEach(function (el) { el.classList.toggle("hide") })
        case "dragleave":
          $("#if-image-upload").classList.remove("drag");
          break
        case "dragover":
          if (!$("#if-image-upload.drag")) $("#if-image-upload").classList.add("drag");
      }
    }
  },
  "#if-fullscreen-toggle": {
    click: function () {
      if ("fullscreen" in this.dataset) {
        document.exitFullscreen();
        this.removeAttribute("data-fullscreen")
      } else {
        $("#if-image-preview").requestFullscreen();
        this.setAttribute("data-fullscreen", "");
        !$("#if-image-preview > img") || $("#if-image-preview > img:not(.hide)").focus()
      }
    }
  }
}, imageUIEvents = function (ix) {
  return {
    ["#if-directory > label:nth-of-type(n+" + (ix+1) + ")"]: {
      click: function (e) {
        var imageFeed = user.currentImageFeed, cur = $("#if-directory > label[contenteditable]"),
            id = this.dataset.imageId, img = $("#if-image-preview > img:nth-of-type(" + (parseInt(id)+1) + ")");
        if (cur) {
          $("#if-image-preview > img:nth-of-type(" + (parseInt(cur.dataset.imageId)+1) + ")").classList.add("hide");
          cur.removeAttribute("contenteditable")
        }
        if (!img.hasAttribute("src")) {
          img.src = SERVICE_WORKERS && imageFeed.images[id].isSeeded ?
            "images/feed-" + imageFeed.id + "/" + id + "." + imageFeed.images[id].ext :
            ( imageFeed.images[id].blobURL = window.URL.createObjectURL( imageFeed.images[id].file ) )
        }
        img.classList.remove("hide");
        this.setAttribute("contenteditable", "");
        if (!cur || cur && cur.dataset.imageId !== id) img.focus();
      },
      keypress: function (e) {
        if (e.which === 13) {
          e.preventDefault();
          this.blur();
          document.getSelection().removeAllRanges();
          $("#if-image-preview > img:nth-of-type(" + (parseInt(this.dataset.imageId)+1) + ")").focus()
        }
      },
      paste: function (e) {
        e.preventDefault();
        e.clipboardData.items[0].getAsString(function (text) {
          document.execCommand("insertText", false, text.replace(/(\r\n|\n|\r)/gm, ""))
        })
      },
      keydown: function (e) {
        if (e.keyCode === 9) {
          e.preventDefault();
          var cur = parseInt($("#if-directory > label[contenteditable]").dataset.imageId),
              tot = parseInt($("#if-directory > label:last-of-type").dataset.imageId) + 1,
              nxt = (cur - 2 * e.shiftKey + 1 + tot) % tot + 1,
              target = $("#if-directory > label:nth-of-type(" + nxt + ")");
          target.dispatchEvent(new Event("click"));
          target.focus();
          document.execCommand("selectAll", false, null)
        }
      },
      dragstart: function (e) {
        e.dataTransfer.setData("text", $("#if-directory > label").indexOf(e.target));
      },
      input: function (e) {
        eventHandler({eventType: "updateImageFeed", value: {
          id: user.currentId,
          imageName: [e.target.dataset.imageId, e.target.textContent]
        }})
      }
    },
    ["#if-image-preview > img:nth-of-type(n+" + (ix+1) + ")"]: {
      focus: function () { imageFocus = true },
      blur: function () {imageFocus = false }
    },
    ["#if-directory > div.label-spacer:nth-of-type(n+" + (ix-!ix+2) + ")"]: {
      dragenter: function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.target.classList.contains("label-spacer")) e.target.classList.add("drag")
      },
      dragleave: function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.target.classList.contains("label-spacer")) e.target.classList.remove("drag")
      },
      "dragover drop": function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.type === "drop") {
          var spacer = e.target,
              ixfrom = parseInt(e.dataTransfer.getData("text")),
              ixto = $("#if-directory > .label-spacer").indexOf(spacer),
              order = Object.keys($("#if-directory > label")).map(Number),
              label = $("#if-directory > label:nth-of-type(" + (ixfrom+1) + ")"),
              img = $("#if-image-preview > img:nth-of-type(" + (ixfrom+1) + ")"),
              targetImg = $("#if-image-preview > img:nth-of-type(" + (ixto+1) + ")");
          order.splice(ixto - (ixto > ixfrom), 0, order.splice(ixfrom, 1)[0]);
          $("#if-directory").insertBefore(label, spacer);
          $("#if-directory").insertBefore($("#if-directory > div.label-spacer:nth-of-type(" + (ixfrom+1) + ")"), label);
          targetImg ? $("#if-image-preview").insertBefore(img, targetImg) : $("#if-image-preview").appendChild(img);
          spacer.classList.remove("drag");
          label.dispatchEvent(new Event("click"));
          eventHandler({ eventType: "updateImageFeed", value: { id: user.currentId, order: order } })
        }
      }
    }
  }
}, ifLabelEvents = {
  click: function () {
    $("#upload-imagefeed").classList.toggle("hide");
    ($("#if-directory > *, #if-image-preview > img") || []).map(function (el) { el.parentNode.removeChild(el) });
    this.setAttribute("data-if-current", "");
    user.currentImageFeed = user.imageFeeds[user.currentId = this.dataset.imagefeedId];
    $("#if-name-field").value = user.currentImageFeed.name;
    !user.currentImageFeed.images.length || handleImages(user.currentImageFeed.images);
    toggleImageFeed();
    !$("#if-image-preview > img") || $("#if-image-preview > img:not(.hide)").focus()
  }
};

function toggleImageFeed () {
  $("#new-imagefeed").classList.toggle("hide");
  $("#delete-imagefeed").classList.toggle("hide");
  $("#publish-imagefeed").classList.toggle("hide");
  $("#return-imagefeed").classList.toggle("hide");
  $("#if-name-field").classList.toggle("hide");
  $("#ifs-manage").classList.toggle("active");
}

function handleImages (images) {
  var label, spacer, img, ix;
  ix = $("#if-directory > *") ? parseInt($("#if-directory > label:last-of-type").dataset.imageId) + 1 : 0;
  if (ix === 0) {
    spacer = $("#stamps > .label-spacer").cloneNode(true);
    $("#if-directory").appendChild(spacer)
  }
  for (var i = 0, j = ix; i < images.length; i++, j++) {
    label = $("#stamps > .image-label").cloneNode(true);
    label.setAttribute("data-image-id", j);
    $("#if-directory").appendChild(label);
    spacer = $("#stamps > .label-spacer").cloneNode(true);
    $("#if-directory").appendChild(spacer);
    label.textContent = user.currentImageFeed.images[j].name;
    img = $("#stamps > .image-element").cloneNode(true);
    img.setAttribute("tabIndex", 0);
    $("#if-image-preview").appendChild(img)
  }
  addEvents(imageUIEvents(ix));
  !j || $("#if-directory > label:nth-of-type(" + (ix+1) + ")").dispatchEvent(new Event("click"))
}
