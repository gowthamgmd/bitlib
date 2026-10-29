const express = require('express');
const { Book, BookCopy, BookLoan, User, Notification } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const MAX_BORROW_LIMIT = 3;
const LENDING_DAYS = 14;
const DAILY_FINE_RATE = 2.0; // ₹2 per day

// Helper: Calculate overdue fine
function calculateFine(dueDate, returnDate = new Date()) {
  const due = new Date(dueDate);
  const ret = new Date(returnDate);
  if (ret <= due) return 0.0;
  const diffTime = Math.abs(ret - due);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays * DAILY_FINE_RATE;
}

// 1. Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Book.distinct('category');
    res.json({ categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// 2. Browse & Search Books with real-time copy availability
router.get('/', async (req, res) => {
  try {
    const { search, category, available_only } = req.query;
    let query = {};

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { author: regex },
        { isbn: regex },
        { category: regex }
      ];
    }

    const books = await Book.find(query).sort({ title: 1 }).lean();

    // Attach copy counts to each book
    const bookIds = books.map(b => b._id);
    const copies = await BookCopy.find({ book: { $in: bookIds } }).lean();

    const copyStatsMap = new Map();
    copies.forEach(copy => {
      const bId = copy.book.toString();
      if (!copyStatsMap.has(bId)) {
        copyStatsMap.set(bId, { total: 0, available: 0, shelves: new Set() });
      }
      const stat = copyStatsMap.get(bId);
      stat.total++;
      if (copy.status === 'AVAILABLE') {
        stat.available++;
      }
      if (copy.shelf_location) {
        stat.shelves.add(copy.shelf_location);
      }
    });

    let results = books.map(book => {
      const stats = copyStatsMap.get(book._id.toString()) || { total: 0, available: 0, shelves: new Set() };
      return {
        ...book,
        total_copies: stats.total,
        available_copies: stats.available,
        shelf_locations: Array.from(stats.shelves)
      };
    });

    if (available_only === 'true') {
      results = results.filter(b => b.available_copies > 0);
    }

    res.json({ books: results });
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Failed to search books.' });
  }
});

// 3. Get single book details with copies list
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const copies = await BookCopy.find({ book: book._id }).lean();
    const availableCount = copies.filter(c => c.status === 'AVAILABLE').length;

    res.json({
      book,
      total_copies: copies.length,
      available_copies: availableCount,
      copies
    });
  } catch (err) {
    console.error('Error fetching book details:', err);
    res.status(500).json({ error: 'Failed to fetch book details.' });
  }
});

// 4. Student: Borrow a book
router.post('/borrow', authenticateToken, async (req, res) => {
  try {
    const { book_id } = req.body;
    const userId = req.user.id;

    if (!book_id) {
      return res.status(400).json({ error: 'Book ID is required.' });
    }

    const book = await Book.findById(book_id);
    if (!book) {
      return res.status(404).json({ error: 'Book record not found.' });
    }

    // A. Check student's active borrowing limit
    const activeLoans = await BookLoan.find({
      user: userId,
      status: { $in: ['ISSUED', 'OVERDUE'] }
    });

    if (activeLoans.length >= MAX_BORROW_LIMIT) {
      return res.status(400).json({
        error: `Borrowing Limit Exceeded: You already have ${activeLoans.length} active book loans. The maximum permitted is ${MAX_BORROW_LIMIT}. Please return a book before borrowing another.`
      });
    }

    // B. Check if student already holds a copy of this book
    const alreadyHolding = activeLoans.some(loan => loan.book.toString() === book._id.toString());
    if (alreadyHolding) {
      return res.status(400).json({
        error: `You already have an active borrowed copy of "${book.title}". Students cannot borrow multiple copies of the same title.`
      });
    }

    // C. Check if student has unpaid overdue fines exceeding ₹50
    const totalPendingFines = activeLoans.reduce((sum, loan) => {
      return sum + calculateFine(loan.due_date);
    }, 0);

    if (totalPendingFines >= 50) {
      return res.status(403).json({
        error: `Borrowing Suspended: You have ₹${totalPendingFines} in accumulated overdue fines. Please clear your dues at the library counter to borrow books.`
      });
    }

    // D. Find and atomically lock an available physical copy
    const availableCopy = await BookCopy.findOneAndUpdate(
      { book: book._id, status: 'AVAILABLE' },
      { status: 'BORROWED' },
      { new: true }
    );

    if (!availableCopy) {
      return res.status(409).json({
        error: `All physical copies of "${book.title}" are currently checked out. Please check back later.`
      });
    }

    // E. Calculate due date: now + 14 days
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LENDING_DAYS);

    const loan = await BookLoan.create({
      copy: availableCopy._id,
      book: book._id,
      user: userId,
      issue_date: issueDate,
      due_date: dueDate,
      status: 'ISSUED'
    });

    // F. Create notification
    await Notification.create({
      user: userId,
      title: 'Book Borrowed Successfully',
      message: `You borrowed "${book.title}" (Barcode: ${availableCopy.barcode}). Due date: ${dueDate.toISOString().split('T')[0]}. Standard loan period is 14 days.`,
      type: 'BOOK'
    });

    const populatedLoan = await BookLoan.findById(loan._id)
      .populate('book')
      .populate('copy');

    res.status(201).json({
      message: `Successfully borrowed "${book.title}"!`,
      loan: populatedLoan
    });
  } catch (err) {
    console.error('Borrow error:', err);
    res.status(500).json({ error: 'Failed to process book borrowing.' });
  }
});

// 5. Return a borrowed book
router.post('/return', authenticateToken, async (req, res) => {
  try {
    const { loan_id, barcode } = req.body;
    let loan;

    if (loan_id) {
      loan = await BookLoan.findById(loan_id).populate('book').populate('copy');
    } else if (barcode) {
      const copy = await BookCopy.findOne({ barcode: barcode.trim() });
      if (!copy) return res.status(404).json({ error: 'Barcode not found.' });
      loan = await BookLoan.findOne({ copy: copy._id, status: { $in: ['ISSUED', 'OVERDUE'] } }).populate('book').populate('copy');
    }

    if (!loan) {
      return res.status(404).json({ error: 'Active loan record not found for this book.' });
    }

    // Authorization: owner student or admin
    if (loan.user.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not authorized to return this book.' });
    }

    if (loan.status === 'RETURNED') {
      return res.status(400).json({ error: 'This book has already been returned.' });
    }

    const returnDate = new Date();
    const fineAmount = calculateFine(loan.due_date, returnDate);

    // Update loan record
    loan.return_date = returnDate;
    loan.fine_amount = fineAmount;
    loan.status = 'RETURNED';
    await loan.save();

    // Release copy back to available pool
    await BookCopy.findByIdAndUpdate(loan.copy._id, { status: 'AVAILABLE' });

    // Notification
    const fineMsg = fineAmount > 0 ? ` Overdue fine applied: ₹${fineAmount}.` : '';
    await Notification.create({
      user: loan.user,
      title: 'Book Returned',
      message: `"${loan.book.title}" (Barcode: ${loan.copy.barcode}) returned successfully.${fineMsg}`,
      type: fineAmount > 0 ? 'FINE' : 'BOOK'
    });

    res.json({
      message: `Book "${loan.book.title}" returned successfully!`,
      loan,
      fine_amount: fineAmount
    });
  } catch (err) {
    console.error('Return error:', err);
    res.status(500).json({ error: 'Failed to process book return.' });
  }
});

// 6. Student: Get My Book Loans (Active, Returned, Overdue)
router.get('/my/loans', authenticateToken, async (req, res) => {
  try {
    const loans = await BookLoan.find({ user: req.user.id })
      .populate('book')
      .populate('copy')
      .sort({ issue_date: -1 })
      .lean();

    const now = new Date();
    const enrichedLoans = loans.map(loan => {
      let currentFine = loan.fine_amount;
      let currentStatus = loan.status;

      if (loan.status === 'ISSUED') {
        const due = new Date(loan.due_date);
        if (now > due) {
          currentStatus = 'OVERDUE';
          currentFine = calculateFine(loan.due_date, now);
        }
      }

      return {
        ...loan,
        status: currentStatus,
        fine_amount: currentFine,
        is_overdue: currentStatus === 'OVERDUE'
      };
    });

    const activeCount = enrichedLoans.filter(l => l.status === 'ISSUED' || l.status === 'OVERDUE').length;
    const totalFines = enrichedLoans.reduce((sum, l) => sum + l.fine_amount, 0);

    res.json({
      active_loans_count: activeCount,
      max_borrow_limit: MAX_BORROW_LIMIT,
      total_fines: totalFines,
      loans: enrichedLoans
    });
  } catch (err) {
    console.error('Error fetching my loans:', err);
    res.status(500).json({ error: 'Failed to fetch personal loans.' });
  }
});

// 7. Admin: Get all currently overdue books across the college
router.get('/admin/overdue', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const activeLoans = await BookLoan.find({ status: { $in: ['ISSUED', 'OVERDUE'] } })
      .populate('book')
      .populate('copy')
      .populate('user', 'roll_number name email department')
      .lean();

    const now = new Date();
    const overdueLoans = [];

    activeLoans.forEach(loan => {
      const due = new Date(loan.due_date);
      if (now > due) {
        const fine = calculateFine(loan.due_date, now);
        overdueLoans.push({
          ...loan,
          status: 'OVERDUE',
          fine_amount: fine,
          days_overdue: Math.ceil((now - due) / (1000 * 60 * 60 * 24))
        });
      }
    });

    res.json({ overdue_loans: overdueLoans });
  } catch (err) {
    console.error('Error fetching admin overdue books:', err);
    res.status(500).json({ error: 'Failed to fetch overdue books.' });
  }
});

// 8. Admin: Add new book to catalog with physical copies
router.post('/admin/add', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { isbn, title, author, category, publisher, publication_year, cover_image, description, copies_count, shelf_location } = req.body;

    if (!isbn || !title || !author || !category) {
      return res.status(400).json({ error: 'ISBN, Title, Author, and Category are required.' });
    }

    const existing = await Book.findOne({ isbn: isbn.trim() });
    if (existing) {
      return res.status(409).json({ error: `A book with ISBN ${isbn} already exists.` });
    }

    const newBook = await Book.create({
      isbn: isbn.trim(),
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      publisher: publisher ? publisher.trim() : 'Academic Press',
      publication_year: parseInt(publication_year) || new Date().getFullYear(),
      cover_image: cover_image ? cover_image.trim() : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=60',
      description: description ? description.trim() : ''
    });

    const copiesCount = parseInt(copies_count) || 2;
    const copies = [];
    for (let c = 1; c <= copiesCount; c++) {
      copies.push({
        book: newBook._id,
        barcode: `BIT-${newBook.category.substring(0, 2).toUpperCase()}-${newBook._id.toString().slice(-4)}-${c.toString().padStart(2, '0')}`,
        shelf_location: shelf_location ? `${shelf_location.trim()}-R${c}` : `GEN-01-R${c}`,
        status: 'AVAILABLE'
      });
    }

    await BookCopy.insertMany(copies);

    res.status(201).json({
      message: `Book "${newBook.title}" with ${copiesCount} physical copies added successfully!`,
      book: newBook
    });
  } catch (err) {
    console.error('Add book error:', err);
    res.status(500).json({ error: 'Failed to add book.' });
  }
});

module.exports = router;
