const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    _id: String,
    name: String,
    price: Number,
    quantity: Number,
    vendor: String,
    imageUrl: String,
    isPrintItem: {
        type: Boolean,
        default: false
    },
    printingOptions: {
        numberOfCopies: Number,
        colorType: String,
        printSides: String,
        pageSize: String,
        documentUrl: String,
        documentName: String,
        numberOfPages: Number,
        additionalInfo: String
    }
}, { _id: false });

const documentSchema = new mongoose.Schema({
    id: String,
    name: String,
    url: String,
    printingOptions: {
        numberOfCopies: Number,
        colorType: String,
        printSides: String,
        pageSize: String,
        documentUrl: String,
        documentName: String,
        numberOfPages: Number,
        additionalInfo: String
    },
    cartItemId: String
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    documents: [documentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
