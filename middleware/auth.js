const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    console.log(token);
    if (!token) return res.status(401).send({ message: 'Access denied' });
    try {
        req.user = jwt.verify(token?.replace('Bearer ', ''), process.env.JWT_SECRET);
        next();
    } catch (err) {
        console.log(err);
        res.status(400).send({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;
