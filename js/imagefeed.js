var uiEvents = {
  "#toggle-nav": {
    click: function () {
      this.classList.toggle("plus");
      this.classList.toggle("minus")
    }
  }
}

var user;
function loadUser (response) {
  user = response.userObject
}