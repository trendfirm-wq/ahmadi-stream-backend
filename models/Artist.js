const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    bio: { type: String },
    profile_image: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Artist', artistSchema);
