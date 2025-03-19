const express = require('express');
const Book = require('../models/Book');
const BookTrack = require('../models/BookTrack');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const books = await Book.find();
        res.json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    const { title, author, image, description, count } = req.body;
    try {
        const book = new Book({ title, author, image, description, count });
        await book.save();
        res.status(201).json(book);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/borrow/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const book = await Book.findById(id);
        if (!book) return res.status(404).json({ message: 'Book not found' });

        if (book.count <= 0) return res.status(400).json({ message: 'Book not available' });

        book.count -= 1;
        book.available = book.count > 0;
        await book.save();
        console.log(book)
        res.json(book);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/borrow', async (req, res) => {
    const { email, bookId } = req.body;
    try {
        const userBooks = await BookTrack.find({ email, returnDate: null });
        if (userBooks.length >= 2) {
            return res.status(400).json({ message: 'User cannot borrow more than 2 books' });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.count <= 0) {
            return res.status(400).json({ message: 'Book not available' });
        }

        const bookTrack = new BookTrack({ email, bookId });
        await bookTrack.save();

        book.count -= 1;
        await book.save();

        res.status(201).json(bookTrack);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/return', async (req, res) => {
    const { email, bookId } = req.body;
    try {
        const bookTrack = await BookTrack.findOne({ email, bookId, returnDate: null });
        if (!bookTrack) {
            return res.status(404).json({ message: 'Borrow record not found' });
        }

        bookTrack.returnDate = new Date();
        await bookTrack.save();

        const book = await Book.findById(bookId);
        book.count += 1;
        await book.save();

        res.json(bookTrack);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/borrowed', async (req, res) => {
    try {
        const borrowedBooks = await BookTrack.find({ returnDate: null }).populate('bookId');
        res.json(borrowedBooks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        await BookTrack.deleteMany({ bookId: id });
        await book.remove();

        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;