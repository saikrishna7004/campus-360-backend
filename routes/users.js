const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ message: 'Email already registered' });
        }

        const hashedPassword = await bcryptjs.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role, status: 'pending' });

        await user.save();
        res.status(201).send({ message: 'Registration successful' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).send({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).send({ message: 'User not found' });
        if (user.status !== 'approved') return res.status(403).send({ message: 'Account not approved' });
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).send({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '10d' });
        res.send({ token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send({ message: 'Server error' });
    }
});

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).send({ message: 'Access denied' });
    try {
        req.user = jwt.verify(token?.replace('Bearer ', ''), process.env.JWT_SECRET);
        next();
    } catch (err) {
        console.log(err);
        res.status(400).send({ message: 'Invalid token' });
    }
};

router.get('/pending', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ status: { $in: ['pending', 'rejected'] } });

        res.send(users);
    } catch (err) {
        console.error('Error fetching pending users:', err);
        res.status(500).send({ message: 'Server error' });
    }
});

router.put('/:id/approve', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status = 'approved' } = req.body;

    try {
        const user = await User.findByIdAndUpdate(id, { status: status }, { new: true });
        if (!user) return res.status(404).send({ message: 'User not found' });
        res.send({ message: 'User approved', user });
    } catch (err) {
        console.error('Error approving user:', err);
        res.status(500).send({ message: 'Server error' });
    }
});

module.exports = router;
