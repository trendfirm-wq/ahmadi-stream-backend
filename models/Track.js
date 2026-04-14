const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true
  },

  title: {
    type: String,
    required: true
  },

  // ✅ FIXED CATEGORY (LOWERCASE SYSTEM)
  category: {
    type: String,
    enum: [
      'akomanyi',
      'saani',
      'nazm',              // Old Nasheed
      'nasheed',           // Latest Nasheed
      'qaseeda',           // Centenary
      'tabligh_songs',
      'poetry',
      'speech',
      'event_recordings',
      'zainab',
      'farouk',
      'prayer',
      'dua'
    ],
    required: true
  },

  // 🎬 TYPE
  type: {
    type: String,
    enum: ['audio', 'video'],
    default: 'audio'
  },

  // 🎵 AUDIO FILE
  file_path: {
    type: String
  },

  // 🎬 VIDEO FILE
  video_url: {
    type: String
  },

  // 🖼 COVER
  cover_image: {
    type: String,
    default: ''
  },

  // 💎 PREMIUM
  is_premium: {
    type: Boolean,
    default: false
  },

  // 📊 STATS
  total_streams: {
    type: Number,
    default: 0
  },

  // ⭐ FEATURED
  featured: {
    type: Boolean,
    default: false
  },

  // ⏱ DATE
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Track', trackSchema);