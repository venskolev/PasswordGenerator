# SecurePass - Advanced Password Generator & Vault

SecurePass is a modern, privacy-first password generator and local credential manager. It features a visually engaging Matrix-style scrambling animation, military-grade client-side encryption, and a beautiful "Aurora Green" Glassmorphism UI.

## Features

- **Cryptographically Secure:** Uses `window.crypto.getRandomValues` for true randomness, ensuring high-entropy passwords.
- **Zero-Knowledge Local Vault:** Save your passwords securely in your browser. Encrypted client-side using **AES-256-GCM** and PBKDF2 key derivation. Your master password and data never leave your device.
- **128-Char Ultimate Security:** A dedicated quick-action button to instantly generate a maximum-entropy 128-character password.
- **Matrix Scrambling Animation:** A continuous, highly engaging decoding animation effect that runs while configuring your password options.
- **Modern UI/UX:** Fully responsive Glassmorphism design with elegant toast notifications, custom scrollbars, and seamless modal transitions.
- **Privacy-First (GDPR Ready):** Built-in cookie/local storage consent banner and a transparent privacy policy suitable for European (e.g., German) privacy standards.

## Usage

1. Open the `index.html` file in any modern web browser.
2. Adjust the password length slider (8–128) and toggle the desired character sets, or simply click **128-Char Ultimate Security**.
3. Click **Generate & Lock** to stop the continuous animation and lock in your cryptographically secure password.
4. Click **Create Vault** or **Unlock Vault** to set up your encrypted offline storage with a Master Password.
5. Use **Save to Local Vault** to securely store the generated password along with the website name and username.
6. Access your saved passwords anytime via the Vault menu to quickly copy or delete them.

## Project Structure

- `index.html`: The main document containing the application layout, modal structures, and UI elements.
- `privacy.html`: The Privacy Policy detailing the Zero-Knowledge architecture and data handling.
- `style/style.css`: The "Aurora Green" stylesheet, containing CSS variables, glassmorphism effects, and animations.
- `js/script.js`: The core JavaScript logic powering the cryptography (Web Crypto API), password generation, UI animations, and Vault management.
- `js/cookie-consent.js`: Logic for handling user consent for local storage and analytics.

## Technologies Used

- HTML5 & CSS3 (Flexbox/Grid, CSS Variables, Keyframe Animations)
- Vanilla JavaScript (ES6+)
- Web Crypto API (AES-256-GCM, PBKDF2)
- Clipboard API

## License

This project is licensed under the MIT License.

Copyright (c) 2023-2026 WebDigiTech - Ventsislav Kolev

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.