function service () {
  eventHandler({ eventType: "checklogin" }).then(loadUser);
}

var uiEvents = {
  "div#auth > button": {
    click: function () {
      if (this.textContent === "Log in") $("#modal").classList.remove("hide");
      else if (this.textContent === "Log out") {
        $("div#auth > button").classList.remove("softhide");
        $("#user-menu").classList.add("hide");
        $("div#auth > button").textContent = "Log in";
        $("#actions-link").textContent = null;
        return eventHandler({ eventType: "logout" }).then(function (response) {
          if (response.value !== "success") console.log("Couldn't log out", response); //Errorify
          else user = null
        })
      }
    }
  },
  "button#existing-user": {
    click: function () {
      $("#modal").classList.add("hide")
      return eventHandler({
        eventType: "login",
        value: {handle: $("#username").value, password: prompt("Please enter your password")}
      }).then(loadUser)
    }
  },
  "button#new-user": {
    click: function () {
      return eventHandler({ eventType: "checkunique", value: { handle: $("#username").value } }).then(function (response) {
        if (response.value) {
          eventHandler({
            eventType: "createuser",
            value: { password: prompt("Please enter your password") }
          }).then(loadUser)
        }
        $("#modal").classList.add("hide")
      })
    }
  }
};

function loadUser (response) {
  if (response.value) {
    $("div#auth > button").classList.add("softhide");
    $("#user-menu").classList.remove("hide");
    $("div#auth > button").textContent = "Log out";
    $("#actions-link").textContent = response.value.userid
  }
  else console.log(response.value);
}