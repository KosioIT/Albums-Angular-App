import { matchedData, validationResult } from 'express-validator';
import { validateAlbumCreate } from '../src/validators/albumsValidators.js';

// The same rules as POST /api/albums (the last item is the HTTP response handler, not a rule)
const RULES = validateAlbumCreate.slice(0, -1);

// Returns { data } with sanitized fields, or { errors } with readable messages
export async function validateAlbum(raw) {
    const req = { body: structuredClone(raw) };
    for (const rule of RULES) await rule.run(req);

    const result = validationResult(req);
    if (!result.isEmpty()) {
        return { errors: result.array().map((e) => `${e.path}: ${e.msg}`) };
    }
    return { data: matchedData(req) };
}
