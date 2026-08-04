// ---- Shared config ----
// Point this to your running backend. In production, host it under the
// same domain (e.g. /api) so this can just be a relative path.
// In production, set `window.SKV_CONFIG.apiBaseUrl` in `site-config.js` or
// keep API calls relative by setting `apiBaseUrl: ""`.
const SITE_CONFIG = window.SKV_CONFIG || {};

function resolveApiBaseUrl() {
  if (typeof SITE_CONFIG.apiBaseUrl === "string") {
    return SITE_CONFIG.apiBaseUrl;
  }

  const { protocol, hostname, port } = window.location;

  // Local development often serves the frontend from a static server on a
  // different port than the backend. Fall back to the backend port used by
  // this project so the booking form works out of the box.
  if (protocol === "file:") {
    return "http://localhost:3000";
  }

  if (
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") &&
    port &&
    port !== "3000"
  ) {
    return "http://localhost:3000";
  }

  return "";
}

const API_BASE_URL = resolveApiBaseUrl();

const CONSENT_VERSION = SITE_CONFIG.cookieConsentVersion || "1.0";
const CONSENT_STORAGE_KEY = SITE_CONFIG.cookieConsentKey || "s_kavovary_cookie_consent";
const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

const DEFAULT_CONSENT = {
  version: CONSENT_VERSION,
  updatedAt: null,
  categories: {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  },
};

let consentDialog = null;
let consentDialogOverlay = null;
let consentDialogBody = null;

function deepCloneConsent(consent) {
  return {
    version: consent.version,
    updatedAt: consent.updatedAt,
    categories: {
      necessary: true,
      functional: Boolean(consent.categories && consent.categories.functional),
      analytics: Boolean(consent.categories && consent.categories.analytics),
      marketing: Boolean(consent.categories && consent.categories.marketing),
    },
  };
}

function buildCookieString(name, value, maxAgeSeconds) {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    "path=/",
    `max-age=${maxAgeSeconds}`,
    "samesite=lax",
  ];

  if (window.location.protocol === "https:") {
    parts.push("secure");
  }

  return parts.join("; ");
}

function readStoredConsent() {
  const fromCookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${encodeURIComponent(CONSENT_STORAGE_KEY)}=`));

  let rawValue = null;

  if (fromCookie) {
    rawValue = decodeURIComponent(fromCookie.split("=").slice(1).join("="));
  } else {
    try {
      rawValue = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      rawValue = null;
    }
  }

  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || parsed.version !== CONSENT_VERSION || !parsed.categories) {
      return null;
    }

    return deepCloneConsent(parsed);
  } catch {
    return null;
  }
}

function persistConsent(consent) {
  const payload = JSON.stringify(consent);

  document.cookie = buildCookieString(CONSENT_STORAGE_KEY, payload, CONSENT_MAX_AGE_SECONDS);

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, payload);
  } catch {
    // Local storage can be unavailable in locked-down browsers; the cookie is
    // the primary source of truth, so we silently ignore storage failures.
  }
}

function hasConsent(category) {
  return Boolean(activeConsent && activeConsent.categories && activeConsent.categories[category]);
}

function setButtonState(loadingButton, disabled) {
  if (!loadingButton) return;

  loadingButton.disabled = disabled;
}

function setStatus(message, type) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = "form-status" + (type ? ` ${type}` : "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createBanner() {
  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("aria-label", "Nastavenia cookies");
  banner.innerHTML = `
    <div class="cookie-banner__card">
      <div class="cookie-banner__copy">
        <p class="cookie-banner__eyebrow">Súkromie a cookies</p>
        <h2>Nastavte si cookies podľa seba.</h2>
        <p>Držíme sa len toho, čo web skutočne potrebuje. Voliteľný obsah načítame až po vašom súhlase.</p>
        <p class="cookie-banner__note">Vaše voľby si zapamätáme a môžete ich kedykoľvek zmeniť.</p>
      </div>
      <div class="cookie-banner__actions">
        <button type="button" class="btn btn-primary btn-small" data-consent-action="accept-all">Prijať všetko</button>
        <button type="button" class="btn btn-ghost btn-small" data-consent-action="reject-all">Povoliť len nevyhnutné</button>
        <button type="button" class="btn btn-ghost btn-small" data-consent-action="customize">Vybrať ručne</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);
  return banner;
}

function createConsentDialog() {
  const dialog = document.createElement("div");
  dialog.className = "cookie-modal";
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="cookie-modal__backdrop" data-consent-action="close"></div>
    <div class="cookie-modal__panel" role="dialog" aria-modal="true" aria-labelledby="cookieModalTitle">
      <div class="cookie-modal__header">
        <div>
          <p class="cookie-banner__eyebrow">Nastavenia cookies</p>
          <h2 id="cookieModalTitle">Vyberte si len to, čo má web používať.</h2>
        </div>
        <button type="button" class="cookie-modal__close" aria-label="Zavrieť" data-consent-action="close">×</button>
      </div>

      

      <div class="cookie-modal__content">
        ${Object.keys(SITE_CONFIG.consentCategories || DEFAULT_CONSENT.categories)
          .map((key) => {
            const category = SITE_CONFIG.consentCategories[key] || {};
            const isNecessary = key === "necessary";
            return `
              <label class="cookie-option">
                <div class="cookie-option__head">
                  <span>
                    <strong>${category.label || key}</strong>
                    <small>${category.shortLabel || category.label || key}</small>
                  </span>
                  <input
                    type="checkbox"
                    name="cookie-${key}"
                    data-cookie-category="${key}"
                    ${isNecessary ? "checked disabled" : ""}
                  >
                </div>
                <p>${category.purpose || ""}</p>
                <dl class="cookie-option__meta">
                  <div>
                    <dt>Čo sa spracúva</dt>
                    <dd>${category.data || "—"}</dd>
                  </div>
                  <div>
                    <dt>Uloženie</dt>
                    <dd>${category.duration || "—"}</dd>
                  </div>
                  <div>
                    <dt>Tretie strany</dt>
                    <dd>${category.thirdParties || "—"}</dd>
                  </div>
                </dl>
              </label>
            `;
          })
          .join("")}
      </div>

      <div class="cookie-modal__actions">
        <button type="button" class="btn btn-ghost btn-small" data-consent-action="reject-all">Povoliť len nevyhnutné</button>
        <button type="button" class="btn btn-primary btn-small" data-consent-action="save-custom">Uložiť výber</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);
  return dialog;
}

function openConsentDialog() {
  if (!consentDialog) {
    consentDialog = createConsentDialog();
    consentDialogOverlay = consentDialog.querySelector(".cookie-modal__backdrop");
    consentDialogBody = consentDialog.querySelector(".cookie-modal__panel");

    consentDialog.addEventListener("click", (event) => {
      const action = event.target && event.target.dataset ? event.target.dataset.consentAction : null;

      if (action === "close") {
        closeConsentDialog();
      }
    });
  }

  syncConsentCheckboxes(activeConsent || DEFAULT_CONSENT);
  consentDialog.hidden = false;
  document.body.classList.add("cookie-modal-open");
}

function closeConsentDialog() {
  if (!consentDialog) return;

  consentDialog.hidden = true;
  document.body.classList.remove("cookie-modal-open");
}

function syncConsentCheckboxes(consent) {
  if (!consentDialog) return;

  consentDialog.querySelectorAll("[data-cookie-category]").forEach((checkbox) => {
    const key = checkbox.getAttribute("data-cookie-category");
    checkbox.checked = key === "necessary" || Boolean(consent.categories[key]);
  });
}

function getConsentFromDialog() {
  const categories = {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  };

  if (!consentDialog) {
    return deepCloneConsent(DEFAULT_CONSENT);
  }

  consentDialog.querySelectorAll("[data-cookie-category]").forEach((checkbox) => {
    const key = checkbox.getAttribute("data-cookie-category");
    categories[key] = key === "necessary" ? true : checkbox.checked;
  });

  return {
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
    categories,
  };
}

function setActiveConsent(consent) {
  activeConsent = deepCloneConsent(consent);
  persistConsent(activeConsent);
  closeConsentDialog();
  renderCookieBanner();
  syncDeferredContent();
}

function handleConsentAction(action) {
  if (action === "accept-all") {
    setActiveConsent({
      version: CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
      categories: {
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true,
      },
    });
    return;
  }

  if (action === "reject-all") {
    setActiveConsent({
      version: CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
      categories: {
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
      },
    });
    return;
  }

  if (action === "customize") {
    openConsentDialog();
    return;
  }

  if (action === "save-custom") {
    setActiveConsent(getConsentFromDialog());
  }
}

function renderCookieBanner() {
  const existingBanner = document.querySelector(".cookie-banner");
  const shouldShowBanner = !activeConsent;

  if (!shouldShowBanner) {
    if (existingBanner) existingBanner.remove();
    return;
  }

  if (!existingBanner) {
    createBanner();
  }
}

function renderConsentButtonTriggers() {
  document.querySelectorAll("[data-open-cookie-settings]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openConsentDialog();
    });
  });
}

function renderFunctionalEmbeds() {
  document.querySelectorAll("[data-consent-embed='functional']").forEach((container) => {
    const mapUrl = container.getAttribute("data-embed-url") || SITE_CONFIG.map?.embedUrl || SITE_CONFIG.map?.directionsUrl;

    if (hasConsent("functional") && mapUrl) {
      container.innerHTML = `
        <iframe
          title="Poloha prevádzky S-kávovary"
          src="${mapUrl}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
      `;
      return;
    }

    container.innerHTML = `
      <div class="consent-embed-placeholder">
        <div>
          <p class="consent-embed-placeholder__eyebrow">Mapa</p>
          <h3>Mapa sa zobrazí po potvrdení cookies</h3>
          <p>Ak chcete vidieť vloženú mapu, povoľte prosím funkčné cookies.</p>
          <button type="button" class="btn btn-primary btn-small" data-open-cookie-settings>Povoliť cookies</button>
        </div>
      </div>
    `;
  });
}

function syncDeferredContent() {
  renderFunctionalEmbeds();
}

function initMotion() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = [
    document.querySelector(".hero-copy"),
    document.querySelector(".hero-img-wrap"),
    document.querySelector(".service-card--featured"),
    ...document.querySelectorAll(".service-card"),
    ...document.querySelectorAll(".price-list li"),
    ...document.querySelectorAll(".contact-grid > div"),
    document.querySelector(".booking-form"),
    document.querySelector(".booking-intro"),
    ...document.querySelectorAll(".privacy-section"),
    document.querySelector(".footer-inner"),
  ].filter(Boolean);

  targets.forEach((element, index) => {
    element.classList.add("reveal-on-scroll");
    if (element.matches(".service-card, .price-list li, .contact-grid > div, .privacy-section")) {
      element.classList.add("stagger-child");
      element.style.setProperty("--stagger-delay", `${Math.min(index * 90, 420)}ms`);
    }
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((element) => observer.observe(element));
}

let activeConsent = readStoredConsent();

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-consent-action]");

  if (!trigger) return;
  handleConsentAction(trigger.getAttribute("data-consent-action"));
});

document.addEventListener("click", (event) => {
  const settingsTrigger = event.target.closest("[data-open-cookie-settings]");

  if (!settingsTrigger) return;

  event.preventDefault();
  openConsentDialog();
});

// ---- Footer year ----
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ---- Mobile nav ----
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// ---- Booking form ----
const form = document.getElementById("bookingForm");
const statusEl = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
const privacyConsentCheckbox = document.getElementById("bookingPrivacyConsent");

function initBookingForm() {
  if (!form || !submitBtn) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", "");

    const data = Object.fromEntries(new FormData(form).entries());

    // Honeypot — if filled, silently drop (bots only).
    if (data.website) {
      return;
    }

    // GDPR notice: this checkbox must be actively checked before the backend
    // receives any personal data for the reservation request.
    if (!privacyConsentCheckbox || !privacyConsentCheckbox.checked) {
      setStatus("Potvrďte, prosím, spracovanie osobných údajov.", "err");
      return;
    }

    // Basic client-side validation. The backend re-validates everything.
    if (!data.name || data.name.trim().length < 2) {
      setStatus("Zadajte prosím vaše meno.", "err");
      return;
    }
    if (!data.email || !isValidEmail(data.email.trim())) {
      setStatus("Zadajte prosím platný e-mail.", "err");
      return;
    }
    if (!data.phone || data.phone.trim().length < 6) {
      setStatus("Zadajte prosím platné telefónne číslo.", "err");
      return;
    }
    if (!data.service) {
      setStatus("Vyberte prosím službu.", "err");
      return;
    }

    setButtonState(submitBtn, true);
    submitBtn.textContent = "Odosielam...";

    try {
      const url = (API_BASE_URL || "") + "/api/bookings";
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          service: data.service,
          preferredDate: data.preferredDate || null,
          message: (data.message || "").trim(),
          privacyConsent: true,
        }),
      });


      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Objednávku sa nepodarilo odoslať.");
      }

      setStatus(
        "Ďakujeme, vaša objednávka bola odoslaná. Ozveme sa vám čo najskôr.",
        "ok"
      );
      form.reset();
    } catch (error) {
      setStatus(
        error.message || "Nastala chyba. Skúste to prosím znova alebo nám zavolajte.",
        "err"
      );
    } finally {
      setButtonState(submitBtn, false);
      submitBtn.textContent = "Odoslať objednávku";
    }
  });
}

// ---- Boot sequence ----
renderCookieBanner();
renderConsentButtonTriggers();
syncDeferredContent();
initMotion();
initBookingForm();
