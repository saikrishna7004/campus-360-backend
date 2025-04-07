const express = require('express');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

function generateOrderId() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ORD${year}${month}${day}${randomNum}`;
}

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { items, totalAmount, vendor } = req.body;
        
        if (!items?.length || !totalAmount || !vendor) {
            return res.status(400).json({ 
                success: false,
                message: 'Missing required fields' 
            });
        }

        const orderId = generateOrderId();
        const newOrder = new Order({
            orderId,
            user: req.user.id,
            vendor,
            items,
            totalAmount,
            paymentMethod: 'Google Pay UPI',
            status: 'preparing'
        });
        
        const savedOrder = await newOrder.save();
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId: savedOrder.orderId,
            order: savedOrder
        });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create order',
            error: err.message 
        });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { lastFetchTime, status } = req.query;
        const query = { user: req.user.id };
        
        if (status) {
            query.status = status;
        }
        
        if (lastFetchTime) {
            query.updatedAt = { $gt: new Date(lastFetchTime) };
        }
        
        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.send(orders);
    } catch (err) {
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/history', authMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select('-__v')
            .lean();

        const processedOrders = orders.map(order => ({
            ...order,
            vendor: order.vendor || 'default'
        }));

        res.json(processedOrders);
    } catch (err) {
        console.error('Order history fetch error:', err);
        res.status(500).json({ 
            message: 'Failed to fetch order history',
            error: err.message 
        });
    }
});

router.get('/admin', authMiddleware, async (req, res) => {
    try {
        const { lastFetchTime, status } = req.query;
        
        if (req.user.role !== 'admin' && req.user.role !== 'canteen') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const query = {};
        
        if (req.user.role === 'canteen') {
            query.vendor = req.user.type === 'food' ? 'canteen' : 'stationery';
        }
        
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
            .populate('user', 'name email')
            .lean();
            
        res.json(orders);
    } catch (err) {
        console.error('Admin orders fetch error:', err);
        res.status(500).json({ 
            message: 'Failed to fetch admin orders',
            error: err.message 
        });
    }
});

router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: req.params.id },
            { status },
            { 
                new: true,
                runValidators: true 
            }
        ).lean();

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (req.user.role === 'canteen') {
            const vendorType = req.user.type === 'food' ? 'canteen' : 'stationery';
            if (updatedOrder.vendor !== vendorType) {
                return res.status(403).json({ message: 'Not authorized to update this order' });
            }
        }
        
        res.json({ 
            success: true,
            message: 'Order status updated successfully',
            order: updatedOrder
        });
    } catch (err) {
        console.error('Order status update error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update order status',
            error: err.message 
        });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .select('-__v')
            .lean();

        if (!order) {
            return res.status(404).send({ message: 'Order not found' });
        }
        
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }
        
        const processedOrder = {
            ...order,
            vendor: order.vendor || 'default'
        };
        
        res.json(processedOrder);
    } catch (err) {
        console.error('Order fetch error:', err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
