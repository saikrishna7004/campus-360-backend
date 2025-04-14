const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/status', authMiddleware, async (req, res) => {
    try {
        const { isOnline, vendorType } = req.body;

        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }

        if (!['canteen', 'stationery'].includes(vendorType)) {
            return res.status(400).send({ message: 'Invalid vendor type' });
        }

        const vendor = await Vendor.findOneAndUpdate(
            { type: vendorType },
            { isAvailable: isOnline },
            { new: true, upsert: true }
        );

        if (!vendor) {
            return res.status(404).send({ message: 'Vendor not found' });
        }

        res.status(200).send({
            message: 'Status updated successfully',
            isAvailable: isOnline
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/status/:vendorType', async (req, res) => {
    try {
        const { vendorType } = req.params;
        let vendor = await Vendor.findOne({ type: vendorType });
        console.log(vendorType, vendor);

        if (!['canteen', 'stationery'].includes(vendorType)) {
            return res.status(400).send({ message: 'Invalid vendor type' });
        }

        if (!vendor) {
            const newVendor = new Vendor({ type: vendorType, isAvailable: false });
            await newVendor.save();
            vendor = newVendor;
        }

        const isAvailable = vendor.isAvailable || false;

        res.status(200).send({
            message: 'Status fetched successfully',
            isAvailable,
            vendorType
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/dashboard', authMiddleware, async (req, res) => {
    // router.get('/dashboard', async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }

        const { period = 'daily', timeRef } = req.query;
        const { role, id } = req.user;
        const isVendor = role === 'vendor';
        const user = await User.findById(id);
        const vendorType = isVendor ? user.vendorType : null;

        const now = new Date(timeRef || new Date());
        let startDate = new Date(now);
        let endDate = new Date(now);
        let periodLabel;

        switch (period) {
            case 'daily':
                startDate.setHours(startDate.getHours() - 24);
                periodLabel = 'Last 24 Hours';
                break;
            case 'weekly':
                startDate.setDate(startDate.getDate() - 6);
                periodLabel = 'Last 7 Days';
                break;
            case 'monthly':
                startDate.setDate(startDate.getDate() - 29);
                periodLabel = 'Last 30 Days';
                break;
        }

        const baseQuery = {
            createdAt: { $gte: startDate, $lte: endDate },
            ...(isVendor ? { vendor: vendorType } : {})
        };

        // console.log('Base Query:', baseQuery);
        // console.log('Start Date:', startDate);
        // console.log('End Date:', endDate);
        // console.log('Period:', period);

        const [data, previousPeriod] = await Promise.all([
            Order.aggregate([
                { $match: baseQuery },
                {
                    $facet: {
                        sales: [
                            {
                                $project: {
                                    createdAt: 1,
                                    totalAmount: 1,
                                    items: 1
                                }
                            },
                            {
                                $group: {
                                    _id: {
                                        $switch: {
                                            branches: [
                                                {
                                                    case: { $eq: [period, 'daily'] },
                                                    then: {
                                                        sortKey: {
                                                            $dateFromParts: {
                                                                year: { $year: "$createdAt" },
                                                                month: { $month: "$createdAt" },
                                                                day: { $dayOfMonth: "$createdAt" },
                                                                hour: {
                                                                    $multiply: [
                                                                        { $floor: { $divide: [{ $hour: "$createdAt" }, 3] } },
                                                                        3
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        display: {
                                                            $let: {
                                                                vars: {
                                                                    hour: {
                                                                        $multiply: [
                                                                            { $floor: { $divide: [{ $hour: "$createdAt" }, 3] } },
                                                                            3
                                                                        ]
                                                                    }
                                                                },
                                                                in: {
                                                                    $concat: [
                                                                        {
                                                                            $cond: {
                                                                                if: { $lt: ["$$hour", 12] },
                                                                                then: { $toString: "$$hour" },
                                                                                else: {
                                                                                    $cond: {
                                                                                        if: { $eq: ["$$hour", 12] },
                                                                                        then: "12",
                                                                                        else: { $toString: { $subtract: ["$$hour", 12] } }
                                                                                    }
                                                                                }
                                                                            }
                                                                        },
                                                                        ":00 ",
                                                                        {
                                                                            $cond: {
                                                                                if: { $lt: ["$$hour", 12] },
                                                                                then: "AM",
                                                                                else: "PM"
                                                                            }
                                                                        }
                                                                    ]
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                {
                                                    case: { $eq: [period, 'weekly'] },
                                                    then: {
                                                        sortKey: {
                                                            $dateFromParts: {
                                                                year: { $year: "$createdAt" },
                                                                month: { $month: "$createdAt" },
                                                                day: { $dayOfMonth: "$createdAt" }
                                                            }
                                                        },
                                                        display: {
                                                            $let: {
                                                                vars: {
                                                                    dayName: {
                                                                        $switch: {
                                                                            branches: [
                                                                                { case: { $eq: [{ $dayOfWeek: "$createdAt" }, 1] }, then: "Sun" },
                                                                                { case: { $eq: [{ $dayOfWeek: "$createdAt" }, 2] }, then: "Mon" },
                                                                                { case: { $eq: [{ $dayOfWeek: "$createdAt" }, 3] }, then: "Tue" },
                                                                                { case: { $eq: [{ $dayOfWeek: "$createdAt" }, 4] }, then: "Wed" },
                                                                                { case: { $eq: [{ $dayOfWeek: "$createdAt" }, 5] }, then: "Thu" },
                                                                                { case: { $eq: [{ $dayOfWeek: "$createdAt" }, 6] }, then: "Fri" },
                                                                                { case: { $eq: [{ $dayOfWeek: "$createdAt" }, 7] }, then: "Sat" }
                                                                            ]
                                                                        }
                                                                    }
                                                                },
                                                                in: {
                                                                    $concat: [
                                                                        "$$dayName",
                                                                        " ",
                                                                        { $toString: { $dayOfMonth: "$createdAt" } }
                                                                    ]
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                {
                                                    case: { $eq: [period, 'monthly'] },
                                                    then: {
                                                        sortKey: {
                                                            $dateFromParts: {
                                                                year: { $year: "$createdAt" },
                                                                month: { $month: "$createdAt" },
                                                                day: {
                                                                    $subtract: [
                                                                        { $dayOfMonth: "$createdAt" },
                                                                        { $mod: [{ $subtract: [{ $dayOfMonth: "$createdAt" }, 1] }, 7] }
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        display: {
                                                            $toString: {
                                                                $ceil: {
                                                                    $divide: [
                                                                        { $subtract: [{ $dayOfMonth: "$createdAt" }, 1] },
                                                                        7
                                                                    ]
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            ],
                                            default: {
                                                sortKey: "$createdAt",
                                                display: "Other"
                                            }
                                        }
                                    },
                                    totalSales: { $sum: "$totalAmount" }
                                }
                            },
                            {
                                $sort: {
                                    "_id.sortKey": 1
                                }
                            },
                            {
                                $project: {
                                    _id: "$_id.display",
                                    totalSales: 1
                                }
                            }
                        ],
                        summary: [
                            {
                                $group: {
                                    _id: null,
                                    totalSales: { $sum: "$totalAmount" },
                                    avgOrderValue: { $avg: "$totalAmount" },
                                    completedOrders: {
                                        $sum: {
                                            $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                                        }
                                    },
                                    totalOrders: { $sum: 1 },
                                    allOrderValues: { $push: "$totalAmount" }
                                }
                            },
                            {
                                $addFields: {
                                    medianOrderValue: {
                                        $let: {
                                            vars: {
                                                sortedValues: {
                                                    $sortArray: {
                                                        input: "$allOrderValues",
                                                        sortBy: 1
                                                    }
                                                },
                                                mid: {
                                                    $trunc: {
                                                        $divide: [{ $size: "$allOrderValues" }, 2]
                                                    }
                                                }
                                            },
                                            in: {
                                                $cond: {
                                                    if: {
                                                        $eq: [
                                                            { $mod: [{ $size: "$allOrderValues" }, 2] },
                                                            0
                                                        ]
                                                    },
                                                    then: {
                                                        $avg: [
                                                            { $arrayElemAt: ["$$sortedValues", "$$mid"] },
                                                            { $arrayElemAt: ["$$sortedValues", { $subtract: ["$$mid", 1] }] }
                                                        ]
                                                    },
                                                    else: {
                                                        $arrayElemAt: ["$$sortedValues", "$$mid"]
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    totalSales: 1,
                                    avgOrderValue: 1,
                                    totalOrders: 1,
                                    medianOrderValue: 1
                                }
                            }
                        ],
                        topProducts: [
                            { $unwind: "$items" },
                            {
                                $group: {
                                    _id: "$items.productId",
                                    name: { $first: "$items.name" },
                                    quantity: { $sum: "$items.quantity" },
                                    sales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                                }
                            },
                            { $sort: { quantity: -1 } },
                            { $limit: 5 },
                            {
                                $project: {
                                    name: 1,
                                    quantity: 1,
                                    sales: 1
                                }
                            }
                        ],
                        statusDistribution: [
                            {
                                $group: {
                                    _id: "$status",
                                    count: { $sum: 1 }
                                }
                            }
                        ]
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        ...baseQuery,
                        createdAt: {
                            $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
                            $lt: startDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$totalAmount' }
                    }
                }
            ])
        ]);

        console.log('Data:', JSON.stringify(data, null, 2));

        if (!data || !data[0] || !data[0].sales || data[0].sales.length === 0) {
            return res.status(404).send({ message: 'No sales data found for the selected period' });
        }

        const currentData = data[0];
        const salesData = currentData.sales || [];

        if (salesData.length === 0) {
            return res.status(404).send({ message: 'No sales data found for the selected period' });
        }

        let labels = [];
        let values = [];

        if (period === 'daily') {
            salesData.forEach(({ _id, totalSales }) => {
                labels.push(_id);
                values.push(totalSales);
            });
        } else if (period === 'weekly') {
            salesData.forEach(({ _id, totalSales }) => {
                labels.push(_id);
                values.push(totalSales);
            });
        } else if (period === 'monthly') {
            salesData.forEach(({ _id, totalSales }) => {
                labels.push(`Week ${_id}`);
                values.push(totalSales);
            });
        }

        const statusCounts = currentData.statusDistribution.reduce((acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
        }, {});

        const previousSales = previousPeriod[0]?.totalSales || 0;
        const growth = previousSales ? ((currentData.summary[0]?.totalSales - previousSales) / previousSales) * 100 : 0;

        res.json({
            totalSales: currentData.summary[0]?.totalSales || 0,
            avgOrderValue: currentData.summary[0]?.avgOrderValue || 0,
            medianOrderValue: currentData.summary[0]?.medianOrderValue || 0,
            totalOrders: currentData.summary[0]?.totalOrders || 0,
            todayOrders: statusCounts?.preparing || 0,
            completedOrders: statusCounts?.completed || 0,
            cancelledOrders: statusCounts?.cancelled || 0,
            periodLabel,
            chartData: { labels, values },
            topProducts: currentData.topProducts,
            busyHours: currentData.hourlyStats,
            growth: parseFloat(growth.toFixed(1))
        });

    } catch (err) {
        console.error('Dashboard Error:', err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/history', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { startDate, endDate, status } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const query = {};

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (status) {
            query.status = status;
        }

        if (req.user.role === 'vendor') {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'Vendor not found' });
            }
            query.vendor = user.vendorType;
        }

        const [orders, totalOrders, summary] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'name email')
                .populate('items.productId', 'name price')
                .lean(),
            Order.countDocuments(query),
            Order.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$totalAmount' },
                        averageOrderValue: { $avg: '$totalAmount' }
                    }
                }
            ])
        ]);

        res.json({
            orders,
            summary: summary[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                averageOrderValue: 0
            },
            hasMore: skip + orders.length < totalOrders,
            page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders
        });

    } catch (err) {
        console.error('Order history error:', err);
        res.status(500).json({
            message: 'Failed to fetch order history',
            error: err.message
        });
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
