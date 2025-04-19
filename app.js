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
const orderRoutes = require('./routes/order');
const vendorRoutes = require('./routes/vendor');
const officeRoutes = require('./routes/office');
const newsRoutes = require('./routes/news');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-360', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.use('/auth', userRoutes);
app.use('/books', bookRoutes);
app.use('/product', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/vendor', vendorRoutes);
app.use('/office', officeRoutes);
app.use('/news', newsRoutes);

app.post('/verify_token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(401).send('No token provided');
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const newToken = jwt.sign(
            { id: decoded.id, role: decoded.role, name: decoded.name },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.send({ user: decoded, newToken });
    } catch (err) {
        res.status(401).send(err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token');
    }
});

const tokenExpirationMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).send('Token expired');
        }
        next();
    }
};

app.use(tokenExpirationMiddleware);

app.get('/', (req, res) => {
    res.send('Hello World');
});

module.exports = app;
