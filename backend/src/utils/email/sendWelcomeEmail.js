import fs from "fs";
import path from "path";
import { sendEmail } from "./sendEmail.js";

export async function sendWelcomeEmail(email, username) {
  const templatePath = path.join(
    process.cwd(),
    "utils",
    "email",
    "templates",
    "welcome.html"
  );

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
