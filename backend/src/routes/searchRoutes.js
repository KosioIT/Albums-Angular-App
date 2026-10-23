import express from 'express';

const router = express.Router();

router.get('/', protectOptional, searchAlbums);

export default router;