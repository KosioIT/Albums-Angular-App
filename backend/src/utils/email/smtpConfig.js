import { smtpProviders } from "./smtpProviders.js";
import { detectProvider } from "./detectProvider.js";

const fallback = {
  host: process.env.FALLBACK_SMTP_HOST || "smtp.mailgun.org",
  port: Number(process.env.FALLBACK_SMTP_PORT) || 587,
  secure: process.env.FALLBACK_SMTP_SECURE === "true"
};

function autoSecurePort(config) {
  config.secure = config.port === 465;
  return config;
}

export async function getSmtpConfig(email) {
  const provider = await detectProvider(email);

  let config = provider ? smtpProviders[provider] : fallback;

  return autoSecurePort(config);
}
