// What a banned user is told when they try to sign in (or are refused on a request)
export function banMessage(ban) {
    const until = ban.until
        ? `until ${new Date(ban.until).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} (UTC)`
        : 'permanently';
    return `Your account is banned ${until}. Reason: ${ban.reason}`;
}

// The body of a 403 for a banned user: the frontend shows the message and can read the details
export const bannedResponse = (ban) => ({
    success: false,
    banned: true,
    message: banMessage(ban),
    ban: { reason: ban.reason, until: ban.until ?? null },
});
