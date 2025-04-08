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

        const { role, id } = req.user;
        const isVendor = role === 'vendor';
        const vendorType = isVendor ? (await User.findById(id)).vendorType : null;

        const productCount = isVendor
            ? await Product.countDocuments({ vendorType })
            : await Product.countDocuments();
        const totalOrders = isVendor
            ? await Order.countDocuments({ vendor: vendorType })
            : await Order.countDocuments();

        const sales = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['completed', 'ready', 'preparing'] },
                    ...(isVendor ? { vendor: vendorType } : {}),
                },
            },
            {
                $group: { _id: null, total: { $sum: '$totalAmount' } },
            },
        ]);
        const totalSales = sales.length > 0 ? sales[0].total : 0;

        const topProducts = await Product.aggregate([
            { $match: { vendorType: isVendor ? vendorType : { $exists: true } } },
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'items.productId',
                    as: 'orderDetails',
                },
            },
            { $unwind: { path: '$orderDetails', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$name',
                    sales: { $sum: '$orderDetails.totalAmount' },
                },
            },
            { $sort: { sales: -1 } },
            { $limit: 5 },
        ]);

        const totalToday = await getTotalSalesForPeriod(vendorType, 'today');
        const totalWeek = await getTotalSalesForPeriod(vendorType, 'week');
        const totalMonth = await getTotalSalesForPeriod(vendorType, 'month');
        const uniqueItemsSold = await getUniqueItemsSold(vendorType);

        res.send({
            productCount,
            totalOrders,
            totalSales,
            topProducts,
            totalToday,
            totalWeek,
            totalMonth,
            uniqueItemsSold,
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
    const match = {
        status: { $in: ['completed', 'ready', 'preparing'] },
        ...(vendorType && { vendor: vendorType }),
    };

    const date = new Date();
    let startOfPeriod;

    switch (period) {
        case 'week':
            startOfPeriod = new Date(date.setDate(date.getDate() - date.getDay()));
            break;
        case 'month':
            startOfPeriod = new Date(date.setDate(1));
            break;
        case 'today':
        default:
            startOfPeriod = new Date(date.setHours(0, 0, 0, 0));
            break;
    }

    match.createdAt = { $gte: startOfPeriod };

    const sales = await Order.aggregate([
        { $match: match },
        {
            $group: { _id: null, total: { $sum: '$totalAmount' } },
        },
    ]);

    return sales.length > 0 ? sales[0].total : 0;
};

const getUniqueItemsSold = async (vendorType = null) => {
    const match = vendorType ? { vendorType } : {};

    const products = await Product.aggregate([
        { $match: match },
        {
            $lookup: {
                from: 'orders',
                localField: '_id',
                foreignField: 'items.productId',
                as: 'orderDetails',
            },
        },
        { $unwind: '$orderDetails' },
        {
            $group: {
                _id: '$name',
                sold: { $sum: 1 },
            },
        },
    ]);

    return products.length;
};

module.exports = router;
