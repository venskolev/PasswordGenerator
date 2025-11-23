// /extension/popup.js
// Simple and clean popup controller for SecurePass extension

document.addEventListener("DOMContentLoaded", () => {
  const openAppBtn = document.getElementById("openAppBtn");

  if (!openAppBtn) {
    console.error("[SecurePass] openAppBtn not found in popup.html");
    return;
  }

  openAppBtn.addEventListener("click", () => {
    try {
      chrome.tabs.create({
        url: "https://secure-pass.app"
      });
    } catch (err) {
      console.error("[SecurePass] Failed to open tab:", err);
      window.open("https://secure-pass.app", "_blank");
    }
  });
});
