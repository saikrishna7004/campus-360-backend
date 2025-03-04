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
    inStock: {
        type: Boolean,
        required: true
    },
    maxAllowedQty: {
        type: Number,
        required: true
    },
    image: {
        type: String
    },
    desc: {
        type: String
    },
    rating: {
        type: Number,
        min: 0,
        max: 5
    },
    category: {
        type: String
    },
    type: {
        type: String,
        enum: ['canteen', 'stationery'],
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Item', itemSchema);
