const express = require('express');
const Cart = require('../models/Cart');
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

router.get('/latest', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.item');
        if (!cart) {
            return res.status(200).send({ message: 'No cart found', cart: { items: [] } });
        }
        res.status(200).send({ message: 'Cart fetched successfully', cart });
    } catch (err) {
        console.error('Error fetching latest cart:', err);
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

router.post('/sync', authMiddleware, async (req, res) => {
    const { carts } = req.body;
    const userId = req.user.id;

    try {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        cart.items = carts.flatMap(cart => cart.items.map(item => ({
            item: item._id,
            quantity: item.quantity,
            vendor: cart.vendor,
        })));

        await cart.save();
        res.status(200).send({ message: 'Cart synced successfully', cart });
    } catch (err) {
        console.error('Error syncing cart:', err);
        res.status(500).send({ message: 'Server error' });
    }
});

module.exports = router;
