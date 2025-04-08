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

        await Product.updateMany(
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
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }

        let productCount, totalOrders, totalSales, topProducts, totalToday, totalWeek, totalMonth, uniqueItemsSold;

        if (req.user.role === 'vendor') {
            const user = await User.findById(req.user.id);

            productCount = await Product.countDocuments({ vendorType: user.vendorType });
            totalOrders = await Order.countDocuments({ vendor: user.vendorType });

            const sales = await Order.aggregate([
                { $match: { vendor: user.vendorType, status: { $in: ['completed', 'ready', 'preparing'] } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]);
            totalSales = sales.length > 0 ? sales[0].total : 0;

            topProducts = await Product.aggregate([
                { $match: { vendorType: user.vendorType } },
                { $lookup: { from: 'orders', localField: '_id', foreignField: 'items.product', as: 'orderDetails' } },
                { $unwind: '$orderDetails' },
                { $group: { _id: '$name', sales: { $sum: '$orderDetails.totalAmount' } } },
                { $sort: { sales: -1 } },
                { $limit: 5 }
            ]);

            totalToday = await getTotalSalesForPeriod(user.vendorType, 'today');
            totalWeek = await getTotalSalesForPeriod(user.vendorType, 'week');
            totalMonth = await getTotalSalesForPeriod(user.vendorType, 'month');
            uniqueItemsSold = await getUniqueItemsSold(user.vendorType);
        } else if (req.user.role === 'admin') {
            productCount = await Product.countDocuments();
            totalOrders = await Order.countDocuments();

            const sales = await Order.aggregate([
                { $match: { status: { $in: ['completed', 'ready', 'preparing'] } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]);
            totalSales = sales.length > 0 ? sales[0].total : 0;

            topProducts = await Product.aggregate([
                { $lookup: { from: 'orders', localField: '_id', foreignField: 'items.product', as: 'orderDetails' } },
                { $unwind: '$orderDetails' },
                { $group: { _id: '$name', sales: { $sum: '$orderDetails.totalAmount' } } },
                { $sort: { sales: -1 } },
                { $limit: 5 }
            ]);

            totalToday = await getTotalSalesForPeriod(null, 'today');
            totalWeek = await getTotalSalesForPeriod(null, 'week');
            totalMonth = await getTotalSalesForPeriod(null, 'month');
            uniqueItemsSold = await getUniqueItemsSold();
        }

        res.send({
            productCount,
            totalOrders,
            totalSales,
            topProducts,
            totalToday,
            totalWeek,
            totalMonth,
            uniqueItemsSold
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

const getTotalSalesForPeriod = async (vendorType = null, period = 'today') => {
    const match = { status: { $in: ['completed', 'ready', 'preparing'] } };
    if (vendorType) match.vendor = vendorType;

    const date = new Date();
    let startOfPeriod;

    if (period === 'today') {
        startOfPeriod = new Date(date.setHours(0, 0, 0, 0));
    } else if (period === 'week') {
        startOfPeriod = new Date(date.setDate(date.getDate() - date.getDay()));
        startOfPeriod.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
        startOfPeriod = new Date(date.setDate(1));
        startOfPeriod.setHours(0, 0, 0, 0);
    }

    match.createdAt = { $gte: startOfPeriod };

    const sales = await Order.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    return sales.length > 0 ? sales[0].total : 0;
};

const getUniqueItemsSold = async (vendorType = null) => {
    const match = {};
    if (vendorType) match.vendorType = vendorType;

    const products = await Product.aggregate([
        { $match: match },
        { $lookup: { from: 'orders', localField: '_id', foreignField: 'items.product', as: 'orderDetails' } },
        { $unwind: '$orderDetails' },
        { $group: { _id: '$name', sold: { $sum: 1 } } }
    ]);

    return products.length;
};

module.exports = router;
