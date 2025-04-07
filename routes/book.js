const express = require('express');
const authMiddleware = require('../middleware/auth');
const Book = require('../models/Book');
const BookTrack = require('../models/BookTrack');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }

        const books = Array.isArray(req.body) ? req.body : [req.body];
        console.log(books);

        const createdBooks = await Book.insertMany(
            books.map(({ title, description, author, image, count, pdfUrl, tags }) => ({
                title,
                description,
                author,
                image,
                count,
                pdfUrl,
                tags
            }))
        );

        res.status(201).send(createdBooks);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const books = await Book.find().sort({ title: 1 }).select('title description author image count pdfUrl tags');
        res.send(books);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).select('title description author image count pdfUrl tags');
        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }
        res.send(book);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }

        const { title, description, author, image, count, pdfUrl, tags } = req.body;

        const book = await Book.findByIdAndUpdate(
            req.params.id,
            { title, description, author, image, count, pdfUrl, tags },
            { new: true }
        );

        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }

        res.send(book);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).send({ message: 'Access denied' });
        }

        const book = await Book.findByIdAndDelete(req.params.id);

        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }

        res.send({ message: 'Book deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.post('/borrow/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const activeBorrows = await BookTrack.find({ userId, returnDate: null });
        if (activeBorrows.length >= 2) {
            return res.status(400).send({ message: 'You can only hold 2 books at a time.' });
        }

        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).send({ message: 'Book not found' });
        }

        if (book.count <= 0) {
            return res.status(400).send({ message: 'Book is not available.' });
        }

        book.count -= 1;
        await book.save();

        const bookTrack = new BookTrack({
            userId,
            bookId: book._id,
            borrowedDate: new Date()
        });
        await bookTrack.save();

        res.status(200).send(book);
    } catch (err) {
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

router.get('/borrowed', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const borrowedBooks = await BookTrack.find({ userId, returnDate: null }).populate('bookId', 'title author image count');
        res.status(200).send(borrowedBooks.map(track => ({
            ...track.bookId.toObject(),
            borrowedDate: track.borrowedDate,
            deadline: new Date(track.borrowedDate.getTime() + 60 * 24 * 60 * 60 * 1000)
        })));
    } catch (err) {
        res.status(500).send({ message: 'Server error', error: err.message });
    }
});

module.exports = router;