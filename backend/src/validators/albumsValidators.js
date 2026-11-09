import { body } from 'express-validator';
import { MAX_TEXT, stringArray, validationResultHandler } from './sharedValidators.js';

const VALID_RANKS = ['gold', 'silver', 'bronze', 'common'];
const MAX_TRACKS = 100;
const DURATION_RE = /^\d{1,3}:[0-5]\d$/;
const LENGTH_RE = /^(\d{1,3}|\d{1,2}:[0-5]\d):[0-5]\d$/; // "65:24" or "2:16:38"


// partial = true → every field is optional (used for updates)
function required(name, partial) {
    const chain = body(name);
    return partial ? chain.optional() : chain.exists().withMessage(`${name} is required`).bail();
}

function text(name, partial) {
    return required(name, partial)
        .isString().withMessage(`${name} must be a string`)
        .bail()
        .trim()
        .notEmpty().withMessage(`${name} must not be empty`)
        .isLength({ max: MAX_TEXT }).withMessage(`${name} must be at most ${MAX_TEXT} characters`);
}

function albumRules(partial) {
    return [
        text('title', partial),
        text('artist', partial),
        text('genre', partial),

        required('release_date', partial)
            .matches(/^\d{2}\.\d{2}\.\d{4}$/)
            .withMessage('release_date must be in DD.MM.YYYY format')
            .bail()
            .isDate({ format: 'DD.MM.YYYY', delimiters: ['.'], strictMode: true })
            .withMessage('release_date must be a valid date'),

        body('cover_img_url')
            .optional({ values: 'null' })
            .isURL({ protocols: ['http', 'https'], require_protocol: true, disallow_auth: true })
            .withMessage('cover_img_url must be an http(s) link')
            .isLength({ max: 2000 }).withMessage('cover_img_url is too long'),

        body('length')
            .optional({ values: 'null' })
            .isString().bail()
            .matches(LENGTH_RE).withMessage('length must be in m:ss or h:mm:ss format'),

        body('deezerAlbumId')
            .optional({ values: 'null' })
            .isInt({ min: 1 }).withMessage('deezerAlbumId must be a Deezer album id')
            .toInt(),

        body('rank').optional()
            .isIn(VALID_RANKS).withMessage(`rank must be one of: ${VALID_RANKS.join(', ')}`),

        ...stringArray('moods'),
        ...stringArray('producers'),

        body('tracks').optional()
            .isArray({ max: MAX_TRACKS }).withMessage(`tracks must be an array with at most ${MAX_TRACKS} items`),
        body('tracks.*')
            .isObject().withMessage('Each track must be an object'),
        body('tracks.*.title')
            .isString().withMessage('Track title must be a string')
            .bail()
            .trim()
            .notEmpty().withMessage('Track title must not be empty')
            .isLength({ max: MAX_TEXT }).withMessage(`Track title must be at most ${MAX_TEXT} characters`),
        body('tracks.*.duration')
            .isString().bail()
            .matches(DURATION_RE).withMessage('Track duration must be in m:ss format'),
        ...stringArray('tracks.*.composer', { required: true }),

        // Object key of the archive in the R2 bucket ("load.zip"); null removes the download
        body('downloadKey')
            .optional({ values: 'null' })
            .isString().bail()
            .trim()
            .isLength({ min: 1, max: 500 }).withMessage('downloadKey must be 1-500 characters')
            .not().matches(/(^\/)|(\.\.)/).withMessage('downloadKey must be a plain object key'),

        validationResultHandler,
    ];
}

export const validateAlbumCreate = albumRules(false);
export const validateAlbumUpdate = albumRules(true);