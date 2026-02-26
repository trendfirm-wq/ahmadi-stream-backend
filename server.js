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

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/tracks', coverUpload);
app.use('/api/tracks', uploadRoutes);
app.use('/api/playlists', require('./routes/playlists'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  await createAdmin(); // ⭐ creates admin automatically
});