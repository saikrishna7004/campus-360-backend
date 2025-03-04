const express = require('express');
const Item = require('../models/Item');

const router = express.Router();

router.post('/', async (req, res) => {
    const items = req.body.items;
    try {
        const createdItems = await Item.insertMany(items);
        res.status(201).send({ message: 'Items created', items: createdItems });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, inStock, price, maxAllowedQty, image, desc, rating, category, type } = req.body;
    try {
        const item = await Item.findByIdAndUpdate(id, { name, inStock, price, maxAllowedQty, image, desc, rating, category, type }, { new: true });
        if (!item) return res.status(404).send({ message: 'Item not found' });
        res.send({ message: 'Item updated', item });
    } catch (err) {
        res.status(500).send({ message: 'Server error' });
    }
});

router.get('/', async (req, res) => {
    const { category, type } = req.query;
    try {
        const query = {};
        if (category) query.category = category;
        if (type) query.type = type;
        const items = await Item.find(query);
        res.send(items);
    } catch (err) {
        res.status(500).send({ message: 'Server error' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const item = await Item.findByIdAndDelete(id);
        if (!item) return res.status(404).send({ message: 'Item not found' });
        res.send({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).send({ message: 'Server error' });
    }
});

module.exports = router;
