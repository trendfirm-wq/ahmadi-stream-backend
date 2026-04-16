// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const createAdmin = require('./utils/createAdmin');

dotenv.config();

require('./db'); // Connect to MongoDB

const authRoutes = require('./routes/auth');
const trackRoutes = require('./routes/tracks');
const coverUpload = require('./routes/coverUpload');
const uploadRoutes = require('./routes/upload');
const playlistRoutes = require('./routes/playlists');
const hubtelRoutes = require('./routes/hubtel');
const app = express();

// Middleware
app.use(cors());

// ✅ FIXED JSON (VERY IMPORTANT FOR WEBHOOK)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
console.log("🔥 SERVER STARTING...");
console.log("🔥 HUBTEL FILE:", require('./routes/hubtel'));
app.use('/uploads', express.static('uploads'));

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Ahmadi Stream Backend is Live 🚀',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/tracks', coverUpload);
app.use('/api/tracks', uploadRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/hubtel', hubtelRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  await createAdmin();
});