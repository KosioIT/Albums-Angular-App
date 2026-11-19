import { body } from 'express-validator';
import { validationResultHandler } from './sharedValidators.js';

const name = () =>
    body('name')
        .isString().withMessage('Name must be text')
        .bail()
        .trim()
        .isLength({ min: 1, max: 60 }).withMessage('Name must be 1-60 characters');

const description = () =>
    body('description')
        .optional()
        .isString().withMessage('Description must be text')
        .bail()
        .trim()
        .isLength({ max: 300 }).withMessage('Description must be at most 300 characters');

const isPublic = () => body('isPublic').optional().isBoolean().withMessage('isPublic must be true or false').toBoolean();

export const validatePlaylistCreate = [name(), description(), isPublic(), validationResultHandler];
export const validatePlaylistUpdate = [name().optional(), description(), isPublic(), validationResultHandler];

export const validateTrackAdd = [
    body('albumId').isString().bail().trim().notEmpty().withMessage('albumId is required'),
    body('trackId').isInt({ min: 1 }).withMessage('trackId must be a Deezer track id').toInt(),
    validationResultHandler,
];

export const validateTrackOrder = [
    body('order').isArray({ min: 1, max: 200 }).withMessage('order must list the track ids'),
    body('order.*').isInt({ min: 1 }).withMessage('order must contain track ids').toInt(),
    validationResultHandler,
];
