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

router.post('/', async (req, res) => {
  try {
    const album = await Album.create(req.body);
    res.json("Album created successfully: " + album);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body);
    res.json("Album updated successfully: " + album);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Album.findByIdAndDelete(req.params.id);
    res.json({ message: 'Album deleted successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
})

export default router;
