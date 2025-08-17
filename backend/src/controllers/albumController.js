import Album from '../models/Album.js';

export const getAlbums = async (req, res) => {
  try {
    const albums = await Album.find().populate('createdBy', 'username email');
    res.json(albums);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAlbumById = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id).populate('createdBy', 'username email');
    if (!album) return res.status(404).json({ message: 'Album not found' });
    res.json(album);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAlbum = async (req, res) => {
  try {
    const { title, artist, year, genre, tracks, coverUrl } = req.body;

    const album = new Album({
      title,
      artist,
      year,
      genre,
      tracks,
      coverUrl,
      createdBy: req.user._id,
    });

    const createdAlbum = await album.save();
    res.status(201).json(createdAlbum);
  } catch (err) {
    res.status(400).json({ message: 'Invalid data' });
  }
};


export const updateAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album not found' });

    if (album.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, artist, year, genre, tracks, coverUrl } = req.body;

    album.title = title || album.title;
    album.artist = artist || album.artist;
    album.year = year || album.year;
    album.genre = genre || album.genre;
    album.tracks = tracks || album.tracks;
    album.coverUrl = coverUrl || album.coverUrl;

    const updatedAlbum = await album.save();
    res.json(updatedAlbum);
  } catch (err) {
    res.status(400).json({ message: 'Invalid data' });
  }
};


export const deleteAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album not found' });

    if (album.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await album.remove();
    res.json({ message: 'Album removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
