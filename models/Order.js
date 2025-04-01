const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    name: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
});

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vendor: {
        type: String,
        enum: ['canteen', 'stationery', 'default'],
        required: true,
        index: true
    },
    items: [orderItemSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        default: 'Google Pay UPI'
    },
    status: {
        type: String,
        enum: ['preparing', 'ready', 'completed', 'cancelled'],
        default: 'preparing',
        index: true
    }
}, { 
    timestamps: true,
    collation: { locale: 'en', strength: 2 }
});

orderSchema.index({ vendor: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
