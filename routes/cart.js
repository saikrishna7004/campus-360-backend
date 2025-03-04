const express = require('express');
const Cart = require('../models/Cart');
const Item = require('../models/Item');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    const { items } = req.body;
    const userId = req.user.id;

    try {
        const cart = new Cart({ user: userId, items });
        await cart.save();
        res.status(201).send({ message: 'Cart created', cart });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: 'Server error' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    try {
        const cart = await Cart.findByIdAndUpdate(id, { items }, { new: true });
        if (!cart) return res.status(404).send({ message: 'Cart not found' });
        res.send({ message: 'Cart updated', cart });
    } catch (err) {
        res.status(500).send({ message: 'Server error' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.item');
        if (!cart) return res.status(404).send({ message: 'Cart not found' });
        res.send(cart);
    } catch (err) {
        res.status(500).send({ message: 'Server error' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const cart = await Cart.findByIdAndDelete(id);
        if (!cart) return res.status(404).send({ message: 'Cart not found' });
        res.send({ message: 'Cart deleted' });
    } catch (err) {
        res.status(500).send({ message: 'Server error' });
    }
});

module.exports = router;
