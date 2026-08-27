import dns from "dns/promises";

export async function getMxRecords(domain) {
  try {
    return await dns.resolveMx(domain);
  } catch {
    return null;
  }
}

export async function getSpfRecord(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map(r => r.join(""));
    return flat.find(r => r.startsWith("v=spf1")) || null;
  } catch {
    return null;
  }
}

const selectors = ["default", "google", "selector1", "selector2", "mail", "smtp"];

export async function getDkimRecord(domain) {
  for (const selector of selectors) {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    try {
      const records = await dns.resolveTxt(dkimDomain);
      const flat = records.map(r => r.join(""));
      const dkim = flat.find(r => r.includes("v=DKIM1"));
      if (dkim) return { selector, record: dkim };
    } catch {}
  }
  return null;
}
