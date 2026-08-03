const express = require("express");
const rateLimit = require("express-rate-limit");
const { createBooking } = require("../controllers/bookingController");

const router = express.Router();

// Limit booking submissions to reduce spam / abuse while staying usable
// for genuine customers.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Príliš veľa požiadaviek. Skúste to prosím neskôr.",
  },
});

router.post("/bookings", bookingLimiter, createBooking);

module.exports = router;
