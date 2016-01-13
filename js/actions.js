var uiEvents = {
  "#new-imagefeed": {
    click: function () {
      $("#ifs-manage").classList.toggle("active");
      $("#new-imagefeed").classList.toggle("hide");
      $("#cancel-actions-imagefeed").classList.toggle("hide")
    }
  },
  "#orphan-imagefeed": {
    click: function () {}
  },
  "#cancel-actions-imagefeed": {
    click: function () {
      $("#ifs-manage").classList.toggle("active");
      $("#new-imagefeed").classList.toggle("hide");
      $("#cancel-actions-imagefeed").classList.toggle("hide")
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
          $("#if-image-upload").classList.remove("drag")
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
  imageFeed = new ImageFeed(files);
  var label, ix;
  ix = $("#if-directory > *") ? parseInt($("#if-directory > :last-child").dataset.imageid) + 1 : 0;
  for (var i = 0, j = ix; i < files.length; i++, j++) {
    label = $("#stamps > .image-label").cloneNode(true);
    label.setAttribute("data-imageid", j);
    $("#if-directory").appendChild(label);
    label.textContent = imageFeed.files[j].name
  }
  var evts = {};
  evts["#if-directory > :nth-child(n+" + (ix+1) + ")"] = {
    click: function () {
      var img = $("#if-image-preview > img"), ix = this.dataset.imageid;
      img.src = imageFeed.urls[ix] = imageFeed.urls[ix] || window.URL.createObjectURL( imageFeed.files[ix] )
    }
  };
  addEvents(evts);
  $("#if-image-upload > *").forEach(function (el) { el.classList.toggle("hide") });
  $("#if-directory > :nth-child(" + (ix+1) + ")").dispatchEvent(new Event("click"))
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