const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: null
    },
    inStock: {
        type: Boolean,
        default: true
    },
    type: {
        type: String,
        enum: ['canteen', 'bookstore', 'stationery'],
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
