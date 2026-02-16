chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: "dashboard.html",
    type: "popup",
    width: 1000,
    height: 700,
    focused: true
  });
});
