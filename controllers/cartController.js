const Cart = require('../models/Cart');

exports.syncCart = async (req, res) => {
    try {
        const { carts, documents } = req.body;
        const userId = req.user._id;

        if (!Array.isArray(carts)) {
            return res.status(400).json({ error: 'Invalid cart format' });
        }

        const items = carts.flatMap(cart => 
            cart.items.map(item => ({
                _id: item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                vendor: cart.vendor,
                imageUrl: item.imageUrl,
                isPrintItem: item.isPrintItem || false,
                printingOptions: item.printingOptions
            }))
        );

        await Cart.findOneAndUpdate(
            { user: userId },
            { 
                $set: { 
                    items: items,
                    documents: documents || []
                } 
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Cart sync error:', error);
        res.status(500).json({ error: 'Failed to sync cart' });
    }
};

exports.getLatestCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        
        if (!cart) {
            return res.status(200).json({ 
                cart: { items: [] }, 
                documents: [] 
            });
        }

        res.status(200).json({
            cart: { items: cart.items },
            documents: cart.documents || []
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
};
