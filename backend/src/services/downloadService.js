import jwt from 'jsonwebtoken';
import { File } from 'megajs';

/*
  Album downloads go through the backend: it fetches the archive from Mega, decrypts it and
  streams it to the browser as a normal file download. The Mega link (which would open the
  whole folder) never reaches the client.

  The browser starts the download by opening a URL, so it cannot send the Authorization header.
  Instead a signed-in user gets a short-lived ticket, valid for one album and one minute.
*/

const TICKET_TTL = '60s';
const TICKET_TYPE = 'album-download'; // so an access token can never be used as a ticket

export function createDownloadTicket(userId, albumId) {
    return jwt.sign({ typ: TICKET_TYPE, uid: userId, aid: albumId }, process.env.JWT_SECRET, { expiresIn: TICKET_TTL });
}

// Returns the user id, or null when the ticket is invalid, expired or for another album
export function readDownloadTicket(ticket, albumId) {
    try {
        const data = jwt.verify(String(ticket || ''), process.env.JWT_SECRET, { algorithms: ['HS256'] });
        return data.typ === TICKET_TYPE && data.aid === albumId ? data.uid : null;
    } catch {
        return null;
    }
}

// The archive behind a Mega link (a file link, or a file inside a shared folder)
export async function openMegaFile(megaUrl) {
    const file = await File.fromURL(megaUrl).loadAttributes();
    if (file.directory) throw new Error('The download link points to a folder, not a file');
    return { name: file.name, size: file.size, stream: () => file.download() };
}

// Safe for the Content-Disposition header: ASCII fallback plus the exact name (RFC 6266)
export function attachmentHeader(fileName) {
    const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
