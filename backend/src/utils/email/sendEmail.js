//Email send (common) logic
import nodemailer from "nodemailer";
import { getSmtpConfig } from "./smtpConfig.js";

export async function sendEmail({ to, subject, text, html }) {
  const smtp = await getSmtpConfig(to);

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false  // accept self-signed certificates
    }
  });

  await transporter.sendMail({
    from: `"Album App" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html
  });
}
