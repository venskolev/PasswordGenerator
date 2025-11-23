// /js/script.js

"use strict";

/*
  SecurePass Password Generator
  -----------------------------
  • Generates strong passwords using secure random (crypto.getRandomValues).
  • Keeps existing UI behavior and animations.
  • All user-facing text is in English.
*/

let currentPassword = "";
let animationTimeoutId = null;

// --------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

const lengthSlider = $("lengthSlider");
const lengthValue = $("lengthValue");
const generateBtn = $("generateBtn");
const copyBtn = $("copyBtn");
const reloadBtn = $("reloadBtn");
const passwordText = $("passwordText");
const passwordDisplay = $("passwordDisplay");
const strengthIndicator = $("strengthIndicator");
const strengthFill = $("strengthFill");
const strengthText = $("strengthText");
const notification = $("notification");
const notificationIcon = $("notificationIcon");
const notificationText = $("notificationText");
const animationContainer = $("animation-container");
const options = $("options");

// Checkboxes (kept by id for compatibility)
const uppercaseCheckbox = $("uppercase");
const lowercaseCheckbox = $("lowercase");
const numbersCheckbox = $("numbers");
const symbolsCheckbox = $("symbols");

// --------- Character sets ----------
const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_-+=[]{}|;:,.<>?"
};

const ANIMATION_CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_-+=";

// --------- Secure random helpers ----------
function getSecureRandomInt(maxExclusive) {
  // Returns integer in [0, maxExclusive)
  // Uses rejection sampling to avoid modulo bias.
  if (maxExclusive <= 0) return 0;

  const uint32Max = 0xffffffff;
  const limit = uint32Max - (uint32Max % maxExclusive);
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const value = buffer[0];
    if (value < limit) return value % maxExclusive;
  }
}

function securePickOne(str) {
  return str[getSecureRandomInt(str.length)];
}

// --------- Animation (random rolling string) ----------
function generateRandomString(length, charset) {
  let result = "";
  const n = charset.length;
  for (let i = 0; i < length; i++) {
    result += charset[getSecureRandomInt(n)];
  }
  return result;
}

function animateRandomString() {
  const frameDurationMs = 150;
  const charactersPerFrame = 12;

  animationContainer.textContent = generateRandomString(
    charactersPerFrame,
    ANIMATION_CHARSET
  );

  animationTimeoutId = setTimeout(animateRandomString, frameDurationMs);
}

function stopAnimation() {
  if (animationTimeoutId) {
    clearTimeout(animationTimeoutId);
    animationTimeoutId = null;
  }
}

// --------- Password generation ----------
function buildSelectedCharsets() {
  const activeSets = [];
  if (uppercaseCheckbox?.checked) activeSets.push(CHARSETS.uppercase);
  if (lowercaseCheckbox?.checked) activeSets.push(CHARSETS.lowercase);
  if (numbersCheckbox?.checked) activeSets.push(CHARSETS.numbers);
  if (symbolsCheckbox?.checked) activeSets.push(CHARSETS.symbols);
  return activeSets;
}

function generatePasswordFromSets(length, sets) {
  // Ensures at least 1 char from each selected set, if length allows.
  const requiredCount = sets.length;
  if (requiredCount === 0) return "";

  const passwordChars = [];

  // 1) Add one guaranteed char from each selected set
  for (const set of sets) {
    passwordChars.push(securePickOne(set));
  }

  // 2) Fill the rest from the union
  const union = sets.join("");
  for (let i = requiredCount; i < length; i++) {
    passwordChars.push(securePickOne(union));
  }

  // 3) Secure shuffle (Fisher–Yates)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}

function generatePassword() {
  stopAnimation();

  const length = parseInt(lengthSlider.value, 10);
  const sets = buildSelectedCharsets();

  if (sets.length === 0) {
    showNotification("Please select at least one character type!", "error");
    animateRandomString();
    return;
  }

  const password = generatePasswordFromSets(length, sets);

  currentPassword = password;
  passwordText.textContent = password;
  passwordText.classList.remove("password-placeholder");
  passwordDisplay.classList.add("clickable");

  // Hide rolling animation + options
  animationContainer.style.display = "none";
  options.style.display = "none";

  // Toggle buttons
  generateBtn.style.display = "none";
  copyBtn.style.display = "flex";
  reloadBtn.style.display = "flex";

  calculateStrength(password);
  animatePasswordDisplay();
}

// --------- Strength calculation ----------
function calculateStrength(password) {
  let score = 0;
  const length = password.length;

  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  const percentage = (score / 7) * 100;
  strengthFill.style.width = `${percentage}%`;

  if (percentage < 40) {
    strengthFill.style.background = "linear-gradient(90deg, #f56565, #fc8181)";
    strengthText.textContent = "Weak password";
    strengthText.style.color = "#f56565";
  } else if (percentage < 70) {
    strengthFill.style.background = "linear-gradient(90deg, #ed8936, #f6ad55)";
    strengthText.textContent = "Medium strength";
    strengthText.style.color = "#ed8936";
  } else {
    strengthFill.style.background = "linear-gradient(90deg, #48bb78, #68d391)";
    strengthText.textContent = "Strong password";
    strengthText.style.color = "#48bb78";
  }

  strengthIndicator.classList.add("show");
}

// --------- UI micro-animations ----------
function animatePasswordDisplay() {
  passwordDisplay.style.animation = "none";
  setTimeout(() => {
    passwordDisplay.style.animation = "fadeIn 0.4s ease";
  }, 10);
}

// --------- Clipboard ----------
async function copyToClipboard() {
  if (!currentPassword) {
    showNotification("No password generated yet!", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(currentPassword);
    showNotification("Password copied to clipboard!", "success");
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = currentPassword;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      showNotification("Password copied to clipboard!", "success");
    } catch (fallbackErr) {
      showNotification("Copy failed. Please copy manually.", "error");
      console.error("[SecurePass] Clipboard fallback failed:", fallbackErr);
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

// --------- Notifications ----------
function showNotification(message, type) {
  notificationText.textContent = message;
  notification.className = `notification ${type}`;
  notificationIcon.textContent = type === "success" ? "✓" : "⚠";
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

// --------- Page reload ----------
function reloadPage() {
  location.reload();
}

// --------- Init / event wiring ----------
function init() {
  // Start animation on load
  animateRandomString();

  // Slider label update
  lengthSlider.addEventListener("input", (e) => {
    lengthValue.textContent = e.target.value;
  });

  // Buttons
  generateBtn.addEventListener("click", generatePassword);
  copyBtn.addEventListener("click", copyToClipboard);
  reloadBtn.addEventListener("click", reloadPage);

  // Copy on clicking password
  passwordDisplay.addEventListener("click", () => {
    if (currentPassword) copyToClipboard();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
