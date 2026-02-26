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

        // ✅ NEW
        'Prayer',
        'Dua'
    ],
    default: 'Nasheeds'
},

    file_path: { type: String, required: true },
    cover_image: { type: String, default: '' },

    is_premium: { type: Boolean, default: false },
    total_streams: { type: Number, default: 0 },

    // 🔥 ADD THIS
    featured: { type: Boolean, default: false },

    uploaded_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Track', trackSchema);