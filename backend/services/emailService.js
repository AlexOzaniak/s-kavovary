const nodemailer = require("nodemailer");
const config = require("../config/config");

const emailTheme = {
  background: "#F7F4EF",
  surface: "#FFFFFF",
  text: "#221A14",
  muted: "#7A6C60",
  faint: "#A79A8C",
  accent: "#8B5E3C",
  line: "rgba(34,26,20,0.12)",
  lineSoft: "rgba(34,26,20,0.07)",
};

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!config.smtp.user || !config.smtp.pass) {
    // Fail fast in development, but in production we prefer to surface a
    // clear runtime error so the caller can decide how to proceed.
    throw new Error(
      "SMTP nie je nakonfigurované. Nastavte SMTP_USER a SMTP_PASS v .env súbore."
    );
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure, // true = 465 (SSL), false = 587 (STARTTLS)
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: {
      rejectUnauthorized: config.smtp.rejectUnauthorized,
    },
  });

  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseReservationDate(dateString) {
  if (!dateString) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatReservationDate(dateString) {
  const date = parseReservationDate(dateString);
  if (!date) return "Dátum bude potvrdený";

  return date.toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatReservationTime(dateString) {
  if (!dateString) return "Podľa dohody";
  if (!/T\d{2}:\d{2}/.test(dateString) && !/\s\d{2}:\d{2}/.test(dateString)) {
    return "Podľa dohody";
  }

  const date = parseReservationDate(dateString);
  if (!date) return "Podľa dohody";

  return date.toLocaleTimeString("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMultilineHtml(value) {
  return escapeHtml(value || "Bez ďalšieho popisu.").replace(/\n/g, "<br>");
}

function buildManageReservationUrl(booking) {
  const subject = encodeURIComponent(
    `Správa rezervácie – ${booking.name} – ${config.business.name}`
  );
  const body = encodeURIComponent(
    [
      `Meno: ${booking.name}`,
      `E-mail: ${booking.email}`,
      `Telefón: ${booking.phone}`,
      `Služba: ${booking.service}`,
      `Dátum: ${formatReservationDate(booking.preferredDate)}`,
      `Čas: ${formatReservationTime(booking.preferredDate)}`,
      "",
      "Prosím, potrebujem upraviť alebo zrušiť rezerváciu.",
    ].join("\n")
  );

  return `mailto:${config.businessEmail}?subject=${subject}&body=${body}`;
}

/* ---------- Shared layout pieces ---------- */

function emailShell({ eyebrow, heading, intro, body, footerNote }) {
  return `
  <div style="margin:0;padding:48px 24px;background:${emailTheme.background};">
    <div style="max-width:560px;margin:0 auto;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${emailTheme.text};">

      <!-- Wordmark -->
      <div style="text-align:center;margin-bottom:36px;">
        <div style="display:inline-block;font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:${emailTheme.text};font-weight:600;">
          S <span style="color:${emailTheme.accent};">—</span> KÁVOVARY
        </div>
      </div>

      <!-- Card -->
      <div style="background:${emailTheme.surface};border:1px solid ${emailTheme.line};border-radius:2px;">

        <div style="padding:44px 44px 32px;">
          <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${emailTheme.accent};font-weight:600;margin-bottom:16px;">
            ${eyebrow}
          </div>
          <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.3;font-weight:400;color:${emailTheme.text};">
            ${heading}
          </h1>
          <p style="margin:0;font-size:15px;line-height:1.75;color:${emailTheme.muted};">
            ${intro}
          </p>
        </div>

        <div style="height:1px;background:${emailTheme.lineSoft};margin:0 44px;"></div>

        <div style="padding:32px 44px 40px;">
          ${body}
        </div>

      </div>

      <!-- Footer -->
      <div style="padding:28px 12px 0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12.5px;line-height:1.7;color:${emailTheme.faint};">
          ${footerNote}
        </p>
        <p style="margin:0;font-size:12.5px;line-height:1.7;color:${emailTheme.faint};">
          ${escapeHtml(config.business.address)} · ${escapeHtml(config.business.phone)}
        </p>
      </div>

    </div>
  </div>
  `;
}

function detailRow(label, value, isLast) {
  return `
    <tr>
      <td style="padding:${isLast ? "14px 0 0" : "14px 0"};width:120px;vertical-align:top;font-size:13px;color:${emailTheme.faint};border-bottom:${isLast ? "none" : `1px solid ${emailTheme.lineSoft}`};padding-bottom:14px;">
        ${label}
      </td>
      <td style="padding:14px 0;vertical-align:top;font-size:15px;color:${emailTheme.text};border-bottom:${isLast ? "none" : `1px solid ${emailTheme.lineSoft}`};padding-bottom:14px;">
        ${value}
      </td>
    </tr>
  `;
}

/* ---------- Business notification ---------- */

function buildBusinessEmail(booking) {
  const text = [
    `Nová objednávka z webu ${config.business.name}`,
    "",
    `Meno: ${booking.name}`,
    `E-mail: ${booking.email}`,
    `Telefón: ${booking.phone}`,
    `Služba: ${booking.service}`,
    `Preferovaný termín: ${formatReservationDate(booking.preferredDate)}`,
    "",
    "Popis požiadavky:",
    booking.message || "Bez ďalšieho popisu.",
  ].join("\n");

  const detailsTable = `
    <table role="presentation" style="width:100%;border-collapse:collapse;">
      ${detailRow("Meno", escapeHtml(booking.name))}
      ${detailRow("E-mail", `<a href="mailto:${escapeHtml(booking.email)}" style="color:${emailTheme.text};text-decoration:underline;">${escapeHtml(booking.email)}</a>`)}
      ${detailRow("Telefón", escapeHtml(booking.phone))}
      ${detailRow("Služba", escapeHtml(booking.service))}
      ${detailRow("Termín", escapeHtml(formatReservationDate(booking.preferredDate)), true)}
    </table>

    <div style="margin-top:32px;">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${emailTheme.faint};font-weight:600;margin-bottom:10px;">
        Popis požiadavky
      </div>
      <p style="margin:0;font-size:15px;line-height:1.75;color:${emailTheme.text};">
        ${formatMultilineHtml(booking.message)}
      </p>
    </div>
  `;

  const html = emailShell({
    eyebrow: "Nová objednávka",
    heading: "Prišla nová rezervácia",
    intro: `Cez formulár na webe práve pribudla nová požiadavka od zákazníka.`,
    body: detailsTable,
    footerNote: escapeHtml(config.business.name),
  });

  return { text, html };
}

/* ---------- Customer confirmation ---------- */

function buildCustomerEmail(booking) {
  const text = [
    `Dobrý deň ${booking.name},`,
    "",
    `ďakujeme za vašu rezerváciu v ${config.business.name}.`,
    `- Dátum: ${formatReservationDate(booking.preferredDate)}`,
    `- Čas: ${formatReservationTime(booking.preferredDate)}`,
    `- Služba: ${booking.service}`,
    `- Miesto: ${config.business.address}`,
    "",
    "Ozveme sa vám čo najskôr s potvrdením alebo prípadným doplnením času.",
    "",
    "Ak potrebujete rezerváciu upraviť alebo zrušiť, odpovedzte na tento e-mail alebo nás kontaktujte cez odkaz nižšie.",
    "",
    "Kontakt:",
    `Telefón: ${config.business.phone}`,
    `E-mail: ${config.businessEmail}`,
    `Adresa: ${config.business.address}`,
    "",
    "S pozdravom,",
    config.business.name,
  ]
    .filter(Boolean)
    .join("\n");

  const detailsTable = `
    <table role="presentation" style="width:100%;border-collapse:collapse;">
      ${detailRow("Dátum", escapeHtml(formatReservationDate(booking.preferredDate)))}
      ${detailRow("Čas", escapeHtml(formatReservationTime(booking.preferredDate)))}
      ${detailRow("Služba", escapeHtml(booking.service))}
      ${detailRow("Miesto", escapeHtml(config.business.address), true)}
    </table>

    <div style="margin-top:36px;text-align:center;">
      <a href="${buildManageReservationUrl(booking)}"
         style="display:inline-block;font-size:13px;letter-spacing:.06em;font-weight:600;color:${emailTheme.text};text-decoration:none;border:1px solid ${emailTheme.text};padding:13px 28px;border-radius:2px;">
        UPRAVIŤ ALEBO ZRUŠIŤ REZERVÁCIU
      </a>
    </div>

   
  `;

  const html = emailShell({
    eyebrow: "Potvrdenie rezervácie",
    heading: "Vaša rezervácia je prijatá",
    intro: `Dobrý deň ${escapeHtml(booking.name)}, ďakujeme za vašu dôveru. Ozveme sa vám čo najskôr s potvrdením termínu.`,
    body: detailsTable,
    footerNote: escapeHtml(config.businessEmail),
  });

  return { text, html };
}

async function sendBookingEmails(booking) {
  const mailer = getTransporter();

  const businessContent = buildBusinessEmail(booking);
  try {
    await mailer.sendMail({
      from: `"${config.business.name} — Web" <${config.smtp.user}>`,
      to: config.businessEmail,
      replyTo: booking.email,
      subject: `Nová objednávka: ${booking.service} — ${booking.name}`,
      text: businessContent.text,
      html: businessContent.html,
    });
  } catch (err) {
    console.error("Odoslanie e-mailu (business) zlyhalo:", err && err.message ? err.message : err);
    // Re-throw so callers can react (controller handles fallback response).
    throw err;
  }

  if (config.sendCustomerConfirmation) {
    const customerContent = buildCustomerEmail(booking);
    try {
      await mailer.sendMail({
        from: `"${config.business.name}" <${config.smtp.user}>`,
        to: booking.email,
        subject: `Potvrdenie objednávky — ${config.business.name}`,
        text: customerContent.text,
        html: customerContent.html,
      });
    } catch (err) {
      console.error("Odoslanie e-mailu (customer) zlyhalo:", err && err.message ? err.message : err);
      // Bubble up as well.
      throw err;
    }
  }
}

module.exports = { sendBookingEmails }; 