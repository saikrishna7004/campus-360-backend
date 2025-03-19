const mongoose = require('mongoose');

const bookTrackSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    borrowedDate: {
        type: Date,
        default: Date.now
    },
    returnDate: {
        type: Date
    }
});

module.exports = mongoose.model('BookTrack', bookTrackSchema);
