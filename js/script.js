"use strict";

/*
  SecurePass Password Generator - Advanced Edition
  -----------------------------
  • Generates strong passwords using secure random (crypto.getRandomValues).
  • Matrix-style continuous scrambling animation.
  • 128-Character Ultimate Security option.
  • AES-256 Encrypted Local Vault (Web Crypto API).
  • Fully localized in English for international use (e.g., DE/Global).
*/

// --------- State Variables ----------
let currentPassword = "";
let isScrambling = true;
let scrambleIntervalId = null;

// Vault State
let hasVault = false;
let isVaultUnlocked = false;
let masterPasswordKey = "";
let vaultItems = [];

// --------- DOM Helpers ----------
const $ = (id) => document.getElementById(id);

// Main Generator Elements
const lengthSlider = $("lengthSlider");
const lengthValue = $("lengthValue");
const generateBtn = $("generateBtn");
const generateBtnText = $("generateBtnText");
const generateBtnIcon = $("generateBtnIcon");
const maxSecurityBtn = $("maxSecurityBtn");
const copyBtn = $("copyBtn");
const reloadBtn = $("reloadBtn"); // Kept if you still have it in HTML, but we won't use it for reload anymore
const saveVaultBtn = $("saveVaultBtn");
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

// Checkboxes
const uppercaseCheckbox = $("uppercase");
const lowercaseCheckbox = $("lowercase");
const numbersCheckbox = $("numbers");
const symbolsCheckbox = $("symbols");

// Vault Top Controls
const vaultControls = $("vaultControls");
const openVaultBtn = $("openVaultBtn");
const lockVaultBtn = $("lockVaultBtn");

// Modals
const modalOverlay = $("modalOverlay");
const closeModalBtn = $("closeModalBtn");
const setupVaultModal = $("setupVaultModal");
const unlockVaultModal = $("unlockVaultModal");
const savePasswordModal = $("savePasswordModal");
const viewVaultModal = $("viewVaultModal");
const vaultItemsContainer = $("vaultItemsContainer");

// Modal Inputs & Buttons
const setupMasterPassword = $("setupMasterPassword");
const submitSetupVaultBtn = $("submitSetupVaultBtn");

const unlockMasterPassword = $("unlockMasterPassword");
const submitUnlockVaultBtn = $("submitUnlockVaultBtn");

const saveWebsiteInput = $("saveWebsiteInput");
const saveUsernameInput = $("saveUsernameInput");
const savePasswordInput = $("savePasswordInput");
const submitSavePasswordBtn = $("submitSavePasswordBtn");


// --------- Character Sets ----------
const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-="
};


// --------- Web Crypto API (AES-256-GCM) ----------
const cryptoUtils = {
  bufferToBase64: (buffer) => btoa(String.fromCharCode.apply(null, new Uint8Array(buffer))),
  base64ToBuffer: (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0)),

  deriveKey: async (password, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  encryptData: async (data, password) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await cryptoUtils.deriveKey(password, salt);
    const enc = new TextEncoder();
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(JSON.stringify(data))
    );

    return {
      salt: cryptoUtils.bufferToBase64(salt),
      iv: cryptoUtils.bufferToBase64(iv),
      ciphertext: cryptoUtils.bufferToBase64(ciphertext)
    };
  },

  decryptData: async (encryptedPackage, password) => {
    try {
      const salt = cryptoUtils.base64ToBuffer(encryptedPackage.salt);
      const iv = cryptoUtils.base64ToBuffer(encryptedPackage.iv);
      const ciphertext = cryptoUtils.base64ToBuffer(encryptedPackage.ciphertext);
      const key = await cryptoUtils.deriveKey(password, salt);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } catch (e) {
      throw new Error("Incorrect master password or corrupted data");
    }
  }
};


// --------- Secure Random Helpers ----------
function getSecureRandomInt(maxExclusive) {
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


// --------- Animation (Matrix Scrambling) ----------
function buildSelectedCharsets() {
  let available = "";
  if (uppercaseCheckbox.checked) available += CHARSETS.uppercase;
  if (lowercaseCheckbox.checked) available += CHARSETS.lowercase;
  if (numbersCheckbox.checked) available += CHARSETS.numbers;
  if (symbolsCheckbox.checked) available += CHARSETS.symbols;
  return available;
}

function startScrambling() {
  isScrambling = true;
  generateBtnText.textContent = "Generate & Lock";
  generateBtnIcon.textContent = "🛡️";
  copyBtn.disabled = true;
  saveVaultBtn.disabled = true;
  
  if (animationContainer) animationContainer.style.display = "none";
  passwordText.classList.remove("password-placeholder");

  if (scrambleIntervalId) clearInterval(scrambleIntervalId);

  scrambleIntervalId = setInterval(() => {
    const charset = buildSelectedCharsets();
    if (!charset) {
      passwordText.textContent = "Select options...";
      return;
    }
    const len = parseInt(lengthSlider.value, 10);
    let randomStr = "";
    for (let i = 0; i < len; i++) {
      randomStr += charset[Math.floor(Math.random() * charset.length)];
    }
    passwordText.textContent = randomStr;
    passwordText.style.color = "rgba(167, 139, 250, 0.7)"; // Faded purple
    
    // Reset strength indicator while calculating
    strengthFill.style.width = `0%`;
    strengthText.textContent = "Calculating...";
    strengthText.style.color = "#8b5cf6";
    strengthIndicator.classList.add("show");
  }, 40);
}

function stopScrambling() {
  isScrambling = false;
  if (scrambleIntervalId) {
    clearInterval(scrambleIntervalId);
    scrambleIntervalId = null;
  }
  generateBtnText.textContent = "Restart Generator";
  generateBtnIcon.textContent = "🔄";
  copyBtn.disabled = false;
  saveVaultBtn.disabled = false;
  passwordText.style.color = "#ffffff"; // Bright white
}


// --------- Password Generation ----------
function generatePassword() {
  const length = parseInt(lengthSlider.value, 10);
  let availableChars = "";
  let guaranteedChars = "";

  if (uppercaseCheckbox.checked) {
    availableChars += CHARSETS.uppercase;
    guaranteedChars += securePickOne(CHARSETS.uppercase);
  }
  if (lowercaseCheckbox.checked) {
    availableChars += CHARSETS.lowercase;
    guaranteedChars += securePickOne(CHARSETS.lowercase);
  }
  if (numbersCheckbox.checked) {
    availableChars += CHARSETS.numbers;
    guaranteedChars += securePickOne(CHARSETS.numbers);
  }
  if (symbolsCheckbox.checked) {
    availableChars += CHARSETS.symbols;
    guaranteedChars += securePickOne(CHARSETS.symbols);
  }

  if (availableChars.length === 0) {
    showNotification("Please select at least one character type!", "error");
    startScrambling();
    return;
  }

  const remainingLength = length - guaranteedChars.length;
  let finalGenerated = guaranteedChars;
  
  for (let i = 0; i < remainingLength; i++) {
    finalGenerated += securePickOne(availableChars);
  }

  // Shuffle
  let passwordArray = finalGenerated.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  currentPassword = passwordArray.join("");
  passwordText.textContent = currentPassword;
  
  calculateStrength(currentPassword);
  animatePasswordDisplay();
}

function toggleGenerator() {
  if (isScrambling) {
    stopScrambling();
    generatePassword();
  } else {
    startScrambling();
  }
}

// --------- 128-Char Max Security ----------
function generateMaxSecurity() {
  lengthSlider.value = 128;
  lengthValue.textContent = 128;
  uppercaseCheckbox.checked = true;
  lowercaseCheckbox.checked = true;
  numbersCheckbox.checked = true;
  symbolsCheckbox.checked = true;

  stopScrambling();
  generatePassword();
  showNotification("128-Character Ultimate Security generated!", "success");
}

// --------- Strength Calculation ----------
function calculateStrength(password) {
  let poolSize = 0;
  if (uppercaseCheckbox.checked) poolSize += 26;
  if (lowercaseCheckbox.checked) poolSize += 26;
  if (numbersCheckbox.checked) poolSize += 10;
  if (symbolsCheckbox.checked) poolSize += 30;

  if (poolSize === 0) return;

  const entropy = password.length * Math.log2(poolSize);
  let percentage = 0;
  let color = "";
  let text = "";

  if (entropy < 40) {
    percentage = 25;
    color = "linear-gradient(90deg, #f56565, #fc8181)";
    text = "Weak";
  } else if (entropy < 60) {
    percentage = 50;
    color = "linear-gradient(90deg, #ed8936, #f6ad55)";
    text = "Medium";
  } else if (entropy < 80) {
    percentage = 75;
    color = "linear-gradient(90deg, #ecc94b, #f6e05e)";
    text = "Strong";
  } else {
    percentage = 100;
    color = "linear-gradient(90deg, #48bb78, #68d391)";
    text = "Ultimate Security";
  }

  strengthFill.style.width = `${percentage}%`;
  strengthFill.style.background = color;
  strengthText.textContent = text;
  strengthText.style.color = color.split(',')[1].trim().replace(')', ''); // rough extract of color
}


// --------- UI Micro-animations ----------
function animatePasswordDisplay() {
  passwordDisplay.style.animation = "none";
  setTimeout(() => {
    passwordDisplay.style.animation = "fadeIn 0.4s ease";
  }, 10);
}


// --------- Clipboard ----------
async function copyToClipboard() {
  if (!currentPassword || isScrambling) {
    showNotification("Generate a password first!", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(currentPassword);
    showNotification("Copied to clipboard!", "success");
  } catch (err) {
    const textarea = document.createElement("textarea");
    textarea.value = currentPassword;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      showNotification("Copied to clipboard!", "success");
    } catch (fallbackErr) {
      showNotification("Copy failed.", "error");
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


// ==========================================
// --------- VAULT LOGIC & MODALS -----------
// ==========================================

function checkVaultStatus() {
  const savedVault = localStorage.getItem('secure_vault');
  hasVault = !!savedVault;
  updateVaultUI();
}

function updateVaultUI() {
  if (isVaultUnlocked) {
    openVaultBtn.innerHTML = "🗄️ Open Vault";
    lockVaultBtn.style.display = "inline-block";
  } else {
    lockVaultBtn.style.display = "none";
    if (hasVault) {
      openVaultBtn.innerHTML = "🔓 Unlock Vault";
    } else {
      openVaultBtn.innerHTML = "🗄️ Create Vault";
    }
  }
}

// Modal Management
function hideAllModals() {
  setupVaultModal.style.display = "none";
  unlockVaultModal.style.display = "none";
  savePasswordModal.style.display = "none";
  viewVaultModal.style.display = "none";
  modalOverlay.style.display = "none";
  
  // Clear sensitive inputs
  setupMasterPassword.value = "";
  unlockMasterPassword.value = "";
}

function showModal(modalElement) {
  hideAllModals();
  modalOverlay.style.display = "flex";
  modalElement.style.display = "block";
}

// Handlers
openVaultBtn.addEventListener("click", () => {
  if (isVaultUnlocked) {
    renderVaultItems();
    showModal(viewVaultModal);
  } else if (hasVault) {
    showModal(unlockVaultModal);
  } else {
    showModal(setupVaultModal);
  }
});

lockVaultBtn.addEventListener("click", () => {
  isVaultUnlocked = false;
  masterPasswordKey = "";
  vaultItems = [];
  updateVaultUI();
  showNotification("Vault locked securely.", "info");
});

saveVaultBtn.addEventListener("click", () => {
  if (isScrambling || !currentPassword) {
    showNotification("Generate a password first!", "error");
    return;
  }
  if (!hasVault) {
    showModal(setupVaultModal);
  } else if (!isVaultUnlocked) {
    showModal(unlockVaultModal);
  } else {
    savePasswordInput.value = currentPassword;
    saveWebsiteInput.value = "";
    saveUsernameInput.value = "";
    showModal(savePasswordModal);
  }
});

closeModalBtn.addEventListener("click", hideAllModals);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) hideAllModals();
});

// Setup Vault Action
submitSetupVaultBtn.addEventListener("click", async () => {
  const pass = setupMasterPassword.value;
  if (pass.length < 8) {
    showNotification("Master password must be at least 8 characters.", "error");
    return;
  }
  try {
    const emptyVault = [];
    const encryptedPackage = await cryptoUtils.encryptData(emptyVault, pass);
    localStorage.setItem('secure_vault', JSON.stringify(encryptedPackage));
    masterPasswordKey = pass;
    vaultItems = emptyVault;
    hasVault = true;
    isVaultUnlocked = true;
    updateVaultUI();
    hideAllModals();
    showNotification("Vault created and unlocked!", "success");
  } catch (err) {
    showNotification("Encryption error occurred.", "error");
  }
});

// Unlock Vault Action
submitUnlockVaultBtn.addEventListener("click", async () => {
  const pass = unlockMasterPassword.value;
  try {
    const savedVault = JSON.parse(localStorage.getItem('secure_vault'));
    const decryptedData = await cryptoUtils.decryptData(savedVault, pass);
    masterPasswordKey = pass;
    vaultItems = decryptedData;
    isVaultUnlocked = true;
    updateVaultUI();
    hideAllModals();
    showNotification("Vault unlocked successfully!", "success");
  } catch (err) {
    showNotification("Incorrect master password!", "error");
  }
});

// Save to Vault Action
submitSavePasswordBtn.addEventListener("click", async () => {
  const site = saveWebsiteInput.value.trim();
  const user = saveUsernameInput.value.trim();
  const pass = savePasswordInput.value;

  if (!site) {
    showNotification("Please enter a site or app name.", "error");
    return;
  }

  const newItem = {
    id: Date.now(),
    website: site,
    username: user,
    password: pass,
    date: new Date().toLocaleString('en-US')
  };

  const newVaultItems = [newItem, ...vaultItems];
  
  try {
    const encryptedPackage = await cryptoUtils.encryptData(newVaultItems, masterPasswordKey);
    localStorage.setItem('secure_vault', JSON.stringify(encryptedPackage));
    vaultItems = newVaultItems;
    hideAllModals();
    showNotification("Password encrypted and saved!", "success");
  } catch (err) {
    showNotification("Error saving password.", "error");
  }
});

// Render Vault Items
function renderVaultItems() {
  vaultItemsContainer.innerHTML = "";
  
  if (vaultItems.length === 0) {
    vaultItemsContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 20px;">The vault is empty.</div>`;
    return;
  }

  vaultItems.forEach(item => {
    const el = document.createElement("div");
    el.style.background = "rgba(30, 41, 59, 0.5)";
    el.style.border = "1px solid rgba(255,255,255,0.05)";
    el.style.borderRadius = "12px";
    el.style.padding = "15px";
    
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div>
          <h4 style="color: white; margin: 0; font-size: 1.1rem;">${escapeHTML(item.website)}</h4>
          ${item.username ? `<p style="color: #94a3b8; margin: 2px 0 0 0; font-size: 0.85rem;">${escapeHTML(item.username)}</p>` : ''}
        </div>
        <button class="delete-vault-btn" data-id="${item.id}" style="background: none; border: none; color: #f87171; cursor: pointer; padding: 5px;">🗑️</button>
      </div>
      <div style="display: flex; gap: 10px; background: rgba(15, 23, 42, 0.8); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
        <span style="flex: 1; font-family: monospace; color: #34d399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(item.password)}</span>
        <button class="copy-vault-btn" data-pass="${escapeHTML(item.password)}" style="background: rgba(255,255,255,0.1); border: none; color: white; border-radius: 4px; cursor: pointer; padding: 0 10px;">📋</button>
      </div>
      <div style="text-align: right; color: #64748b; font-size: 0.7rem; margin-top: 8px;">Saved on: ${item.date}</div>
    `;
    vaultItemsContainer.appendChild(el);
  });

  // Attach event listeners for delete and copy within vault
  document.querySelectorAll(".delete-vault-btn").forEach(btn => {
    btn.addEventListener("click", (e) => deleteVaultItem(parseInt(e.currentTarget.getAttribute("data-id"))));
  });

  document.querySelectorAll(".copy-vault-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const pass = e.currentTarget.getAttribute("data-pass");
      navigator.clipboard.writeText(pass)
        .then(() => showNotification("Password copied from vault!", "success"))
        .catch(() => showNotification("Copy failed.", "error"));
    });
  });
}

async function deleteVaultItem(id) {
  const newVaultItems = vaultItems.filter(item => item.id !== id);
  try {
    const encryptedPackage = await cryptoUtils.encryptData(newVaultItems, masterPasswordKey);
    localStorage.setItem('secure_vault', JSON.stringify(encryptedPackage));
    vaultItems = newVaultItems;
    renderVaultItems(); // re-render
    showNotification("Record deleted.", "info");
  } catch (err) {
    showNotification("Error deleting record.", "error");
  }
}

// Basic HTML escaper to prevent XSS in vault display
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}


// --------- Init / Event Wiring ----------
function init() {
  // Hide old animation container as we use modern scrambling on the text directly
  if (animationContainer) animationContainer.style.display = "none";
  
  // Slider label update
  lengthSlider.addEventListener("input", (e) => {
    lengthValue.textContent = e.target.value;
    if(isScrambling) return;
    startScrambling(); // Restart scrambling if options change
  });

  // Checkboxes change -> restart scrambling
  const restartOnOptionChange = () => { if(!isScrambling) startScrambling(); };
  uppercaseCheckbox.addEventListener("change", restartOnOptionChange);
  lowercaseCheckbox.addEventListener("change", restartOnOptionChange);
  numbersCheckbox.addEventListener("change", restartOnOptionChange);
  symbolsCheckbox.addEventListener("change", restartOnOptionChange);

  // Buttons
  generateBtn.addEventListener("click", toggleGenerator);
  maxSecurityBtn.addEventListener("click", generateMaxSecurity);
  copyBtn.addEventListener("click", copyToClipboard);
  
  // Copy on clicking password display
  passwordDisplay.addEventListener("click", () => {
    if (!isScrambling && currentPassword) copyToClipboard();
  });

  // Check Vault
  checkVaultStatus();

  // Start Matrix Animation immediately
  startScrambling();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}