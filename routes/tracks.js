const express = require('express');
const router = express.Router();
const multer = require('multer');
const Track = require('../models/Track');
const Artist = require('../models/Artist');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
console.log("UPLOAD ROUTE HIT");
const User = require('../models/User');
const Stream = require('../models/Stream');

dotenv.config();

// ===== MULTER CONFIG =====
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        if (file.fieldname === 'audio') cb(null, 'uploads/audio');
        else if (file.fieldname === 'cover') cb(null, 'uploads/covers');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// ===== AUTH MIDDLEWARE =====
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

router.post('/upload', upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
   const { title, artist_name, is_premium, category, featured } = req.body;

    if (!title || !artist_name || !req.files.audio) {
      return res.status(400).json({
        message: 'Title, artist name, and audio are required.'
      });
    }

    // ⭐ Find or create artist
    let artist = await Artist.findOne({ name: artist_name });

    if (!artist) {
      artist = new Artist({ name: artist_name });
      await artist.save();
      console.log("Created artist:", artist.name);
    }

    // Upload audio to Cloudinary
    const audioUpload = await cloudinary.uploader.upload(
      req.files.audio[0].path,
      {
        resource_type: "video",
        folder: "ahmadi-music"
      }
    );

    let coverUrl = "";

    if (req.files.cover) {
      const coverUpload = await cloudinary.uploader.upload(
        req.files.cover[0].path,
        { folder: "ahmadi-covers" }
      );

      coverUrl = coverUpload.secure_url;
    }

    // Remove temp files
    fs.unlinkSync(req.files.audio[0].path);
    if (req.files.cover) fs.unlinkSync(req.files.cover[0].path);

 const track = new Track({
  artist: artist._id,
  title,
  category,
  file_path: audioUpload.secure_url,
  cover_image: coverUrl,
  is_premium: is_premium === 'true',
  featured: featured === 'true'   // ⭐ NEW LINE
});
    await track.save();

    res.status(201).json({
      message: 'Track uploaded successfully!',
      track
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', async (req, res) => {
  try {
    const tracks = await Track.find()
      .populate('artist', 'name')
      .sort({ uploaded_at: -1 });

    res.json(tracks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

router.get('/stream/:id', auth, async (req, res) => {
    try {
        const track = await Track.findById(req.params.id);
        if (!track) return res.status(404).json({ message: 'Track not found.' });

        // If premium — check subscription
        if (track.is_premium) {

            const user = await User.findById(req.user.id);

            if (
                !user ||
                user.subscription_status !== 'active' ||
                (user.subscription_expiry && user.subscription_expiry < new Date())
            ) {
                return res.status(403).json({
                    message: 'Subscription required to play this track.'
                });
            }
        }

        // Increment streams
        track.total_streams += 1;
        await track.save();

        res.redirect(track.file_path);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/create-test-artist', async (req, res) => {
  const artist = new Artist({
    name: "Test Artist",
    profile_image: ""
  });

  await artist.save();

  res.json(artist);
});
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;

    const tracks = await Track.find({
      category: new RegExp(`^${category}$`, 'i')
    })
      .populate('artist', 'name')
      .sort({ uploaded_at: -1 });

    res.json(tracks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch category tracks' });
  }
});
router.post('/record-stream', auth, async (req, res) => {
  try {
    const { trackId, duration } = req.body;

    const track = await Track.findById(trackId).populate('artist');

    const stream = new Stream({
      user: req.user.id,
      track: trackId,
      artist: track.artist._id,
      duration
    });

    await stream.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stream record failed' });
  }
});
router.get('/analytics', async (req, res) => {
  try {

    // total listening time
    const totalDuration = await Stream.aggregate([
      { $group: { _id: null, total: { $sum: "$duration" } } }
    ]);

    // total streams count
    const totalStreams = await Stream.countDocuments();

    // top tracks
    const topTracks = await Stream.aggregate([
      {
        $group: {
          _id: "$track",
          totalDuration: { $sum: "$duration" }
        }
      },
      { $sort: { totalDuration: -1 } },
      { $limit: 5 }
    ]);

    const topArtists = await Stream.aggregate([
  {
    $group: {
      _id: "$artist",
      totalDuration: { $sum: "$duration" }
    }
  },
  {
    $lookup: {
      from: "artists",
      localField: "_id",
      foreignField: "_id",
      as: "artistInfo"
    }
  },
  {
    $unwind: "$artistInfo"
  },
  {
    $project: {
      name: "$artistInfo.name",
      totalDuration: 1
    }
  },
  { $sort: { totalDuration: -1 } },
  { $limit: 5 }
]);
    res.json({
      totalMinutes: Math.round((totalDuration[0]?.total || 0) / 60),
      totalStreams,
      topTracks,
      topArtists
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analytics failed' });
  }
});
router.get('/recent-streams', async (req, res) => {
  try {
    const streams = await Stream.find()
      .populate('track', 'title')
      .populate('artist', 'name')
      .populate('user', 'email')
      .sort({ created_at: -1 })
      .limit(50);

    res.json(streams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});
router.get('/behaviour', async (req, res) => {
  try {
    const streams = await Stream.find()
      .populate('track', 'title')
      .populate('artist', 'name')
      .populate('user', 'email')
      .sort({ created_at: -1 })
      .limit(100);

    res.json(streams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Behaviour fetch failed' });
  }
});
router.get('/behaviour-insights', async (req, res) => {
  try {

    // average listen duration
    const avgDuration = await Stream.aggregate([
      {
        $group: {
          _id: null,
          avg: { $avg: "$duration" }
        }
      }
    ]);

    // top listeners
    const topUsers = await Stream.aggregate([
      {
        $group: {
          _id: "$user",
          totalTime: { $sum: "$duration" }
        }
      },
      { $sort: { totalTime: -1 } },
      { $limit: 5 }
    ]);

    const topTracks = await Stream.aggregate([
  {
    $group: {
      _id: "$track",
      totalDuration: { $sum: "$duration" }
    }
  },
  {
    $lookup: {
      from: "tracks",
      localField: "_id",
      foreignField: "_id",
      as: "trackInfo"
    }
  },
  {
    $unwind: "$trackInfo"
  },
  {
    $project: {
      title: "$trackInfo.title",
      totalDuration: 1
    }
  },
  { $sort: { totalDuration: -1 } },
  { $limit: 5 }
]);

    // peak hours
    const peakHours = await Stream.aggregate([
      {
        $group: {
          _id: { $hour: "$created_at" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      avgListenSeconds: avgDuration[0]?.avg || 0,
      topUsers,
      topTracks,
      peakHours
    });

  } catch (err) {
    res.status(500).json({ error: 'Behaviour insights failed' });
  }
});
router.post('/mock-subscribe', auth, async (req, res) => {
  try {
    const { plan } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let expiry = new Date();

    if (plan === 'monthly') {
      expiry.setMonth(expiry.getMonth() + 1);
    } else if (plan === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    user.subscription_status = 'active';
    user.subscription_expiry = expiry;

    await user.save();

    res.json({
      message: 'Mock subscription activated',
      expiry
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Mock payment failed' });
  }
});
module.exports = router;
