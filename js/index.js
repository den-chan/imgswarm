var uiEvents = {
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
};

function loadUser(response) {
  if (response) {
    window.user = response.userObject;
    $("div#auth > button").classList.add("hide");
    $("#user-menu").classList.remove("hide");
    $("div#auth > button").textContent = "Log out";
    $("#user-menu").textContent = response.userid
  }
  else console.log(response);
}