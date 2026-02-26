// db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI) // no extra options
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

module.exports = mongoose;
