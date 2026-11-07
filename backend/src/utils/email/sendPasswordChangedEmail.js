import { sendEmail } from "./sendEmail.js";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

export async function sendPasswordChangedEmail(email, username) {
  const when = new Date().toUTCString();
  const name = escapeHtml(username);
  const supportUrl = process.env.SUPPORT_URL;

  const text =
    `Hi ${username},\n\n` +
    `The password for your Album App account was changed on ${when}.\n\n` +
    `If this was you, no action is needed.\n` +
    `If it wasn't, reset your password again right away and secure your email account` +
    (supportUrl ? `, then contact support: ${supportUrl}` : ".");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #222;">
      <h2 style="margin: 0 0 16px;">Your password was changed</h2>
      <p>Hi ${name},</p>
      <p>The password for your <strong>Album App</strong> account was changed on ${when}.</p>
      <p>If this was you, no action is needed.</p>
      <p style="background: #fff4e5; padding: 12px; border-radius: 6px;">
        <strong>If it wasn't you</strong>, reset your password again right away and make sure
        your email account is secure${supportUrl ? `, then <a href="${supportUrl}">contact support</a>` : ""}.
      </p>
    </div>`;

  await sendEmail({
    to: email,
    subject: "Your Album App password was changed",
    text,
    html,
  });
}