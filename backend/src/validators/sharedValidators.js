import { body, validationResult } from 'express-validator';

export const MAX_TEXT = 200;
export const MAX_LIST = 30;

// Rules for "array of non-empty strings" (moods, producers, tracks.*.composer...)
export function stringArray(path, { max = MAX_LIST, required = false } = {}) {
    const list = body(path);
    return [
        (required ? list : list.optional())
            .isArray({ max })
            .withMessage(`${path} must be an array with at most ${max} items`),
        body(`${path}.*`)
            .isString().withMessage(`${path} must contain only strings`)
            .bail()
            .trim()
            .notEmpty().withMessage(`${path} must not contain empty strings`)
            .isLength({ max: MAX_TEXT }).withMessage(`${path} items must be at most ${MAX_TEXT} characters`),
    ];
}

export function validationResultHandler(req, res, next) {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array({ onlyFirstError: true });
    return res.status(400).json({
        success: false,
        message: errors[0].msg,
        errors,
    });
}