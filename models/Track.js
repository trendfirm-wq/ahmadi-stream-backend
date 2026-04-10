const mongoose = require('mongoose');

const trackSchema = new mongoose.Schema({
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    title: { type: String, required: true },

    category: {
        type: String,
        enum: [
            'Akomanyi',
            'Saani',
            'Nazm',
            'Nasheeds',
            'Qaseedas',
            'Tabligh Songs',
            'Poetry',
            'Speeches',
            'Event Recordings',
            'Zainab',
            'Farouk',
            'Prayer',
            'Dua'
        ],
        default: 'Nasheeds'
    },

    // 🔥 NEW → TYPE (audio or video)
    type: {
        type: String,
        enum: ['audio', 'video'],
        default: 'audio'
    },

    // 🎵 AUDIO
    file_path: { type: String },

    // 🎬 VIDEO
    video_url: { type: String },

    cover_image: { type: String, default: '' },

    is_premium: { type: Boolean, default: false },

    total_streams: { type: Number, default: 0 },

    featured: { type: Boolean, default: false },

    uploaded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Track', trackSchema);