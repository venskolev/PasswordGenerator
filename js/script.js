let encodingBits = 32;
let animationTimeout;

function generatePassword() {
  clearTimeout(animationTimeout); 
  const length = encodingBits / 4;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=";
  let password = "";

  const randomUppercaseIndex = Math.floor(Math.random() * charset.length);
  password += charset[randomUppercaseIndex].toUpperCase();

  for (let i = 1; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  const passwordMessageElement = document.getElementById("password-message");
  passwordMessageElement.textContent =
    "Your secure password has been generated, you can copy it!";
  document.getElementById("password").textContent = password;
  document.getElementById("animation-container").style.display = "none";
  document.getElementById("generate-btn").style.display = "none";
  document.getElementById("copy-btn").style.display = "block";
  document.getElementById("reload-btn").style.display = "block";
  document.getElementById("bit-select-container").style.display = "none";
}

function copyToClipboard() {
  const passwordElement = document.getElementById("password");
  const passwordText = passwordElement.innerText || passwordElement.textContent;

  // Проверка дали има генерирана парола
  if (passwordText === 'Click "Generate" to get a password') {
    // Модалният прозорец да изпише, че няма генерирана парола
    document.getElementById("modal-error").style.display = "flex";
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = passwordText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);

    // Показване на модалния прозорец
    document.getElementById("modal-success").style.display = "flex";
  }
}

function updateBitEncoding() {
  encodingBits = parseInt(document.getElementById("bit-select").value);
}

function closeModal() {
  // Затваряне на модалния прозорец
  document.getElementById("modal-success").style.display = "none";
  document.getElementById("modal-error").style.display = "none";
}

function reloadPage() {
  // Презареждане на страницата
  location.reload();
}

// Показване на подкана за генериране на парола
document.getElementById("password").textContent =
  'Click "Generate" to get a password';

const animationContainer = document.getElementById("animation-container");

const characters =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_-+=";

function generateRandomString(length) {
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }
  return result;
}

function animateRandomString() {
  const frameDuration = 350; // 350 скорост на анимация
  const charactersPerFrame = 8; // 8 брой символа в анимацията

  const frameLength = charactersPerFrame;

  const frameString = generateRandomString(frameLength);
  animationContainer.textContent = frameString;

  // Извикване на animateRandomString() отново след края на всяка рамка
  animationTimeout = setTimeout(animateRandomString, frameDuration);
}

animateRandomString();
