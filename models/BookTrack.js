const mongoose = require('mongoose');

const BookTrackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    borrowedDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('BookTrack', BookTrackSchema);
