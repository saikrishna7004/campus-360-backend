const express = require('express');
const OfficeRequest = require('../models/OfficeRequest');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/create', authMiddleware, async (req, res) => {
    const { type, reason } = req.body;
    const userId = req.user.id;
    const existingRequest = await OfficeRequest.findOne({ userId, type, status: 'Pending' });
    if (existingRequest) return res.status(400).json({ message: 'Request already exists for this type.' });

    const newRequest = new OfficeRequest({ userId, type, reason });
    await newRequest.save();
    res.status(201).json(newRequest);
});

router.get('/user', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const requests = await OfficeRequest.find({ userId }).select('type reason description status createdAt');
    res.status(200).json(requests);
});

router.patch('/update/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updatedRequest = await OfficeRequest.findByIdAndUpdate(id, { status }, { new: true });
    res.status(200).json(updatedRequest);
});

module.exports = router;
