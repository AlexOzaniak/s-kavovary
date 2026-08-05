const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

const config = {
  port: parseInt(required("PORT", "3000"), 10),
  nodeEnv: required("NODE_ENV", "development"),

  corsOrigin: required("CORS_ORIGIN", "*"),

  smtp: {
    host: required("SMTP_HOST", "smtp.gmail.com"),
    port: parseInt(required("SMTP_PORT", "465"), 10),
    // `SMTP_SECURE` should be "true" for SSL (465), "false" for STARTTLS (587).
    secure: required("SMTP_SECURE", "true") === "true",
    user: required("SMTP_USER"),
    pass: required("SMTP_PASS"),
    // Only set to false for local development when antivirus/firewall SSL
    // inspection injects a self-signed certificate. Never disable this in
    // production — it removes protection against man-in-the-middle attacks.
    rejectUnauthorized: required("SMTP_TLS_REJECT_UNAUTHORIZED", "true") === "true",
  },

  // Address the business receives new booking requests at.
  businessEmail: required("BUSINESS_EMAIL", "alexozaniakk@gmail.com"),

  // Whether to also send a confirmation email to the customer.
  sendCustomerConfirmation: required("SEND_CUSTOMER_CONFIRMATION", "true") === "true",

  business: {
    name: "S-kávovary",
    address: "Holazovci 931, 023 22 Klokočov",
    phone: "+421 951 866 933",
  },
};

module.exports = config;