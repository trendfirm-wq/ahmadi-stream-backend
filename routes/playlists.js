const express = require('express');
const router = express.Router();
const Playlist = require('../models/Playlist');
const auth = require('../middleware/auth');

router.use(auth);

// GET playlists
router.get('/', async (req, res) => {
  const playlists = await Playlist.find({
    userId: req.user.id
  });

  res.json(playlists);
});

// CREATE playlist
router.post('/', async (req, res) => {
  const playlist = new Playlist({
    userId: req.user.id,
    name: req.body.name,
    songs: []
  });

  await playlist.save();
  res.json(playlist);
});

// RENAME playlist
router.patch('/:id', async (req, res) => {
  await Playlist.updateOne(
    { _id: req.params.id, userId: req.user.id },
    { name: req.body.name }
  );

  res.json({ success: true });
});

// DELETE playlist
router.delete('/:id', async (req, res) => {
  await Playlist.deleteOne({
    _id: req.params.id,
    userId: req.user.id
  });

  res.json({ success: true });
});

// ADD song
router.post('/:id/song', async (req, res) => {
  const playlist = await Playlist.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!playlist) return res.status(404).json({ message: 'Not found' });

  playlist.songs.push(req.body.song);
  await playlist.save();

  res.json(playlist);
});
// REMOVE song
router.delete('/:id/song/:songId', async (req, res) => {
  try {

    const playlist = await Playlist.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    playlist.songs = playlist.songs.filter(song =>
      song._id?.toString() !== req.params.songId &&
      song.id?.toString() !== req.params.songId
    );

    await playlist.save();

    res.json({ success: true, playlist });

  } catch (err) {
    console.log('Remove song error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;