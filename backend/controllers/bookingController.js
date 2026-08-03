const fs = require("fs");
const path = require("path");
const { validateBooking } = require("../services/validationService");
const { sendBookingEmails } = require("../services/emailService");

const BOOKINGS_LOG_PATH = path.join(__dirname, "..", "data", "bookings.log.jsonl");

function persistBooking(booking) {
  try {
    fs.mkdirSync(path.dirname(BOOKINGS_LOG_PATH), { recursive: true });
    const record = JSON.stringify({ ...booking, createdAt: new Date().toISOString() });
    fs.appendFileSync(BOOKINGS_LOG_PATH, record + "\n", "utf8");
  } catch (err) {
    // Persistence is best-effort — do not block the booking flow on it,
    // but do surface it in logs for the site owner to notice.
    console.error("Nepodarilo sa uložiť objednávku do súboru:", err.message);
  }
}

async function createBooking(req, res) {
  const { valid, data, errors } = validateBooking(req.body);

  if (!valid) {
    return res.status(400).json({
      success: false,
      message: "Formulár obsahuje chyby.",
      errors,
    });
  }

  persistBooking(data);

  try {
    await sendBookingEmails(data);
  } catch (err) {
    console.error("Odoslanie e-mailu zlyhalo:", err.message);
    // The booking is already stored locally, so we tell the customer it
    // succeeded but flag the email issue for the business to check logs.
    return res.status(202).json({
      success: true,
      message:
        "Objednávka bola prijatá, no potvrdzujúci e-mail sa nepodarilo odoslať. Budeme vás kontaktovať telefonicky.",
    });
  }

  return res.status(201).json({
    success: true,
    message: "Objednávka bola úspešne odoslaná.",
  });
}

module.exports = { createBooking };
