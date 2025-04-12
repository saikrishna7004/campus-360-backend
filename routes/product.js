const express = require('express');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');
const Vendor = require('../models/Vendor');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const { name, price, description, category, imageUrl, type, inStock } = req.body;
        
        const product = new Product({
            name,
            price,
            description,
            category,
            imageUrl,
            type,
            inStock
        });
        
        await product.save();
        res.status(201).send(product);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/:type', async (req, res) => {
    try {
        const { type } = req.params;
        if (!['canteen', 'stationery'].includes(type)) {
            return res.status(400).send({ message: 'Invalid product type' });
        }
        
        let vendor = await Vendor.findOne({ type });
        
        if (!vendor) {
            const newVendor = new Vendor({ type: vendorType, isAvailable: false });
            await newVendor.save();
            vendor = newVendor;
        }

        if (!vendor.isAvailable) {
            return res.status(200).send({ message: 'Vendor not available', isAvailable: false });
        }

        const products = await Product.find({ type }).sort({ category: 1 });
        
        res.send(products);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/id/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send({ message: 'Product not found' });
        }
        res.send(product);
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
        
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { name, price, description, category, imageUrl, inStock },
            { new: true }
        );
        
        if (!product) {
            return res.status(404).send({ message: 'Product not found' });
        }
        
        res.send(product);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        
        if (!product) {
            return res.status(404).send({ message: 'Product not found' });
        }
        
        res.send(product);
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
        
        const product = await Product.findByIdAndDelete(req.params.id);
        
        if (!product) {
            return res.status(404).send({ message: 'Product not found' });
        }
        
        res.send({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
