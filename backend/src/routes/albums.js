import express from 'express';
import { Album } from '../models/Album.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const albums = await Album.find();
    res.json(albums);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get("/:band", async (req, res) => {
  try {
    const albums = await Album.find({ band: req.params.band });
    res.json(albums);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
