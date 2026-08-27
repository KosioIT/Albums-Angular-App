// Allowed rank values
const VALID_RANKS = ['gold', 'silver', 'bronze', 'common'];


/**
 * Array of album IDs validator
 */
export function albumIdArrayValidator(fieldName) {
  return body(fieldName)
    .optional()
    .isArray()
    .withMessage(`${fieldName} must be an array`)
    .custom(arr => arr.every(id => typeof id === 'string'))
    .withMessage(`${fieldName} must contain only string IDs`);
}

/**
 * totalLikes validator
 */
export function totalLikesValidator() {
  return body('totalLikes')
    .optional()
    .isNumeric()
    .withMessage('totalLikes must be a number');
}

/**
 * Validate track object
 */
export function validateTrack(track) {
    if (!track || typeof track !== 'object') return 'Track must be an object!';

    if (!track.title || typeof track.title !== 'string') {
        return 'Track title is required and must be a string!';
    }

    if (!track.duration || typeof track.duration !== 'string') {
        return 'Track duration is required and must be a string!';
    }

    if (!Array.isArray(track.composer)) {
        return 'Track composer must be an array of strings!';
    }

    return null; // valid
}

/**
 * Validate album rank
 */
export function validateRank(rank) {
    if (!VALID_RANKS.includes(rank)) {
        return `Rank must be one of: ${VALID_RANKS.join(', ')}!`;
    }
    return null;
}

/**
 * Validate array of strings (producers, composer)
 */
export function validateStringArray(arr, fieldName) {
    if (!Array.isArray(arr)) {
        return `${fieldName} must be an array!`;
    }
    if (!arr.every(item => typeof item === 'string')) {
        return `${fieldName} must contain only strings!`;
    }
    return null;
}

/**
 * Validate album on CREATE (POST)
 */
export function validateAlbumCreate(album) {
    if (!album || typeof album !== 'object') {
        return 'Album must be an object!';
    }

    if (!album.title || typeof album.title !== 'string') {
        return 'Album title is required and must be a string!';
    }

    if (!album.artist || typeof album.artist !== 'string') {
        return 'Album artist is required and must be a string!';
    }

    if (!album.release_date || typeof album.release_date !== 'string') {
        return 'Album release_date is required and must be a string!';
    }

    if (!album.genre || typeof album.genre !== 'string') {
        return 'Album genre is required and must be a string!';
    }

    if (album.producers) {
        const err = validateStringArray(album.producers, 'producers');
        if (err) return err;
    }

    if (album.rank) {
        const err = validateRank(album.rank);
        if (err) return err;
    }

    if (album.tracks) {
        if (!Array.isArray(album.tracks)) {
            return 'Tracks must be an array!';
        }
        for (const track of album.tracks) {
            const err = validateTrack(track);
            if (err) return err;
        }
    }

    return null; // valid
}

/**
 * Validate album on UPDATE (PUT)
 */
export function validateAlbumUpdate(album) {
    if (!album || typeof album !== 'object') {
        return 'Album must be an object!';
    }

    if (album.title && typeof album.title !== 'string') {
        return 'Album title must be a string!';
    }

    if (album.artist && typeof album.artist !== 'string') {
        return 'Album artist must be a string!';
    }

    if (album.release_date && typeof album.release_date !== 'string') {
        return 'Album release_date must be a string!';
    }

    if (album.genre && typeof album.genre !== 'string') {
        return 'Album genre must be a string!';
    }

    if (album.producers) {
        const err = validateStringArray(album.producers, 'producers');
        if (err) return err;
    }

    if (album.rank) {
        const err = validateRank(album.rank);
        if (err) return err;
    }

    if (album.tracks) {
        if (!Array.isArray(album.tracks)) {
            return 'Tracks must be an array!';
        }
        for (const track of album.tracks) {
            const err = validateTrack(track);
            if (err) return err;
        }
    }

    return null; // valid
}
