const ALLOWED_SERVICES = [
  "Predaj repasovaného kávovaru",
  "Servis a oprava",
  "Údržba a odvápnenie",
  "Odborné poradenstvo",
  "Iné",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts digits, spaces, +, -, () — reasonably permissive for SK/international numbers.
const PHONE_REGEX = /^[0-9+\-()\s]{6,20}$/;

/**
 * Strips characters that have no legitimate place in plain-text form fields
 * (HTML tags, control characters) and trims whitespace.
 */
function sanitizeText(value, maxLength) {
  if (typeof value !== "string") return "";
  const withoutTags = value.replace(/<[^>]*>/g, "");
  const withoutControlChars = withoutTags.replace(/[\x00-\x1F\x7F]/g, "");
  return withoutControlChars.trim().slice(0, maxLength);
}

/**
 * Validates and sanitizes a booking payload.
 * Returns { valid: true, data } or { valid: false, errors: string[] }.
 */
function validateBooking(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Neplatná požiadavka."] };
  }

  const name = sanitizeText(payload.name, 80);
  const email = sanitizeText(payload.email, 120);
  const phone = sanitizeText(payload.phone, 20);
  const service = sanitizeText(payload.service, 60);
  const message = sanitizeText(payload.message, 1000);
  const preferredDate = sanitizeText(payload.preferredDate || "", 20);
  const privacyConsent = payload.privacyConsent === true || payload.privacyConsent === "true";

  if (name.length < 2) {
    errors.push("Meno musí mať aspoň 2 znaky.");
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.push("Zadajte platnú e-mailovú adresu.");
  }

  if (!PHONE_REGEX.test(phone)) {
    errors.push("Zadajte platné telefónne číslo.");
  }

  if (!ALLOWED_SERVICES.includes(service)) {
    errors.push("Vyberte platnú službu zo zoznamu.");
  }

  if (preferredDate) {
    const isValidDate = !Number.isNaN(new Date(preferredDate).getTime());
    if (!isValidDate) {
      errors.push("Zadajte platný dátum.");
    }
  }

  if (!privacyConsent) {
    errors.push("Potvrďte, prosím, spracovanie osobných údajov.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { name, email, phone, service, message, preferredDate, privacyConsent },
  };
}

module.exports = { validateBooking, ALLOWED_SERVICES };
