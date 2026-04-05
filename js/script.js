"use strict";

/*
  SecurePass v2
  -----------------------------
  • Cryptographically secure password generation (Web Crypto API)
  • Matrix-style scrambling preview
  • 128-character ultimate security generator
  • AES-256-GCM encrypted local vault
  • Accessible modal, toast, and toggle controls
*/

// -------------------------------------
// Icons
// -------------------------------------
const ICONS = {
  shield: `
    <svg viewBox="0 0 24 24" class="icon icon-md" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3Zm0 18.88C8.98 19.8 6 15.73 6 11V6.37l6-2.25 6 2.25V11c0 4.73-2.98 8.8-6 9.88Zm3.71-11.59-4.3 4.3-1.82-1.82-1.42 1.41 3.24 3.24 5.72-5.71-1.42-1.42Z" />
    </svg>
  `,
  refresh: `
    <svg viewBox="0 0 24 24" class="icon icon-md" aria-hidden="true">
      <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 12.65-5.65Z" />
    </svg>
  `,
  check: `
    <svg viewBox="0 0 24 24" class="icon icon-sm" aria-hidden="true">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41Z" />
    </svg>
  `,
  alert: `
    <svg viewBox="0 0 24 24" class="icon icon-sm" aria-hidden="true">
      <path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
    </svg>
  `,
  info: `
    <svg viewBox="0 0 24 24" class="icon icon-sm" aria-hidden="true">
      <path d="M11 9h2V7h-2v2Zm0 8h2v-6h-2v6Zm1-15a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
    </svg>
  `,
  trash: `
    <svg viewBox="0 0 24 24" class="icon icon-sm" aria-hidden="true">
      <path d="M16 9v10H8V9h8Zm-1.5-6-1 1h-3l-1-1H5v2h14V3h-4.5ZM18 7H6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7Z" />
    </svg>
  `,
  copy: `
    <svg viewBox="0 0 24 24" class="icon icon-sm" aria-hidden="true">
      <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z" />
    </svg>
  `
};

// -------------------------------------
// Crypto helpers
// -------------------------------------
const cryptoUtils = {
  bufferToBase64(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
  },

  base64ToBuffer(base64) {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  },

  async deriveKey(password, salt) {
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
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  async encryptData(data, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await cryptoUtils.deriveKey(password, salt);
    const enc = new TextEncoder();

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(JSON.stringify(data))
    );

    return {
      salt: cryptoUtils.bufferToBase64(salt),
      iv: cryptoUtils.bufferToBase64(iv),
      ciphertext: cryptoUtils.bufferToBase64(ciphertext)
    };
  },

  async decryptData(encryptedPackage, password) {
    try {
      const salt = cryptoUtils.base64ToBuffer(encryptedPackage.salt);
      const iv = cryptoUtils.base64ToBuffer(encryptedPackage.iv);
      const ciphertext = cryptoUtils.base64ToBuffer(encryptedPackage.ciphertext);
      const key = await cryptoUtils.deriveKey(password, salt);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } catch (error) {
      throw new Error("Incorrect master password or corrupted data");
    }
  }
};

// -------------------------------------
// State
// -------------------------------------
const state = {
  currentPassword: "",
  length: 16,
  options: {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  },
  isScrambling: true,
  scrambleIntervalId: null,

  hasVault: false,
  isVaultUnlocked: false,
  masterPassword: "",
  vaultItems: [],

  activeModal: null,
  toastTimerId: null
};

// -------------------------------------
// DOM helpers
// -------------------------------------
function $(id) {
  return document.getElementById(id);
}

const elements = {
  lengthSlider: $("lengthSlider"),
  lengthValue: $("lengthValue"),

  generateBtn: $("generateBtn"),
  generateBtnText: $("generateBtnText"),
  generateBtnIcon: $("generateBtnIcon"),
  maxSecurityBtn: $("maxSecurityBtn"),
  saveVaultBtn: $("saveVaultBtn"),
  copyBtn: $("copyBtn"),

  passwordDisplay: $("passwordDisplay"),
  passwordText: $("passwordText"),

  strengthIndicator: $("strengthIndicator"),
  strengthText: $("strengthText"),
  strengthMeter: $("strengthMeter"),
  strengthSegments: Array.from(document.querySelectorAll(".strength-segment")),

  uppercaseBtn: $("uppercaseBtn"),
  lowercaseBtn: $("lowercaseBtn"),
  numbersBtn: $("numbersBtn"),
  symbolsBtn: $("symbolsBtn"),

  openVaultBtn: $("openVaultBtn"),
  openVaultBtnText: $("openVaultBtnText"),
  lockVaultBtn: $("lockVaultBtn"),

  modalOverlay: $("modalOverlay"),
  modalTitle: $("modalTitle"),
  closeModalBtn: $("closeModalBtn"),

  setupVaultModal: $("setupVaultModal"),
  unlockVaultModal: $("unlockVaultModal"),
  savePasswordModal: $("savePasswordModal"),
  viewVaultModal: $("viewVaultModal"),

  setupVaultForm: $("setupVaultForm"),
  unlockVaultForm: $("unlockVaultForm"),
  savePasswordForm: $("savePasswordForm"),

  setupMasterPassword: $("setupMasterPassword"),
  unlockMasterPassword: $("unlockMasterPassword"),
  saveWebsiteInput: $("saveWebsiteInput"),
  saveUsernameInput: $("saveUsernameInput"),
  savePasswordInput: $("savePasswordInput"),

  submitSetupVaultBtn: $("submitSetupVaultBtn"),
  submitUnlockVaultBtn: $("submitUnlockVaultBtn"),
  submitSavePasswordBtn: $("submitSavePasswordBtn"),

  toggleSetupMasterPasswordBtn: $("toggleSetupMasterPasswordBtn"),
  toggleUnlockMasterPasswordBtn: $("toggleUnlockMasterPasswordBtn"),

  vaultItemsContainer: $("vaultItemsContainer"),

  notification: $("notification"),
  notificationIcon: $("notificationIcon"),
  notificationText: $("notificationText")
};

// -------------------------------------
// Constants
// -------------------------------------
const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-="
};

const TILE_MAP = {
  uppercase: elements.uppercaseBtn,
  lowercase: elements.lowercaseBtn,
  numbers: elements.numbersBtn,
  symbols: elements.symbolsBtn
};

const MODAL_MAP = {
  setup: elements.setupVaultModal,
  unlock: elements.unlockVaultModal,
  save: elements.savePasswordModal,
  view: elements.viewVaultModal
};

const MODAL_TITLES = {
  setup: "Create Vault",
  unlock: "Unlock Vault",
  save: "Save Password",
  view: "Your Passwords"
};

// -------------------------------------
// Secure random helpers
// -------------------------------------
function getSecureRandomInt(maxExclusive) {
  if (maxExclusive <= 0) {
    return 0;
  }

  const uint32Max = 0xffffffff;
  const limit = uint32Max - (uint32Max % maxExclusive);
  const buffer = new Uint32Array(1);

  while (true) {
    window.crypto.getRandomValues(buffer);
    const value = buffer[0];

    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

function securePickOne(source) {
  return source[getSecureRandomInt(source.length)];
}

function shuffleStringSecurely(value) {
  const chars = value.split("");

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = getSecureRandomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join("");
}

// -------------------------------------
// UI state helpers
// -------------------------------------
function updateLengthUI() {
  elements.lengthValue.textContent = String(state.length);
  elements.lengthSlider.value = String(state.length);
}

function updateOptionTilesUI() {
  Object.entries(TILE_MAP).forEach(([key, button]) => {
    const isActive = Boolean(state.options[key]);

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function updateGeneratorButtonsUI() {
  elements.copyBtn.disabled = state.isScrambling || !state.currentPassword;
  elements.saveVaultBtn.disabled = state.isScrambling || !state.currentPassword;

  if (state.isScrambling) {
    elements.generateBtnText.textContent = "Generate & Lock";
    elements.generateBtnIcon.innerHTML = ICONS.shield;
  } else {
    elements.generateBtnText.textContent = "Restart Generator";
    elements.generateBtnIcon.innerHTML = ICONS.refresh;
  }
}

function updateVaultTopbarUI() {
  elements.lockVaultBtn.hidden = !state.isVaultUnlocked;

  if (state.isVaultUnlocked) {
    elements.openVaultBtnText.textContent = "Open Vault";
  } else if (state.hasVault) {
    elements.openVaultBtnText.textContent = "Unlock Vault";
  } else {
    elements.openVaultBtnText.textContent = "Create Vault";
  }
}

function setPasswordText(text, isPlaceholder) {
  elements.passwordText.textContent = text;
  elements.passwordText.classList.toggle("password-placeholder", Boolean(isPlaceholder));
}

function resetStrengthUI(label = "Calculating...") {
  elements.strengthText.textContent = label;
  elements.strengthText.className = "strength-badge";
  elements.strengthMeter.className = "strength-meter";

  elements.strengthSegments.forEach((segment) => {
    segment.classList.remove("is-active");
  });
}

function setStrengthUI(score, label, variant) {
  resetStrengthUI(label);

  if (variant) {
    elements.strengthText.classList.add(`strength-${variant}`);
    elements.strengthMeter.classList.add(`strength-${variant}`);
  }

  elements.strengthSegments.forEach((segment, index) => {
    segment.classList.toggle("is-active", index < score);
  });
}

// -------------------------------------
// Toast / notification
// -------------------------------------
function showNotification(message, type = "success") {
  if (state.toastTimerId) {
    window.clearTimeout(state.toastTimerId);
  }

  elements.notificationText.textContent = message;
  elements.notification.className = `notification ${type} show`;

  if (type === "error") {
    elements.notificationIcon.innerHTML = ICONS.alert;
  } else if (type === "info") {
    elements.notificationIcon.innerHTML = ICONS.info;
  } else {
    elements.notificationIcon.innerHTML = ICONS.check;
  }

  state.toastTimerId = window.setTimeout(() => {
    elements.notification.classList.remove("show");
    state.toastTimerId = null;
  }, 3000);
}

// -------------------------------------
// Password generation
// -------------------------------------
function getAvailableChars(currentOptions) {
  let availableChars = "";
  let guaranteedChars = "";

  Object.keys(currentOptions).forEach((key) => {
    if (currentOptions[key]) {
      availableChars += CHARSETS[key];
      guaranteedChars += securePickOne(CHARSETS[key]);
    }
  });

  return { availableChars, guaranteedChars };
}

function calculateStrength(password, currentOptions, forceUltimate = false) {
  if (forceUltimate) {
    return {
      score: 4,
      label: "Ultimate Security",
      variant: "ultimate"
    };
  }

  if (!password) {
    return {
      score: 0,
      label: "Very Weak",
      variant: "weak"
    };
  }

  let poolSize = 0;

  if (currentOptions.lowercase) {
    poolSize += 26;
  }

  if (currentOptions.uppercase) {
    poolSize += 26;
  }

  if (currentOptions.numbers) {
    poolSize += 10;
  }

  if (currentOptions.symbols) {
    poolSize += 30;
  }

  if (poolSize === 0) {
    return {
      score: 0,
      label: "Error",
      variant: ""
    };
  }

  const entropy = password.length * Math.log2(poolSize);

  if (entropy < 40) {
    return {
      score: 1,
      label: "Weak",
      variant: "weak"
    };
  }

  if (entropy < 60) {
    return {
      score: 2,
      label: "Medium",
      variant: "medium"
    };
  }

  if (entropy < 80) {
    return {
      score: 3,
      label: "Strong",
      variant: "strong"
    };
  }

  return {
    score: 4,
    label: "Very Strong",
    variant: "very-strong"
  };
}

function generatePasswordFromCurrentOptions() {
  const { availableChars, guaranteedChars } = getAvailableChars(state.options);

  if (!availableChars) {
    state.currentPassword = "";
    setPasswordText("Select options", true);
    setStrengthUI(0, "Select options", "");
    updateGeneratorButtonsUI();
    return;
  }

  const remainingLength = Math.max(0, state.length - guaranteedChars.length);
  let finalPassword = guaranteedChars;

  for (let index = 0; index < remainingLength; index += 1) {
    finalPassword += securePickOne(availableChars);
  }

  finalPassword = shuffleStringSecurely(finalPassword);

  state.currentPassword = finalPassword;
  state.isScrambling = false;

  setPasswordText(finalPassword, false);

  const strength = calculateStrength(finalPassword, state.options, false);
  setStrengthUI(strength.score, strength.label, strength.variant);
  updateGeneratorButtonsUI();
}

function generateUltimatePassword() {
  state.length = 128;
  state.options.uppercase = true;
  state.options.lowercase = true;
  state.options.numbers = true;
  state.options.symbols = true;

  updateLengthUI();
  updateOptionTilesUI();

  const allChars = `${CHARSETS.lowercase}${CHARSETS.uppercase}${CHARSETS.numbers}${CHARSETS.symbols}`;
  let finalPassword = "";

  for (let index = 0; index < state.length; index += 1) {
    finalPassword += securePickOne(allChars);
  }

  stopScrambling();

  state.currentPassword = finalPassword;
  state.isScrambling = false;

  setPasswordText(finalPassword, false);
  setStrengthUI(4, "Ultimate Security", "ultimate");
  updateGeneratorButtonsUI();

  showNotification("128-Character Ultimate Security password generated!", "success");
}

function startScrambling() {
  state.isScrambling = true;
  state.currentPassword = "";

  updateGeneratorButtonsUI();
  resetStrengthUI("Calculating...");

  if (state.scrambleIntervalId) {
    window.clearInterval(state.scrambleIntervalId);
  }

  state.scrambleIntervalId = window.setInterval(() => {
    const { availableChars } = getAvailableChars(state.options);

    if (!availableChars) {
      setPasswordText("Select options", true);
      resetStrengthUI("Select options");
      return;
    }

    let randomScramble = "";

    for (let index = 0; index < state.length; index += 1) {
      randomScramble += availableChars[Math.floor(Math.random() * availableChars.length)];
    }

    setPasswordText(randomScramble, true);
  }, 40);
}

function stopScrambling() {
  state.isScrambling = false;

  if (state.scrambleIntervalId) {
    window.clearInterval(state.scrambleIntervalId);
    state.scrambleIntervalId = null;
  }
}

function toggleGenerator() {
  if (state.isScrambling) {
    stopScrambling();
    generatePasswordFromCurrentOptions();
  } else {
    startScrambling();
  }
}

// -------------------------------------
// Clipboard
// -------------------------------------
async function copyTextToClipboard(text, successMessage = "Copied successfully!") {
  if (!text) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    showNotification(successMessage, "success");
    return true;
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      showNotification(successMessage, "success");
      return true;
    } catch (fallbackError) {
      showNotification("Copy error", "error");
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

async function copyCurrentPassword() {
  if (state.isScrambling || !state.currentPassword) {
    showNotification("Generate password first!", "error");
    return;
  }

  await copyTextToClipboard(state.currentPassword, "Copied successfully!");
}

// -------------------------------------
// Options
// -------------------------------------
function toggleOption(optionKey) {
  const nextOptions = {
    ...state.options,
    [optionKey]: !state.options[optionKey]
  };

  const hasAtLeastOneEnabled = Object.values(nextOptions).some(Boolean);

  if (!hasAtLeastOneEnabled) {
    showNotification("You must select at least one character type!", "error");
    return;
  }

  state.options = nextOptions;
  updateOptionTilesUI();
  startScrambling();
}

// -------------------------------------
// Vault / modal
// -------------------------------------
function readVaultFromStorage() {
  const raw = window.localStorage.getItem("secure_vault");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function checkVaultStatus() {
  state.hasVault = Boolean(readVaultFromStorage());
  updateVaultTopbarUI();
}

function hideAllModalPanels() {
  Object.values(MODAL_MAP).forEach((panel) => {
    panel.hidden = true;
  });
}

function resetPasswordVisibility(button, input) {
  input.type = "password";

  const openIcon = button.querySelector(".field-eye-open");
  const closedIcon = button.querySelector(".field-eye-closed");

  if (openIcon) {
    openIcon.hidden = false;
  }

  if (closedIcon) {
    closedIcon.hidden = true;
  }
}

function clearSensitiveFormState() {
  elements.setupVaultForm.reset();
  elements.unlockVaultForm.reset();
  elements.savePasswordForm.reset();
  elements.savePasswordInput.value = "";

  resetPasswordVisibility(elements.toggleSetupMasterPasswordBtn, elements.setupMasterPassword);
  resetPasswordVisibility(elements.toggleUnlockMasterPasswordBtn, elements.unlockMasterPassword);
}

function openModal(modalKey) {
  hideAllModalPanels();

  const targetPanel = MODAL_MAP[modalKey];

  if (!targetPanel) {
    return;
  }

  state.activeModal = modalKey;
  targetPanel.hidden = false;
  elements.modalTitle.textContent = MODAL_TITLES[modalKey];
  elements.modalOverlay.hidden = false;
  elements.modalOverlay.setAttribute("aria-hidden", "false");

  if (modalKey === "save") {
    elements.savePasswordInput.value = state.currentPassword;
  }

  if (modalKey === "view") {
    renderVaultItems();
  }
}

function closeModal() {
  state.activeModal = null;
  hideAllModalPanels();
  elements.modalOverlay.hidden = true;
  elements.modalOverlay.setAttribute("aria-hidden", "true");
  clearSensitiveFormState();
}

function openVaultViewFlow() {
  if (!state.hasVault) {
    openModal("setup");
    return;
  }

  if (!state.isVaultUnlocked) {
    openModal("unlock");
    return;
  }

  openModal("view");
}

function initiateSaveFlow() {
  if (state.isScrambling || !state.currentPassword) {
    showNotification("Generate password first!", "error");
    return;
  }

  if (!state.hasVault) {
    openModal("setup");
    return;
  }

  if (!state.isVaultUnlocked) {
    openModal("unlock");
    return;
  }

  elements.saveWebsiteInput.value = "";
  elements.saveUsernameInput.value = "";
  elements.savePasswordInput.value = state.currentPassword;
  openModal("save");
}

function lockVault() {
  state.isVaultUnlocked = false;
  state.masterPassword = "";
  state.vaultItems = [];

  updateVaultTopbarUI();
  showNotification("Vault locked.", "info");
}

async function handleSetupVaultSubmit(event) {
  event.preventDefault();

  const password = elements.setupMasterPassword.value;

  if (password.length < 8) {
    showNotification("Master password must be at least 8 characters.", "error");
    return;
  }

  try {
    const emptyVault = [];
    const encryptedPackage = await cryptoUtils.encryptData(emptyVault, password);

    window.localStorage.setItem("secure_vault", JSON.stringify(encryptedPackage));

    state.masterPassword = password;
    state.vaultItems = emptyVault;
    state.hasVault = true;
    state.isVaultUnlocked = true;

    updateVaultTopbarUI();
    closeModal();
    showNotification("Vault created and unlocked!", "success");
  } catch (error) {
    showNotification("Encryption error occurred.", "error");
  }
}

async function handleUnlockVaultSubmit(event) {
  event.preventDefault();

  try {
    const savedVault = readVaultFromStorage();

    if (!savedVault) {
      showNotification("No vault was found.", "error");
      return;
    }

    const password = elements.unlockMasterPassword.value;
    const decryptedData = await cryptoUtils.decryptData(savedVault, password);

    state.masterPassword = password;
    state.vaultItems = Array.isArray(decryptedData) ? decryptedData : [];
    state.isVaultUnlocked = true;
    state.hasVault = true;

    updateVaultTopbarUI();
    closeModal();
    showNotification("Vault unlocked successfully!", "success");
  } catch (error) {
    showNotification("Incorrect master password!", "error");
  }
}

async function handleSavePasswordSubmit(event) {
  event.preventDefault();

  const website = elements.saveWebsiteInput.value.trim();
  const username = elements.saveUsernameInput.value.trim();
  const password = elements.savePasswordInput.value;

  if (!website) {
    showNotification("Please enter a site/app.", "error");
    return;
  }

  const newItem = {
    id: Date.now(),
    website,
    username,
    password,
    date: new Date().toLocaleString("en-US")
  };

  const nextVaultItems = [newItem, ...state.vaultItems];

  try {
    const encryptedPackage = await cryptoUtils.encryptData(nextVaultItems, state.masterPassword);

    window.localStorage.setItem("secure_vault", JSON.stringify(encryptedPackage));

    state.vaultItems = nextVaultItems;
    state.hasVault = true;

    closeModal();
    showNotification("Password encrypted and saved!", "success");
  } catch (error) {
    showNotification("Error saving.", "error");
  }
}

async function handleDeleteVaultItem(itemId) {
  const nextVaultItems = state.vaultItems.filter((item) => item.id !== itemId);

  try {
    const encryptedPackage = await cryptoUtils.encryptData(nextVaultItems, state.masterPassword);

    window.localStorage.setItem("secure_vault", JSON.stringify(encryptedPackage));

    state.vaultItems = nextVaultItems;
    renderVaultItems();
    showNotification("Record deleted.", "info");
  } catch (error) {
    showNotification("Error deleting.", "error");
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char] || char;
  });
}

function createVaultItemTemplate(item) {
  const usernameMarkup = item.username
    ? `<p class="vault-item-meta">${escapeHtml(item.username)}</p>`
    : "";

  return `
    <article class="vault-item" data-vault-item-id="${item.id}">
      <div class="vault-item-head">
        <div class="vault-item-copyblock">
          <h4 class="vault-item-title">${escapeHtml(item.website)}</h4>
          ${usernameMarkup}
        </div>

        <button class="vault-item-delete" type="button" data-action="delete" data-id="${item.id}" aria-label="Delete saved password">
          ${ICONS.trash}
        </button>
      </div>

      <div class="vault-item-password-row">
        <span class="vault-item-password">${escapeHtml(item.password)}</span>

        <button class="vault-item-copy" type="button" data-action="copy" data-password="${escapeHtml(item.password)}" aria-label="Copy saved password">
          ${ICONS.copy}
        </button>
      </div>

      <div class="vault-item-date">Saved on: ${escapeHtml(item.date)}</div>
    </article>
  `;
}

function renderVaultItems() {
  if (!state.vaultItems.length) {
    elements.vaultItemsContainer.innerHTML = '<div class="empty-state">The vault is empty.</div>';
    return;
  }

  elements.vaultItemsContainer.innerHTML = state.vaultItems
    .map((item) => createVaultItemTemplate(item))
    .join("");
}

function handleVaultItemsClick(event) {
  const target = event.target.closest("button[data-action]");

  if (!target) {
    return;
  }

  const action = target.getAttribute("data-action");

  if (action === "delete") {
    const id = Number(target.getAttribute("data-id"));

    if (Number.isFinite(id)) {
      handleDeleteVaultItem(id);
    }

    return;
  }

  if (action === "copy") {
    const password = target.getAttribute("data-password") || "";
    copyTextToClipboard(password, "Password copied from vault!");
  }
}

// -------------------------------------
// Accessibility helpers
// -------------------------------------
function togglePasswordVisibility(button, input) {
  const isCurrentlyHidden = input.type === "password";
  input.type = isCurrentlyHidden ? "text" : "password";

  const openIcon = button.querySelector(".field-eye-open");
  const closedIcon = button.querySelector(".field-eye-closed");

  if (openIcon) {
    openIcon.hidden = !isCurrentlyHidden;
  }

  if (closedIcon) {
    closedIcon.hidden = isCurrentlyHidden;
  }
}

function handleModalOverlayClick(event) {
  const shouldClose = event.target === elements.modalOverlay || event.target.hasAttribute("data-close-modal");

  if (shouldClose) {
    closeModal();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && state.activeModal) {
    closeModal();
  }
}

// -------------------------------------
// Event wiring
// -------------------------------------
function bindEvents() {
  elements.lengthSlider.addEventListener("input", (event) => {
    state.length = Number(event.target.value);
    updateLengthUI();
    startScrambling();
  });

  Object.keys(TILE_MAP).forEach((key) => {
    TILE_MAP[key].addEventListener("click", () => {
      toggleOption(key);
    });
  });

  elements.generateBtn.addEventListener("click", toggleGenerator);
  elements.maxSecurityBtn.addEventListener("click", generateUltimatePassword);
  elements.copyBtn.addEventListener("click", copyCurrentPassword);
  elements.saveVaultBtn.addEventListener("click", initiateSaveFlow);

  elements.passwordDisplay.addEventListener("click", () => {
    if (!state.isScrambling && state.currentPassword) {
      copyCurrentPassword();
    }
  });

  elements.passwordDisplay.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !state.isScrambling && state.currentPassword) {
      event.preventDefault();
      copyCurrentPassword();
    }
  });

  elements.openVaultBtn.addEventListener("click", openVaultViewFlow);
  elements.lockVaultBtn.addEventListener("click", lockVault);

  elements.closeModalBtn.addEventListener("click", closeModal);
  elements.modalOverlay.addEventListener("click", handleModalOverlayClick);
  document.addEventListener("keydown", handleDocumentKeydown);

  elements.setupVaultForm.addEventListener("submit", handleSetupVaultSubmit);
  elements.unlockVaultForm.addEventListener("submit", handleUnlockVaultSubmit);
  elements.savePasswordForm.addEventListener("submit", handleSavePasswordSubmit);

  elements.toggleSetupMasterPasswordBtn.addEventListener("click", () => {
    togglePasswordVisibility(elements.toggleSetupMasterPasswordBtn, elements.setupMasterPassword);
  });

  elements.toggleUnlockMasterPasswordBtn.addEventListener("click", () => {
    togglePasswordVisibility(elements.toggleUnlockMasterPasswordBtn, elements.unlockMasterPassword);
  });

  elements.vaultItemsContainer.addEventListener("click", handleVaultItemsClick);
}

// -------------------------------------
// Init
// -------------------------------------
function init() {
  updateLengthUI();
  updateOptionTilesUI();
  updateGeneratorButtonsUI();
  updateVaultTopbarUI();
  resetStrengthUI("Calculating...");
  checkVaultStatus();
  bindEvents();
  startScrambling();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
