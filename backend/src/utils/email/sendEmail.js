import nodemailer from "nodemailer";

let transporter;

// Created on first use, so the .env values are already loaded
function getTransporter() {
  const { SMTP_SUPPORT_HOST, SMTP_SUPPORT_PORT, SMTP_SUPPORT_USER, SMTP_SUPPORT_PASS } = process.env;

  if (!SMTP_SUPPORT_HOST || !SMTP_SUPPORT_USER || !SMTP_SUPPORT_PASS) {
    throw new Error(
      "Support mailbox is not configured: set SMTP_SUPPORT_HOST, SMTP_SUPPORT_USER and SMTP_SUPPORT_PASS in .env"
    );
  }

  if (!transporter) {
    const port = Number(SMTP_SUPPORT_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: SMTP_SUPPORT_HOST,
      port,
      secure: port === 465, // 587 upgrades to TLS with STARTTLS; the certificate is verified
      auth: { user: SMTP_SUPPORT_USER, pass: SMTP_SUPPORT_PASS },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  await getTransporter().sendMail({
    from: `"Album App" <${process.env.SMTP_SUPPORT_USER}>`,
    to,
    subject,
    text,
    html,
  });
}