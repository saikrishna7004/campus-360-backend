const express = require('express');
const authMiddleware = require('../middleware/auth');
const News = require('../models/news');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const news = await News.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        if (req.body.isBanner) {
            await News.updateMany({ isBanner: true }, { isBanner: false });
        }

        const news = new News(req.body);
        await news.save();
        res.status(201).json(news);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (req.body.isBanner) {
            await News.updateMany({ _id: { $ne: req.params.id }, isBanner: true }, { isBanner: false });
        }

        const news = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!news) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.json(news);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const news = await News.findByIdAndDelete(req.params.id);
        if (!news) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.json({ message: 'News deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
