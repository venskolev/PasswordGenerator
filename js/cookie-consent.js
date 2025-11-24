document.addEventListener('DOMContentLoaded', function () {
    const cookieBanner = document.getElementById('cookieConsent');
    const acceptBtn = document.getElementById('acceptCookies');
    const CONSENT_KEY = 'securepass_cookie_consent';
    const CONSENT_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    // Check if consent is already given and valid
    function hasValidConsent() {
        const consentData = localStorage.getItem(CONSENT_KEY);
        if (!consentData) return false;

        try {
            const { timestamp } = JSON.parse(consentData);
            const now = new Date().getTime();
            // Check if consent is within the 30-day window
            if (now - timestamp < CONSENT_DURATION) {
                return true;
            } else {
                // Consent expired
                localStorage.removeItem(CONSENT_KEY);
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    function enableAnalytics() {
        // Grant consent to Google Analytics
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'ad_storage': 'granted',
                'analytics_storage': 'granted'
            });
            console.log('[SecurePass] Analytics enabled');
        }
    }

    if (!hasValidConsent()) {
        // Show banner
        cookieBanner.style.display = 'block';
    } else {
        // Already consented, enable analytics immediately
        enableAnalytics();
    }

    acceptBtn.addEventListener('click', function () {
        const now = new Date().getTime();
        const consentData = {
            timestamp: now,
            value: 'accepted'
        };

        localStorage.setItem(CONSENT_KEY, JSON.stringify(consentData));
        cookieBanner.style.display = 'none';

        enableAnalytics();
    });
});
