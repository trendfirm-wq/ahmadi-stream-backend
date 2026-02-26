const express = require('express');
const multer = require('multer');
const Track = require('../models/Track');
const Artist = require('../models/Artist');

const router = express.Router();

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') cb(null, 'uploads/audio');
    else cb(null, 'uploads/covers');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { title, artist_name } = req.body;

    if (!title || !artist_name) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Find or create artist
    let artist = await Artist.findOne({ name: artist_name });

    if (!artist) {
      artist = await Artist.create({ name: artist_name });
    }

    const audioFile = req.files.audio?.[0];
    const coverFile = req.files.cover?.[0];

    const track = new Track({
      title,
      artist: artist._id,
      file_path: audioFile?.path,
      cover_image: coverFile?.path
    });

    await track.save();

    console.log("Track saved");

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});
module.exports = router;
