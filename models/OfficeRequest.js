const mongoose = require('mongoose');

const OfficeRequestSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    type: { type: String, required: true },
    reason: { type: String },
    description: { type: String },
    status: { type: String, default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('OfficeRequest', OfficeRequestSchema);
