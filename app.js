const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const userRoutes = require('./routes/users');
const productRoutes = require('./routes/product');
const cartRoutes = require('./routes/cart');
const bookRoutes = require('./routes/book');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-360', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.use('/users', userRoutes);
app.use('/books', bookRoutes);
app.use('/product', productRoutes);
app.use('/cart', cartRoutes);

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).send({ message: 'Access denied' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(400).send({ message: 'Invalid token' });
    }
};

app.post('/verify_token', (req, res) => {
    const { token } = req.body;
    console.log(token);
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        console.log(user);

        const newToken = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '10d' });
        res.send({ user, newToken });
    } catch (err) {
        console.log(err);
        res.status(400).send({ message: 'Invalid token' });
    }
});
app.get('/', (req, res) => {
    res.send('Hello World');
});
module.exports = app;
