const express = require('express');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const { name, price, description, category, imageUrl, inStock } = req.body;
        
        const book = new Product({
            name,
            price,
            description,
            category,
            imageUrl,
            inStock,
            type: 'bookstore'
        });
        
        await book.save();
        res.status(201).send(book);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const books = await Product.find({ type: 'bookstore' }).sort({ category: 1 });
        res.send(books);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const book = await Product.findOne({ _id: req.params.id, type: 'bookstore' });
        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }
        res.send(book);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const { name, price, description, category, imageUrl, inStock } = req.body;
        
        const book = await Product.findOneAndUpdate(
            { _id: req.params.id, type: 'bookstore' },
            { name, price, description, category, imageUrl, inStock },
            { new: true }
        );
        
        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }
        
        res.send(book);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const book = await Product.findOneAndDelete({ _id: req.params.id, type: 'bookstore' });
        
        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }
        
        res.send({ message: 'Book deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

module.exports = router;