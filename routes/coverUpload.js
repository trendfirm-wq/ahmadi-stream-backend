const express = require('express');
const multer = require('multer');
const Track = require('../models/Track');

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

router.patch('/:id/cover', upload.single('cover'), async (req, res) => {
  try {
    const trackId = req.params.id;

    const coverUrl = `http://10.18.95.127:5000/uploads/${req.file.filename}`;

    const track = await Track.findByIdAndUpdate(
      trackId,
      { cover_image: coverUrl },
      { new: true }
    );

    res.json(track);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cover upload failed' });
  }
});

module.exports = router;
