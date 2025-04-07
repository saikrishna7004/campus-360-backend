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

app.post('/verify_token', (req, res) => {
    const { token } = req.body;
    
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        
        const newToken = jwt.sign(
            { id: user._id || user.id, role: user.role, name: user.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '10d' }
        );
        
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
