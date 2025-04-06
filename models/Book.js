const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    author: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        required: true
    },
    pdfUrl: {
        type: String
    },
    tags: [{
        type: String
    }],
}, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
