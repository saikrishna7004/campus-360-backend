const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).send({ message: 'User already exists with this email' });
        }

        user = new User({
            name,
            email,
            password,
            role: role || 'student'
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '10d' }
        );

        res.status(201).send({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                vendorType: user.vendorType
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        console.log(isMatch, email, password, user.password);
        if (!isMatch) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '10d' }
        );

        res.send({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                vendorType: user.vendorType,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }
        res.send(user);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error' });
    }
});

module.exports = router;
