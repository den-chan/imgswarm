var preview, uiEvents = {
  "": {
    load: function () {
      preview = $("#if-image-preview");
      preview.requestFullscreen =
        preview.requestFullscreen ||
        preview.webkitRequestFullscreen ||
        preview.mozRequestFullScreen;
      document.exitFullscreen = 
        document.exitFullscreen ||
        document.webkitExitFullScreen ||
        document.webkitCancelFullScreen ||
        document.mozCancelFullScreen
    }
  },
  "#new-imagefeed": {
    click: function () {
      $("#ifs-manage").classList.toggle("active");
      $("#new-imagefeed").classList.toggle("hide");
      $("#cancel-actions-imagefeed").classList.toggle("hide");
      $("#if-designate-name").classList.toggle("hide")
    }
  },
  "#orphan-imagefeed": {
    click: function () {}
  },
  "#cancel-actions-imagefeed": {
    click: function () {
      $("#ifs-manage").classList.toggle("active");
      $("#new-imagefeed").classList.toggle("hide");
      $("#cancel-actions-imagefeed").classList.toggle("hide");
      $("#if-designate-name").classList.toggle("hide")
    }
  },
  "#upload-imagefeed": {
    click: function () {
      $("#if-image-upload > *").forEach(function (el) { el.classList.toggle("hide") });
    }
  },
  "#if-file-input": {
    change: function (e) {
      e.stopPropagation();
      e.preventDefault();
      handleFiles(e.target.files)
    }
  },
  "#if-image-upload": {
    dragenter: function (e) {
      e.stopPropagation();
      e.preventDefault();
      $("#if-image-upload").classList.add("drag")
    },
    "dragleave dragover drop": function (e) {
      e.stopPropagation();
      e.preventDefault();
      switch (e.type) {
        case "drop":
          handleFiles(e.dataTransfer.files);
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
        preview.requestFullscreen();
        this.setAttribute("data-fullscreen", "");
        $("#if-image-preview > img:not(.hide)").focus()
      }
    }
  }
}

var user, imageFeed;
function loadUser (response) {
  if (!response) return $("#address").textContent = "Not logged in."
  user = response.userObject;
  $("#address").textContent = user.address
}

function handleFiles (files) {
  if (imageFeed) imageFeed.capture(files);
  else imageFeed = new ImageFeed(files);
  var label, spacer, img, ix;
  ix = $("#if-directory > *") ? parseInt($("#if-directory > label:last-of-type").dataset.imageId) + 1 : 0;
  if (ix === 0) {
    spacer = $("#stamps > .label-spacer").cloneNode(true);
    $("#if-directory").appendChild(spacer)
  }
  for (var i = 0, j = ix; i < files.length; i++, j++) {
    label = $("#stamps > .image-label").cloneNode(true);
    label.setAttribute("data-image-id", j);
    $("#if-directory").appendChild(label);
    spacer = $("#stamps > .label-spacer").cloneNode(true);
    $("#if-directory").appendChild(spacer);
    label.textContent = imageFeed.files[j].name;
    img = $("#stamps > .image-element").cloneNode(true);
    img.setAttribute("tabIndex", 0);
    $("#if-image-preview").appendChild(img)
  }
  addEvents({
    ["#if-directory > label:nth-of-type(n+" + (ix+1) + ")"]: {
      click: function (e) {
        var cur = $("#if-directory > label[contenteditable]"),
            id = parseInt(this.dataset.imageId), img = $("#if-image-preview > img:nth-of-type(" + (id+1) + ")");
        if (cur) {
          $("#if-image-preview > img:nth-of-type(" + (parseInt(cur.dataset.imageId)+1) + ")").classList.add("hide");
          cur.removeAttribute("contenteditable")
        }
        if (!imageFeed.urls[id]) img.src = imageFeed.urls[id] = window.URL.createObjectURL( imageFeed.files[id] );
        img.classList.remove("hide");
        this.setAttribute("contenteditable", "");
        if (!cur || cur && parseInt(cur.dataset.imageId) !== id) img.focus();
      },
      keypress: function (e) {
        if (e.which === 13) {
          e.preventDefault();
          this.blur();
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
      }
    },
    ["#if-image-preview > img:nth-of-type(n+" + (ix+1) + ")"]: {
      focus: function () {
        window.addEventListener("keydown", imageNavCallback, false)
      },
      blur: function () {
        window.removeEventListener("keydown", imageNavCallback, false)
      }
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
          var ix = parseInt(e.dataTransfer.getData("text")),
              spacer = e.target,
              label = $("#if-directory > label:nth-of-type(" + (ix+1) + ")"),
              img = $("#if-image-preview > img:nth-child(" + (ix+1) + ")"),
              targetImg = $("#if-image-preview > img:nth-of-type(" + (ix+1) + ")");
          $("#if-directory").insertBefore(label, spacer);
          $("#if-directory").insertBefore($("#if-directory > div.label-spacer:nth-of-type(" + (ix+1) + ")"), label);
          targetImg ? $("#if-image-preview").insertBefore(img, targetImg) : $("#if-image-preview").appendChild(img);
          spacer.classList.remove("drag")
        }
      }
    }
  });
  function imageNavCallback (e) {
    var w = e.which;
    if (w !== 37 && w !== 39) return false;
    window.getSelection().removeAllRanges();
    var cur = $("#if-directory > label").indexOf($("#if-directory > label[contenteditable]")),
        tot = $("#if-directory > label").length,
        nxt = (cur + w - 38 + tot) % tot + 1;
    $("#if-directory > label:nth-of-type(" + nxt + ")").dispatchEvent(new Event("click"));
    $("#if-image-preview > img:nth-of-type(" + nxt + ")").focus();
    var top = $("#if-directory > [contenteditable]").offsetTop - $("#if-directory").offsetTop,
        hgt = $("#if-directory > [contenteditable]").offsetHeight - $("#if-directory").offsetHeight;
    $("#if-directory").scrollTop = Math.max(Math.min($("#if-directory").scrollTop, top), top + hgt)
  };

  $("#upload-imagefeed").classList.toggle("hide")
  $("#if-image-upload > *").forEach(function (el) { el.classList.toggle("hide") });
  $("#if-directory > label:nth-of-type(" + (ix+1) + ")").dispatchEvent(new Event("click"))
  // ready to seed: sendMessage({messageType: "updateImageFeeds", value: x})
}

function ImageFeed (initFiles) {
  this.files = [];
  this.urls = []
  
  this.capture = function (files) {
    for (var i = 0; i < files.length; i++) {
      this.files.push(files[i]);
      user.imageFeeds[i] = files[i]
    }
  }
  this.capture(initFiles);
}