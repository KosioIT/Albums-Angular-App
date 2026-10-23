import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmail } from "./sendEmail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function sendWelcomeEmail(email, username) {
  const templatePath = path.join(__dirname, "templates", "welcome.html");

  let html = fs.readFileSync(templatePath, "utf8");

  html = html
    .replace("{{username}}", username)
    .replace("{{appUrl}}", process.env.APP_URL)
    .replace("{{supportUrl}}", process.env.SUPPORT_URL)
    .replace("{{year}}", new Date().getFullYear().toString());

  await sendEmail({
    to: email,
    subject: "Welcome to Album App!",
    html
  });
}
