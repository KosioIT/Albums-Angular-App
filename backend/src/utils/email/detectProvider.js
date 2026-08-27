import { getMxRecords, getSpfRecord, getDkimRecord } from "./dnsLookup.js";

export async function detectProvider(email) {
    const domain = email.split("@")[1];

    const mx = await getMxRecords(domain);
    const spf = await getSpfRecord(domain);
    const dkim = await getDkimRecord(domain);

    if (mx?.[0]?.exchange?.includes("google")) return "gmail";
    if (mx?.[0]?.exchange?.includes("yahoodns")) return "yahoo";
    if (mx?.[0]?.exchange?.includes("outlook")) return "outlook";
    if (mx?.[0]?.exchange?.includes("protonmail")) return "proton";
    if (mx?.[0]?.exchange?.includes("abv.bg")) return "abv";

    if (spf?.includes("google.com")) return "gmail";
    if (spf?.includes("yahoodns")) return "yahoo";
    if (spf?.includes("outlook.com")) return "outlook";

    if (dkim?.record?.includes("google")) return "gmail";
    if (dkim?.record?.includes("yahoo")) return "yahoo";

    return null;
}
