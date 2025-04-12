const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['canteen', 'stationery'],
        required: true,
        unique: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
