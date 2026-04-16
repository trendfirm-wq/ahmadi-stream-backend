const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({

  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    enum: [
      'akomanyi',
      'saani',
      'nazm',
      'nasheed',
      'qaseeda',
      'tabligh_songs',
      'poetry',
      'speech',
      'event_recordings',
      'zainab',
      'farouk',
      'prayer',
      'dua'
    ],
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ['audio', 'video'],
    default: 'audio'
  },

  file_path: {
    type: String
  },

  video_url: {
    type: String
  },

  cover_image: {
    type: String,
    default: ''
  },

  is_premium: {
    type: Boolean,
    default: false,
    index: true
  },

  total_streams: {
    type: Number,
    default: 0,
    index: true
  },

  featured: {
    type: Boolean,
    default: false,
    index: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Track', trackSchema);