import { body } from 'express-validator';
import { MAX_TEXT, stringArray, validationResultHandler } from './sharedValidators.js';

const VALID_RANKS = ['gold', 'silver', 'bronze', 'common'];
const MAX_TRACKS = 100;
const DURATION_RE = /^\d{1,3}:[0-5]\d$/;

const ALLOWED_DOWNLOAD_HOSTS = [
    'mega.nz', 'drive.google.com', 'dropbox.com', 'onedrive.live.com', '1drv.ms',
];
// matches the host itself and its subdomains (e.g. www.dropbox.com)
const HOST_WHITELIST = ALLOWED_DOWNLOAD_HOSTS.map(
    h => new RegExp(`(^|\\.)${h.replace(/\./g, '\\.')}$`)
);

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

        // null clears the link; anything else must be an https URL on an allowed host
        body('downloadUrl')
            .optional({ values: 'null' })
            .isURL({
                protocols: ['https'],
                require_protocol: true,
                disallow_auth: true,
                host_whitelist: HOST_WHITELIST,
            })
            .withMessage(`downloadUrl must be an https link on: ${ALLOWED_DOWNLOAD_HOSTS.join(', ')}`),

        validationResultHandler,
    ];
}

export const validateAlbumCreate = albumRules(false);
export const validateAlbumUpdate = albumRules(true);