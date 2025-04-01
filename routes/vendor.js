const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/status', authMiddleware, async (req, res) => {
    try {
        const { isOnline, vendorType } = req.body;
        
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const products = await Product.updateMany(
            { vendorType },
            { $set: { isAvailable: isOnline } }
        );
        
        res.status(200).send({ message: 'Status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const user = await User.findById(req.user.id);
        const productCount = await Product.countDocuments({ vendorType: user.vendorType });
        
        const orders = await Order.find().sort({ createdAt: -1 }).limit(10);
        
        const totalSales = await Order.aggregate([
            {
                $match: { 
                    status: { $in: ['completed', 'ready', 'preparing'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" }
                }
            }
        ]);
        
        res.send({
            productCount,
            orderCount: orders.length,
            totalSales: totalSales.length > 0 ? totalSales[0].total : 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/orders', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const user = await User.findById(req.user.id);
        const vendorType = user.vendorType;
        
        const { lastFetchTime, status } = req.query;
        const query = {};
        
        if (status) {
            query.status = status;
        } else {
            query.status = { $in: ['preparing', 'ready'] };
        }
        
        if (lastFetchTime) {
            query.updatedAt = { $gt: new Date(lastFetchTime) };
        }
        
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('user', 'name email');
            
        res.send(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
