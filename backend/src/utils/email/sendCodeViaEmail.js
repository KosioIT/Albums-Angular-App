import { sendEmail } from "./sendEmail.js";

export async function sendCodeViaEmail(email, code) {
  await sendEmail({
    to: email,
    subject: "Your verification code",
    text: `Your code is: ${code}`,
    html: `<p>Your code is: <strong>${code}</strong></p>`
  });
}
