const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  track: { type: mongoose.Schema.Types.ObjectId, ref: 'Track' },
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist' },
  duration: Number, // seconds listened
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stream', streamSchema);