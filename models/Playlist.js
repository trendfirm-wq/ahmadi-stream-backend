const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // from JWT
  name: { type: String, required: true },
  songs: { type: Array, default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);