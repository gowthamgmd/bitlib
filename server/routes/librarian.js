const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  User,
  Floor,
  Seat,
  Session,
  SeatBooking,
  Book,
  BookCopy,
  BookLoan,
  DiscussionRoom,
  RoomBooking,
  Notification,
  AuditLog,
  DigitalResource,
  ResourceBookmark,
  ResourceActivity
} = require('../models');
const { authenticateToken, requireLibrarian } = require('../middleware/auth');
const { performDailySeatReset } = require('../services/seatReset');

// Multer Storage Configuration for Digital Resource Uploads
const uploadDir = path.join(__dirname, '../uploads/digital-resources');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `res_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const resourceUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.epub', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Supported formats: ${allowedExts.join(', ')}`));
    }
  }
});


const router = express.Router();
const DAILY_FINE_RATE = 2.0; // ₹2/day

function calculateFine(dueDate, returnDate = new Date()) {
  const due = new Date(dueDate);
  const ret = new Date(returnDate);
  if (ret <= due) return 0.0;
  const diffTime = Math.abs(ret - due);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays * DAILY_FINE_RATE;
}

// All endpoints require valid JWT and LIBRARIAN or ADMIN role
router.use(authenticateToken, requireLibrarian);

// ─────────────────────────────────────────────────────────────
// 1. OVERVIEW DASHBOARD METRICS
// ─────────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().split('T')[0];
    const sessionNumber = parseInt(req.query.session_number) || 1;

    const [
      totalSeats,
      blockedSeatsCount,
      sessionBookings,
      totalBooks,
      totalCopies,
      availableCopies,
      activeLoans,
      returnedLoans,
      totalRooms,
      roomBookings,
      recentAuditLogs,
      totalDigitalResources,
      publishedDigitalResources
    ] = await Promise.all([
      Seat.countDocuments(),
      Seat.countDocuments({ status: 'MAINTENANCE' }),
      SeatBooking.find({ booking_date: today, session_number: sessionNumber, status: 'CONFIRMED' }).lean(),
      Book.countDocuments(),
      BookCopy.countDocuments(),
      BookCopy.countDocuments({ status: 'AVAILABLE' }),
      BookLoan.find({ status: { $in: ['ISSUED', 'OVERDUE'] } }).populate('book copy user', 'name roll_number email').lean(),
      BookLoan.find({ status: 'RETURNED' }).lean(),
      DiscussionRoom.countDocuments(),
      RoomBooking.find().populate('room user', 'name roll_number email').lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
      DigitalResource.countDocuments(),
      DigitalResource.countDocuments({ publication_status: 'PUBLISHED' })
    ]);

    const now = new Date();
    let overdueCount = 0;
    let pendingFines = 0;

    activeLoans.forEach(loan => {
      const due = new Date(loan.due_date);
      if (now > due) {
        overdueCount++;
        pendingFines += calculateFine(loan.due_date, now);
      }
    });

    const collectedFines = returnedLoans.reduce((sum, l) => sum + (l.fine_amount || 0), 0);
    const pendingRooms = roomBookings.filter(r => r.status === 'PENDING').length;
    const approvedRooms = roomBookings.filter(r => r.status === 'APPROVED').length;
    const rejectedRooms = roomBookings.filter(r => r.status === 'REJECTED').length;

    const reservedSeatsCount = sessionBookings.length;
    const availableSeatsCount = Math.max(0, totalSeats - reservedSeatsCount - blockedSeatsCount);

    res.json({
      date: today,
      session_number: sessionNumber,
      metrics: {
        seats: {
          total: totalSeats,
          reserved: reservedSeatsCount,
          available: availableSeatsCount,
          blocked: blockedSeatsCount
        },
        books: {
          total_titles: totalBooks,
          total_copies: totalCopies,
          available_copies: availableCopies,
          active_loans: activeLoans.length,
          overdue_loans: overdueCount,
          pending_fines: pendingFines,
          collected_fines: collectedFines
        },
        rooms: {
          total: totalRooms,
          pending_requests: pendingRooms,
          approved_bookings: approvedRooms,
          rejected_requests: rejectedRooms
        },
        digital_resources: {
          total: totalDigitalResources,
          published: publishedDigitalResources
        }
      },
      recent_activity: recentAuditLogs,
      recent_room_requests: roomBookings.slice(0, 5),
      recent_loans: activeLoans.slice(0, 5)
    });
  } catch (err) {
    console.error('Librarian overview error:', err);
    res.status(500).json({ error: 'Failed to retrieve overview metrics.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 2. SEAT RESERVATION MANAGEMENT (LIST & FILTER)
// ─────────────────────────────────────────────────────────────
router.get('/seats/reservations', async (req, res) => {
  try {
    const { date, session_number, floor_number, zone, status, search } = req.query;
    let filter = {};

    if (date) filter.booking_date = date;
    if (session_number) filter.session_number = parseInt(session_number);
    if (status && status !== 'ALL') filter.status = status;

    let bookings = await SeatBooking.find(filter)
      .populate('seat')
      .populate('session')
      .populate('user', 'name roll_number email department gender phone')
      .populate('cancelled_by', 'name role')
      .sort({ booking_date: -1, session_number: 1, createdAt: -1 })
      .lean();

    // Additional post-query filters for seat floor/zone or student text search
    if (floor_number && floor_number !== 'ALL') {
      const fNum = parseInt(floor_number);
      bookings = bookings.filter(b => b.seat && b.seat.floor_number === fNum);
    }
    if (zone && zone !== 'ALL') {
      bookings = bookings.filter(b => b.seat && b.seat.zone === zone);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      bookings = bookings.filter(b =>
        (b.user && (b.user.name?.toLowerCase().includes(q) || b.user.roll_number?.toLowerCase().includes(q) || b.user.email?.toLowerCase().includes(q))) ||
        (b.seat && b.seat.seat_number?.toLowerCase().includes(q))
      );
    }

    res.json({ reservations: bookings });
  } catch (err) {
    console.error('Librarian seats list error:', err);
    res.status(500).json({ error: 'Failed to retrieve seat reservations.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 3. INTERACTIVE FLOOR MAP LAYOUT (LIBRARIAN VIEW)
// ─────────────────────────────────────────────────────────────
router.get('/seats/layout', async (req, res) => {
  try {
    const floorNumber = parseInt(req.query.floor_number) || 1;
    const sessionNumber = parseInt(req.query.session_number) || 1;
    const bookingDate = req.query.date || new Date().toISOString().split('T')[0];

    const [floor, session, allSeats, activeBookings] = await Promise.all([
      Floor.findOne({ floor_number: floorNumber }),
      Session.findOne({ session_number: sessionNumber }),
      Seat.find({ floor_number: floorNumber }).sort({ row_index: 1, col_index: 1 }).lean(),
      SeatBooking.find({
        session_number: sessionNumber,
        booking_date: bookingDate,
        status: 'CONFIRMED'
      }).populate('user', 'name roll_number email department gender phone').lean()
    ]);

    const bookingMap = new Map();
    activeBookings.forEach(b => {
      bookingMap.set(b.seat.toString(), b);
    });

    const enrichedSeats = allSeats.map(seat => {
      const booking = bookingMap.get(seat._id.toString());
      let state = 'AVAILABLE';
      let studentDetails = null;
      let bookingId = null;

      if (seat.status === 'MAINTENANCE') {
        state = 'MAINTENANCE';
      } else if (booking) {
        state = 'RESERVED';
        bookingId = booking._id;
        studentDetails = {
          booking_id: booking._id,
          name: booking.user?.name,
          roll_number: booking.user?.roll_number,
          email: booking.user?.email,
          department: booking.user?.department,
          gender: booking.user?.gender,
          phone: booking.user?.phone
        };
      }

      return {
        ...seat,
        state,
        booking_id: bookingId,
        student: studentDetails
      };
    });

    const boysSeats = enrichedSeats.filter(s => s.zone === 'BOYS');
    const girlsSeats = enrichedSeats.filter(s => s.zone === 'GIRLS');

    const totalSeats = allSeats.length;
    const reservedCount = activeBookings.filter(b => allSeats.some(s => s._id.toString() === b.seat.toString())).length;
    const blockedCount = allSeats.filter(s => s.status === 'MAINTENANCE').length;
    const availableCount = Math.max(0, totalSeats - reservedCount - blockedCount);

    res.json({
      floor,
      session,
      booking_date: bookingDate,
      stats: {
        total: totalSeats,
        reserved: reservedCount,
        available: availableCount,
        blocked: blockedCount,
        occupancy_rate: totalSeats > 0 ? Math.round((reservedCount / totalSeats) * 100) : 0
      },
      boys_wing: boysSeats,
      girls_wing: girlsSeats
    });
  } catch (err) {
    console.error('Librarian seat layout error:', err);
    res.status(500).json({ error: 'Failed to retrieve floor map layout.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. CANCEL SEAT RESERVATION (ADMINISTRATIVE ACTION)
// ─────────────────────────────────────────────────────────────
router.post('/seats/cancel', async (req, res) => {
  try {
    const { booking_id, reason } = req.body;
    if (!booking_id) return res.status(400).json({ error: 'Booking ID is required.' });

    const booking = await SeatBooking.findById(booking_id)
      .populate('seat')
      .populate('session')
      .populate('user');

    if (!booking) return res.status(404).json({ error: 'Reservation record not found.' });
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This booking has already been cancelled.' });
    }

    booking.status = 'CANCELLED';
    booking.cancelled_by = req.user.id;
    booking.cancellation_reason = reason ? reason.trim() : 'Cancelled by librarian for operational reasons';
    await booking.save();

    // Notify affected student
    await Notification.create({
      user: booking.user._id,
      title: 'Seat Reservation Cancelled by Librarian',
      message: `Your booking for Seat ${booking.seat?.seat_number} on ${booking.booking_date} (${booking.session?.label}) was cancelled by the librarian. Reason: ${booking.cancellation_reason}`,
      type: 'SEAT'
    });

    // Record in AuditLog
    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: 'CANCEL_SEAT_RESERVATION',
      category: 'SEAT',
      target_id: booking._id.toString(),
      target_description: `Seat ${booking.seat?.seat_number} booked by ${booking.user?.name} (${booking.user?.roll_number})`,
      reason: booking.cancellation_reason,
      details: {
        booking_date: booking.booking_date,
        session_number: booking.session_number,
        seat_number: booking.seat?.seat_number
      }
    });

    res.json({
      message: `Reservation for seat ${booking.seat?.seat_number} cancelled successfully. Student has been notified.`,
      booking
    });
  } catch (err) {
    console.error('Librarian cancel seat error:', err);
    res.status(500).json({ error: 'Failed to cancel seat reservation.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 5. BLOCK / UNBLOCK SEAT (MAINTENANCE TOGGLE)
// ─────────────────────────────────────────────────────────────
router.post('/seats/block', async (req, res) => {
  try {
    const { seat_id, status, reason } = req.body;
    if (!seat_id || !['ACTIVE', 'MAINTENANCE'].includes(status)) {
      return res.status(400).json({ error: 'Valid seat_id and status (ACTIVE/MAINTENANCE) are required.' });
    }

    const seat = await Seat.findById(seat_id);
    if (!seat) return res.status(404).json({ error: 'Seat not found.' });

    seat.status = status;
    await seat.save();

    // If blocking seat, cancel any active reservations for today
    let cancelledCount = 0;
    if (status === 'MAINTENANCE') {
      const today = new Date().toISOString().split('T')[0];
      const activeBookings = await SeatBooking.find({
        seat: seat._id,
        booking_date: { $gte: today },
        status: 'CONFIRMED'
      }).populate('user session');

      for (const b of activeBookings) {
        b.status = 'CANCELLED';
        b.cancelled_by = req.user.id;
        b.cancellation_reason = reason || 'Seat closed for maintenance';
        await b.save();

        await Notification.create({
          user: b.user?._id,
          title: 'Seat Maintenance Notice',
          message: `Your booking for Seat ${seat.seat_number} on ${b.booking_date} (${b.session?.label}) was cancelled because the seat is undergoing maintenance.`,
          type: 'SEAT'
        });
        cancelledCount++;
      }
    }

    // Record AuditLog
    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: status === 'MAINTENANCE' ? 'BLOCK_SEAT' : 'UNBLOCK_SEAT',
      category: 'SEAT',
      target_id: seat._id.toString(),
      target_description: `Seat ${seat.seat_number} (Floor ${seat.floor_number}, ${seat.zone} zone)`,
      reason: reason || (status === 'MAINTENANCE' ? 'Seat set to maintenance' : 'Seat restored to active status'),
      details: { status, cancelledActiveBookings: cancelledCount }
    });

    res.json({
      message: `Seat ${seat.seat_number} is now ${status === 'MAINTENANCE' ? 'BLOCKED for maintenance' : 'ACTIVE and available'}.${cancelledCount > 0 ? ` ${cancelledCount} conflicting booking(s) cancelled.` : ''}`,
      seat
    });
  } catch (err) {
    console.error('Librarian block seat error:', err);
    res.status(500).json({ error: 'Failed to update seat maintenance status.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. DAILY SEAT AVAILABILITY RESET (SAFE & IDEMPOTENT)
// ─────────────────────────────────────────────────────────────
router.post('/seats/daily-reset', async (req, res) => {
  try {
    const actorUser = req.user;
    const targetDate = req.body.date || null;

    const result = await performDailySeatReset(actorUser, targetDate);
    res.json(result);
  } catch (err) {
    console.error('Manual seat reset error:', err);
    res.status(500).json({ error: 'Failed to perform daily seat availability reset.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. BOOK CATALOGUE MANAGEMENT
// ─────────────────────────────────────────────────────────────
router.get('/books', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};

    if (category && category !== 'ALL') query.category = category;
    if (search && search.trim()) {
      const q = new RegExp(search.trim(), 'i');
      query.$or = [{ title: q }, { author: q }, { isbn: q }, { category: q }];
    }

    const books = await Book.find(query).sort({ title: 1 }).lean();
    const bookIds = books.map(b => b._id);
    const copies = await BookCopy.find({ book: { $in: bookIds } }).lean();

    const copiesMap = new Map();
    copies.forEach(copy => {
      const bId = copy.book.toString();
      if (!copiesMap.has(bId)) {
        copiesMap.set(bId, []);
      }
      copiesMap.get(bId).push(copy);
    });

    const enrichedBooks = books.map(b => {
      const bCopies = copiesMap.get(b._id.toString()) || [];
      const available = bCopies.filter(c => c.status === 'AVAILABLE').length;
      const borrowed = bCopies.filter(c => c.status === 'BORROWED').length;
      const maintenance = bCopies.filter(c => c.status === 'MAINTENANCE').length;
      const damaged = bCopies.filter(c => c.status === 'DAMAGED').length;
      const lost = bCopies.filter(c => c.status === 'LOST').length;

      return {
        ...b,
        total_copies: bCopies.length,
        available_copies: available,
        borrowed_copies: borrowed,
        maintenance_copies: maintenance,
        damaged_copies: damaged,
        lost_copies: lost,
        copies: bCopies
      };
    });

    res.json({ books: enrichedBooks });
  } catch (err) {
    console.error('Librarian books list error:', err);
    res.status(500).json({ error: 'Failed to retrieve book catalogue.' });
  }
});

// Add new book title + physical copies
router.post('/books', async (req, res) => {
  try {
    const {
      isbn,
      title,
      author,
      category,
      publisher,
      publication_year,
      cover_image,
      description,
      copies_count,
      shelf_location
    } = req.body;

    if (!isbn || !title || !author || !category) {
      return res.status(400).json({ error: 'ISBN, Title, Author, and Category are required.' });
    }

    const existing = await Book.findOne({ isbn: isbn.trim() });
    if (existing) {
      return res.status(409).json({ error: `A book with ISBN ${isbn} already exists in the catalogue.` });
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

    const count = parseInt(copies_count) || 2;
    const copies = [];
    for (let c = 1; c <= count; c++) {
      copies.push({
        book: newBook._id,
        barcode: `BIT-${newBook.category.substring(0, 2).toUpperCase()}-${newBook._id.toString().slice(-4)}-${c.toString().padStart(2, '0')}`,
        shelf_location: shelf_location ? `${shelf_location.trim()}-R${c}` : `GEN-01-R${c}`,
        status: 'AVAILABLE'
      });
    }

    await BookCopy.insertMany(copies);

    // Audit log
    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: 'ADD_BOOK',
      category: 'BOOK',
      target_id: newBook._id.toString(),
      target_description: `Added "${newBook.title}" by ${newBook.author} (ISBN: ${newBook.isbn}, ${count} copies)`,
      details: { isbn: newBook.isbn, copiesCount: count }
    });

    res.status(201).json({
      message: `Book "${newBook.title}" added to catalogue with ${count} physical copies.`,
      book: newBook
    });
  } catch (err) {
    console.error('Librarian add book error:', err);
    res.status(500).json({ error: 'Failed to add book to catalogue.' });
  }
});

// Edit book metadata
router.put('/books/:id', async (req, res) => {
  try {
    const { title, author, category, publisher, publication_year, cover_image, description } = req.body;
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });

    if (title) book.title = title.trim();
    if (author) book.author = author.trim();
    if (category) book.category = category.trim();
    if (publisher) book.publisher = publisher.trim();
    if (publication_year) book.publication_year = parseInt(publication_year);
    if (cover_image) book.cover_image = cover_image.trim();
    if (description !== undefined) book.description = description.trim();

    await book.save();

    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: 'EDIT_BOOK',
      category: 'BOOK',
      target_id: book._id.toString(),
      target_description: `Edited metadata for "${book.title}"`
    });

    res.json({ message: 'Book metadata updated successfully.', book });
  } catch (err) {
    console.error('Librarian edit book error:', err);
    res.status(500).json({ error: 'Failed to update book metadata.' });
  }
});

// Add extra copies to existing book
router.post('/books/:id/copies', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });

    const count = parseInt(req.body.count) || 1;
    const shelf = req.body.shelf_location || 'GEN-01';

    const existingCount = await BookCopy.countDocuments({ book: book._id });
    const copies = [];

    for (let c = 1; c <= count; c++) {
      const idx = existingCount + c;
      copies.push({
        book: book._id,
        barcode: `BIT-${book.category.substring(0, 2).toUpperCase()}-${book._id.toString().slice(-4)}-${idx.toString().padStart(2, '0')}`,
        shelf_location: `${shelf}-R${idx}`,
        status: 'AVAILABLE'
      });
    }

    await BookCopy.insertMany(copies);

    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: 'ADD_COPIES',
      category: 'BOOK',
      target_id: book._id.toString(),
      target_description: `Added ${count} physical copy(s) to "${book.title}"`
    });

    res.status(201).json({ message: `${count} new copy(s) added successfully.` });
  } catch (err) {
    console.error('Add copies error:', err);
    res.status(500).json({ error: 'Failed to add copies.' });
  }
});

// Update physical copy status (e.g. mark DAMAGED, LOST, MAINTENANCE, AVAILABLE)
router.patch('/books/copies/:id/status', async (req, res) => {
  try {
    const { status, shelf_location } = req.body;
    if (!['AVAILABLE', 'BORROWED', 'MAINTENANCE', 'DAMAGED', 'LOST'].includes(status)) {
      return res.status(400).json({ error: 'Invalid copy status.' });
    }

    const copy = await BookCopy.findById(req.params.id).populate('book');
    if (!copy) return res.status(404).json({ error: 'Copy not found.' });

    copy.status = status;
    if (shelf_location) copy.shelf_location = shelf_location.trim();
    await copy.save();

    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: 'UPDATE_COPY_STATUS',
      category: 'BOOK',
      target_id: copy._id.toString(),
      target_description: `Copy ${copy.barcode} ("${copy.book?.title}") status changed to ${status}`
    });

    res.json({ message: `Copy ${copy.barcode} updated to ${status}.`, copy });
  } catch (err) {
    console.error('Update copy status error:', err);
    res.status(500).json({ error: 'Failed to update copy status.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. CIRCULATION DESK (ISSUE & RETURN)
// ─────────────────────────────────────────────────────────────
router.post('/circulation/issue', async (req, res) => {
  try {
    const { roll_number, barcode, lending_days } = req.body;
    if (!roll_number || !barcode) {
      return res.status(400).json({ error: 'Student Roll Number and Copy Barcode are required.' });
    }

    // 1. Verify Student
    const student = await User.findOne({ roll_number: roll_number.trim().toUpperCase() });
    if (!student) {
      return res.status(404).json({ error: `Student with roll number "${roll_number}" not found.` });
    }

    // Check student borrowing limit
    const activeLoans = await BookLoan.find({
      user: student._id,
      status: { $in: ['ISSUED', 'OVERDUE'] }
    });

    if (activeLoans.length >= 3) {
      return res.status(400).json({
        error: `Borrowing Limit Exceeded: Student ${student.name} already holds ${activeLoans.length} active book loans (Max: 3).`
      });
    }

    // Check unpaid overdue fines exceeding ₹50
    const now = new Date();
    const pendingFines = activeLoans.reduce((sum, loan) => sum + calculateFine(loan.due_date, now), 0);
    if (pendingFines >= 50) {
      return res.status(403).json({
        error: `Borrowing Suspended: Student ${student.name} has ₹${pendingFines} in accumulated overdue fines. Please collect dues first.`
      });
    }

    // 2. Verify Physical Copy
    const copy = await BookCopy.findOne({ barcode: barcode.trim() }).populate('book');
    if (!copy) {
      return res.status(404).json({ error: `No physical book copy found with barcode "${barcode}".` });
    }

    if (copy.status !== 'AVAILABLE') {
      return res.status(409).json({
        error: `Copy ${barcode} ("${copy.book?.title}") is not available (Current status: ${copy.status}).`
      });
    }

    // Prevent borrowing multiple copies of the same title
    const alreadyHoldsTitle = activeLoans.some(l => l.book.toString() === copy.book._id.toString());
    if (alreadyHoldsTitle) {
      return res.status(400).json({
        error: `Student already holds an active copy of "${copy.book?.title}".`
      });
    }

    // 3. Issue Loan
    const days = parseInt(lending_days) || 14;
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    copy.status = 'BORROWED';
    await copy.save();

    const loan = await BookLoan.create({
      copy: copy._id,
      book: copy.book._id,
      user: student._id,
      issued_by: req.user.id,
      issue_date: issueDate,
      due_date: dueDate,
      status: 'ISSUED'
    });

    // Notify Student
    await Notification.create({
      user: student._id,
      title: 'Book Issued at Circulation Desk',
      message: `"${copy.book?.title}" (Barcode: ${copy.barcode}) has been issued to you by the librarian. Due date: ${dueDate.toISOString().split('T')[0]}.`,
      type: 'BOOK'
    });

    // Audit Log
    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: 'ISSUE_BOOK',
      category: 'BOOK',
      target_id: loan._id.toString(),
      target_description: `Issued "${copy.book?.title}" (Barcode: ${copy.barcode}) to ${student.name} (${student.roll_number})`,
      details: { roll_number: student.roll_number, barcode: copy.barcode, due_date: dueDate }
    });

    const populatedLoan = await BookLoan.findById(loan._id)
      .populate('book')
      .populate('copy')
      .populate('user', 'name roll_number email department');

    res.status(201).json({
      message: `Book "${copy.book?.title}" issued successfully to ${student.name}!`,
      loan: populatedLoan
    });
  } catch (err) {
    console.error('Librarian issue book error:', err);
    res.status(500).json({ error: 'Failed to issue book.' });
  }
});

router.post('/circulation/return', async (req, res) => {
  try {
    const { loan_id, barcode } = req.body;
    let loan;

    if (loan_id) {
      loan = await BookLoan.findById(loan_id).populate('book copy user');
    } else if (barcode) {
      const copy = await BookCopy.findOne({ barcode: barcode.trim() });
      if (!copy) return res.status(404).json({ error: `Barcode ${barcode} not found.` });
      loan = await BookLoan.findOne({ copy: copy._id, status: { $in: ['ISSUED', 'OVERDUE'] } }).populate('book copy user');
    }

    if (!loan) {
      return res.status(404).json({ error: 'Active loan record not found for this book or barcode.' });
    }

    if (loan.status === 'RETURNED') {
      return res.status(400).json({ error: 'This loan transaction has already been completed.' });
    }

    const returnDate = new Date();
    const fineAmount = calculateFine(loan.due_date, returnDate);

    loan.return_date = returnDate;
    loan.fine_amount = fineAmount;
    loan.status = 'RETURNED';
    loan.returned_to = req.user.id;
    await loan.save();

    // Release physical copy back to AVAILABLE
    if (loan.copy) {
      await BookCopy.findByIdAndUpdate(loan.copy._id, { status: 'AVAILABLE' });
    }

    // Notify Student
    const fineMsg = fineAmount > 0 ? ` Overdue fine recorded: ₹${fineAmount}.` : '';
    await Notification.create({
      user: loan.user?._id,
      title: 'Book Return Processed',
      message: `"${loan.book?.title}" (Barcode: ${loan.copy?.barcode}) return was confirmed by the librarian.${fineMsg}`,
      type: fineAmount > 0 ? 'FINE' : 'BOOK'
    });

    // Audit Log
    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: 'RETURN_BOOK',
      category: 'BOOK',
      target_id: loan._id.toString(),
      target_description: `Processed return of "${loan.book?.title}" (Barcode: ${loan.copy?.barcode}) from ${loan.user?.name} (${loan.user?.roll_number})`,
      details: { fine_amount: fineAmount, due_date: loan.due_date, return_date: returnDate }
    });

    res.json({
      message: `"${loan.book?.title}" returned successfully!${fineAmount > 0 ? ` Overdue fine: ₹${fineAmount}.` : ''}`,
      loan,
      fine_amount: fineAmount
    });
  } catch (err) {
    console.error('Librarian return book error:', err);
    res.status(500).json({ error: 'Failed to process book return.' });
  }
});

// List all circulation loans (Active, Overdue, Returned)
router.get('/circulation/loans', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status && status !== 'ALL') query.status = status;

    let loans = await BookLoan.find(query)
      .populate('book')
      .populate('copy')
      .populate('user', 'name roll_number email department phone')
      .populate('issued_by', 'name role')
      .populate('returned_to', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    loans = loans.map(l => {
      let currentFine = l.fine_amount || 0;
      let effectiveStatus = l.status;
      if (l.status === 'ISSUED') {
        const due = new Date(l.due_date);
        if (now > due) {
          effectiveStatus = 'OVERDUE';
          currentFine = calculateFine(l.due_date, now);
        }
      }
      return {
        ...l,
        status: effectiveStatus,
        fine_amount: currentFine,
        is_overdue: effectiveStatus === 'OVERDUE'
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      loans = loans.filter(l =>
        (l.user && (l.user.name?.toLowerCase().includes(q) || l.user.roll_number?.toLowerCase().includes(q))) ||
        (l.book && (l.book.title?.toLowerCase().includes(q) || l.book.isbn?.toLowerCase().includes(q))) ||
        (l.copy && l.copy.barcode?.toLowerCase().includes(q))
      );
    }

    res.json({ loans });
  } catch (err) {
    console.error('Librarian loans error:', err);
    res.status(500).json({ error: 'Failed to retrieve loans.' });
  }
});

// List overdue books with fine calculations
router.get('/circulation/overdue', async (req, res) => {
  try {
    const activeLoans = await BookLoan.find({ status: { $in: ['ISSUED', 'OVERDUE'] } })
      .populate('book')
      .populate('copy')
      .populate('user', 'name roll_number email department phone')
      .lean();

    const now = new Date();
    const overdueList = [];

    activeLoans.forEach(l => {
      const due = new Date(l.due_date);
      if (now > due) {
        const fine = calculateFine(l.due_date, now);
        const daysOver = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
        overdueList.push({
          ...l,
          fine_amount: fine,
          days_overdue: daysOver
        });
      }
    });

    res.json({ overdue_loans: overdueList });
  } catch (err) {
    console.error('Overdue list error:', err);
    res.status(500).json({ error: 'Failed to retrieve overdue loans.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 9. DISCUSSION ROOM BOOKINGS (APPROVAL & MANAGEMENT)
// ─────────────────────────────────────────────────────────────
router.get('/rooms/requests', async (req, res) => {
  try {
    const { status, room_id, date } = req.query;
    let query = {};

    if (status && status !== 'ALL') query.status = status;
    if (room_id && room_id !== 'ALL') query.room = room_id;
    if (date) query.booking_date = date;

    const requests = await RoomBooking.find(query)
      .populate('room')
      .populate('session')
      .populate('user', 'name roll_number email department phone')
      .populate('reviewed_by', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ requests });
  } catch (err) {
    console.error('Librarian room requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve room requests.' });
  }
});

router.patch('/rooms/requests/:id', async (req, res) => {
  try {
    const { action, admin_remarks } = req.body; // 'APPROVE' | 'REJECT' | 'CANCEL'
    if (!['APPROVE', 'REJECT', 'CANCEL'].includes(action)) {
      return res.status(400).json({ error: 'Action must be APPROVE, REJECT, or CANCEL.' });
    }

    const booking = await RoomBooking.findById(req.params.id)
      .populate('room')
      .populate('session')
      .populate('user');

    if (!booking) return res.status(404).json({ error: 'Room request record not found.' });

    if (action === 'APPROVE') {
      // Re-validate that there is no conflicting approved booking for this room & session
      const existingApproved = await RoomBooking.findOne({
        _id: { $ne: booking._id },
        room: booking.room?._id,
        booking_date: booking.booking_date,
        session_number: booking.session_number,
        status: 'APPROVED'
      });

      if (existingApproved) {
        return res.status(409).json({
          error: `Conflict: Room "${booking.room?.name}" is already approved for "${existingApproved.club_name}" on ${booking.booking_date} (Session ${booking.session_number}).`
        });
      }

      booking.status = 'APPROVED';
    } else if (action === 'REJECT') {
      booking.status = 'REJECTED';
    } else if (action === 'CANCEL') {
      booking.status = 'CANCELLED';
    }

    booking.admin_remarks = admin_remarks ? admin_remarks.trim() : (action === 'APPROVE' ? 'Approved by Librarian' : 'Rejected');
    booking.reviewed_by = req.user.id;
    booking.reviewed_at = new Date();
    await booking.save();

    // Student notification
    const title = action === 'APPROVE' ? 'Discussion Room Request Approved! 🎉' : `Discussion Room Request ${action === 'REJECT' ? 'Rejected' : 'Cancelled'}`;
    const msg = action === 'APPROVE'
      ? `Your reservation request for ${booking.room?.name} on ${booking.booking_date} (${booking.session?.label}) on behalf of "${booking.club_name}" has been APPROVED.`
      : `Your discussion room request for ${booking.room?.name} was ${action.toLowerCase()}. Remarks: ${booking.admin_remarks}`;

    await Notification.create({
      user: booking.user?._id,
      title,
      message: msg,
      type: 'ROOM'
    });

    // Audit Log
    await AuditLog.create({
      actor: req.user.id,
      actor_name: req.user.name || 'Librarian',
      actor_role: req.user.role,
      action: `${action}_ROOM_REQUEST`,
      category: 'ROOM',
      target_id: booking._id.toString(),
      target_description: `${action} request for ${booking.room?.name} by ${booking.user?.name} (${booking.club_name})`,
      reason: booking.admin_remarks
    });

    res.json({
      message: `Discussion room request has been ${booking.status.toLowerCase()}. Student has been notified.`,
      booking
    });
  } catch (err) {
    console.error('Librarian review room error:', err);
    res.status(500).json({ error: 'Failed to update discussion room request.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 10. STUDENT RECORDS DIRECTORY & DRILLDOWN
// ─────────────────────────────────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const { search, department, year } = req.query;
    let query = { role: 'STUDENT' };

    if (department && department !== 'ALL') query.department = department;
    if (year && year !== 'ALL') query.year = parseInt(year);
    if (search && search.trim()) {
      const q = new RegExp(search.trim(), 'i');
      query.$or = [{ name: q }, { roll_number: q }, { email: q }];
    }

    const students = await User.find(query).select('-password_hash').sort({ roll_number: 1 }).lean();
    const studentIds = students.map(s => s._id);

    const [loans, seats, rooms] = await Promise.all([
      BookLoan.find({ user: { $in: studentIds } }).lean(),
      SeatBooking.find({ user: { $in: studentIds }, status: 'CONFIRMED' }).lean(),
      RoomBooking.find({ user: { $in: studentIds } }).lean()
    ]);

    const now = new Date();
    const enriched = students.map(st => {
      const uLoans = loans.filter(l => l.user.toString() === st._id.toString());
      const activeL = uLoans.filter(l => l.status === 'ISSUED' || l.status === 'OVERDUE');
      const overdueL = activeL.filter(l => now > new Date(l.due_date));
      const uSeats = seats.filter(s => s.user.toString() === st._id.toString());
      const uRooms = rooms.filter(r => r.user.toString() === st._id.toString());

      const pendingFines = activeL.reduce((sum, l) => sum + calculateFine(l.due_date, now), 0);

      return {
        ...st,
        active_loans_count: activeL.length,
        overdue_loans_count: overdueL.length,
        active_seats_count: uSeats.length,
        room_requests_count: uRooms.length,
        pending_fines: pendingFines
      };
    });

    res.json({ students: enriched });
  } catch (err) {
    console.error('Librarian students error:', err);
    res.status(500).json({ error: 'Failed to retrieve students directory.' });
  }
});

// Single student drilldown
router.get('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-password_hash').lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const [loans, seats, rooms, notifications] = await Promise.all([
      BookLoan.find({ user: student._id }).populate('book copy').sort({ createdAt: -1 }).lean(),
      SeatBooking.find({ user: student._id }).populate('seat session').sort({ booking_date: -1 }).lean(),
      RoomBooking.find({ user: student._id }).populate('room session').sort({ createdAt: -1 }).lean(),
      Notification.find({ user: student._id }).sort({ createdAt: -1 }).limit(20).lean()
    ]);

    res.json({
      student,
      loans,
      seats,
      rooms,
      notifications
    });
  } catch (err) {
    console.error('Student drilldown error:', err);
    res.status(500).json({ error: 'Failed to retrieve student details.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 11. AUDIT LOGS & ACTIVITY HISTORY
// ─────────────────────────────────────────────────────────────
router.get('/audit-logs', async (req, res) => {
  try {
    const { category, search, limit } = req.query;
    let query = {};
    if (category && category !== 'ALL') query.category = category;
    if (search && search.trim()) {
      const q = new RegExp(search.trim(), 'i');
      query.$or = [{ action: q }, { target_description: q }, { actor_name: q }];
    }

    const max = parseInt(limit) || 100;
    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(max).lean();

    res.json({ audit_logs: logs });
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 12. COMPREHENSIVE OPERATIONAL REPORTS
// ─────────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      allSeats,
      todayBookings,
      totalBooks,
      copies,
      allLoans,
      allRooms,
      roomBookings
    ] = await Promise.all([
      Seat.find().lean(),
      SeatBooking.find({ booking_date: today, status: 'CONFIRMED' }).lean(),
      Book.find().lean(),
      BookCopy.find().lean(),
      BookLoan.find().populate('book').lean(),
      DiscussionRoom.find().lean(),
      RoomBooking.find().lean()
    ]);

    // 1. Floor-wise occupancy report
    const floorReports = [1, 2, 3].map(floorNum => {
      const floorSeats = allSeats.filter(s => s.floor_number === floorNum);
      const floorBookings = todayBookings.filter(b => floorSeats.some(s => s._id.toString() === b.seat.toString()));
      const boysSeats = floorSeats.filter(s => s.zone === 'BOYS');
      const girlsSeats = floorSeats.filter(s => s.zone === 'GIRLS');
      const boysBooked = floorBookings.filter(b => boysSeats.some(s => s._id.toString() === b.seat.toString()));
      const girlsBooked = floorBookings.filter(b => girlsSeats.some(s => s._id.toString() === b.seat.toString()));

      return {
        floor_number: floorNum,
        total_seats: floorSeats.length,
        booked_today: floorBookings.length,
        occupancy_rate: floorSeats.length > 0 ? Math.round((floorBookings.length / floorSeats.length) * 100) : 0,
        boys_zone: { total: boysSeats.length, booked: boysBooked.length },
        girls_zone: { total: girlsSeats.length, booked: girlsBooked.length }
      };
    });

    // 2. Category-wise book circulation report
    const categoryStats = {};
    allLoans.forEach(l => {
      const cat = l.book?.category || 'General';
      if (!categoryStats[cat]) categoryStats[cat] = { total_issues: 0, returned: 0, active: 0 };
      categoryStats[cat].total_issues++;
      if (l.status === 'RETURNED') categoryStats[cat].returned++;
      else categoryStats[cat].active++;
    });

    // 3. Room utilization report
    const roomReports = allRooms.map(r => {
      const rBookings = roomBookings.filter(b => b.room.toString() === r._id.toString());
      const approved = rBookings.filter(b => b.status === 'APPROVED').length;
      const pending = rBookings.filter(b => b.status === 'PENDING').length;
      return {
        room_number: r.room_number,
        name: r.name,
        capacity: r.capacity,
        total_requests: rBookings.length,
        approved_sessions: approved,
        pending_requests: pending
      };
    });

    res.json({
      generated_at: new Date().toISOString(),
      report_date: today,
      floors: floorReports,
      categories: categoryStats,
      rooms: roomReports,
      circulation_summary: {
        total_titles: totalBooks.length,
        total_copies: copies.length,
        total_loans_history: allLoans.length,
        active_loans: allLoans.filter(l => l.status === 'ISSUED' || l.status === 'OVERDUE').length,
        completed_returns: allLoans.filter(l => l.status === 'RETURNED').length
      }
    });
  } catch (err) {
    console.error('Reports generation error:', err);
    res.status(500).json({ error: 'Failed to generate operational reports.' });
  }
});

// ─────────────────────────────────────────────────────────────
// 8. DIGITAL RESOURCE MANAGEMENT (CRUD, AUDIT & FILE HANDLING)
// ─────────────────────────────────────────────────────────────

// GET /api/librarian/digital-resources - List all resources with filters & operational stats
router.get('/digital-resources', async (req, res) => {
  try {
    const {
      search,
      category,
      department,
      resource_type,
      publication_status,
      access_type,
      sort_by = 'recent',
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }
    if (department && department !== 'ALL') {
      filter.department = department;
    }
    if (resource_type && resource_type !== 'ALL') {
      filter.resource_type = resource_type;
    }
    if (publication_status && publication_status !== 'ALL') {
      filter.publication_status = publication_status;
    }
    if (access_type && access_type !== 'ALL') {
      filter.access_type = access_type;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
        { publisher: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    let sort = { createdAt: -1 };
    if (sort_by === 'title_asc') sort = { title: 1 };
    else if (sort_by === 'views') sort = { views_count: -1, createdAt: -1 };
    else if (sort_by === 'downloads') sort = { downloads_count: -1, createdAt: -1 };
    else if (sort_by === 'year_desc') sort = { publication_year: -1, createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [
      resources,
      totalCount,
      totalAll,
      publishedCount,
      draftCount,
      archivedCount,
      metricsAgg
    ] = await Promise.all([
      DigitalResource.find(filter)
        .populate('created_by', 'name email roll_number')
        .populate('updated_by', 'name email roll_number')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DigitalResource.countDocuments(filter),
      DigitalResource.countDocuments(),
      DigitalResource.countDocuments({ publication_status: 'PUBLISHED' }),
      DigitalResource.countDocuments({ publication_status: 'DRAFT' }),
      DigitalResource.countDocuments({ publication_status: 'ARCHIVED' }),
      DigitalResource.aggregate([
        {
          $group: {
            _id: null,
            total_views: { $sum: '$views_count' },
            total_downloads: { $sum: '$downloads_count' },
            total_bookmarks: { $sum: '$bookmarks_count' }
          }
        }
      ])
    ]);

    const stats = {
      total: totalAll,
      published: publishedCount,
      draft: draftCount,
      archived: archivedCount,
      views: metricsAgg[0]?.total_views || 0,
      downloads: metricsAgg[0]?.total_downloads || 0,
      bookmarks: metricsAgg[0]?.total_bookmarks || 0
    };

    res.json({
      resources,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(totalCount / limitNum),
      stats
    });
  } catch (err) {
    console.error('Librarian list digital resources error:', err);
    res.status(500).json({ error: 'Failed to retrieve digital resources.' });
  }
});

// GET /api/librarian/digital-resources/:id - Get single resource details
router.get('/digital-resources/:id', async (req, res) => {
  try {
    const resource = await DigitalResource.findById(req.params.id)
      .populate('created_by', 'name email roll_number')
      .populate('updated_by', 'name email roll_number')
      .lean();

    if (!resource) {
      return res.status(404).json({ error: 'Digital resource not found.' });
    }

    const [recentActivities, bookmarkCount] = await Promise.all([
      ResourceActivity.find({ resource: resource._id })
        .populate('user', 'name roll_number email department')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ResourceBookmark.countDocuments({ resource: resource._id })
    ]);

    res.json({
      resource,
      recent_activities: recentActivities,
      live_bookmarks_count: bookmarkCount
    });
  } catch (err) {
    console.error('Librarian get digital resource error:', err);
    res.status(500).json({ error: 'Failed to fetch digital resource details.' });
  }
});

// POST /api/librarian/digital-resources - Create a new digital resource
router.post('/digital-resources', resourceUpload.single('file'), async (req, res) => {
  try {
    const {
      title,
      description,
      author,
      publisher,
      category,
      subject,
      department,
      resource_type = 'PDF',
      publication_year,
      external_url,
      access_type = 'INSTITUTIONAL',
      publication_status = 'PUBLISHED',
      tags,
      cover_image
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Resource title is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Valid resource category is required.' });
    }

    let file_reference = undefined;
    if (req.file) {
      file_reference = {
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        storage_path: path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/')
      };
    }

    // Validate external URL if provided
    let safeUrl = (external_url || '').trim();
    if (safeUrl) {
      if (!safeUrl.startsWith('https://') && !safeUrl.startsWith('http://')) {
        return res.status(400).json({ error: 'External URL must begin with https:// or http://' });
      }
    }

    if (!file_reference && !safeUrl) {
      return res.status(400).json({ error: 'Either an uploaded file or an external academic URL must be provided.' });
    }

    // Parse tags if string
    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const newResource = await DigitalResource.create({
      title: title.trim(),
      description: (description || '').trim(),
      author: (author || '').trim(),
      publisher: (publisher || '').trim(),
      category: category.trim(),
      subject: (subject || 'General').trim(),
      department: (department || 'All Departments').trim(),
      resource_type,
      publication_year: parseInt(publication_year) || new Date().getFullYear(),
      cover_image: (cover_image || '').trim(),
      file_reference,
      external_url: safeUrl,
      access_type,
      publication_status,
      tags: parsedTags,
      created_by: req.user._id,
      updated_by: req.user._id
    });

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action: 'CREATE_RESOURCE',
      category: 'DIGITAL_RESOURCE',
      target_id: newResource._id.toString(),
      target_description: `Added digital resource "${newResource.title}" under ${newResource.category}`,
      details: {
        category: newResource.category,
        resource_type: newResource.resource_type,
        access_type: newResource.access_type,
        has_file: !!file_reference,
        external_url: safeUrl
      }
    });

    res.status(201).json({
      message: 'Digital resource catalogue entry created successfully.',
      resource: newResource
    });
  } catch (err) {
    console.error('Librarian create digital resource error:', err);
    res.status(500).json({ error: err.message || 'Failed to create digital resource.' });
  }
});

// PUT /api/librarian/digital-resources/:id - Update resource metadata and optional file
router.put('/digital-resources/:id', resourceUpload.single('file'), async (req, res) => {
  try {
    const resource = await DigitalResource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Digital resource not found.' });
    }

    const {
      title,
      description,
      author,
      publisher,
      category,
      subject,
      department,
      resource_type,
      publication_year,
      external_url,
      access_type,
      publication_status,
      tags,
      cover_image
    } = req.body;

    if (title) resource.title = title.trim();
    if (description !== undefined) resource.description = description.trim();
    if (author !== undefined) resource.author = author.trim();
    if (publisher !== undefined) resource.publisher = publisher.trim();
    if (category) resource.category = category.trim();
    if (subject !== undefined) resource.subject = subject.trim();
    if (department !== undefined) resource.department = department.trim();
    if (resource_type) resource.resource_type = resource_type;
    if (publication_year) resource.publication_year = parseInt(publication_year) || resource.publication_year;
    if (access_type) resource.access_type = access_type;
    if (publication_status) resource.publication_status = publication_status;
    if (cover_image !== undefined) resource.cover_image = cover_image.trim();

    if (external_url !== undefined) {
      const safeUrl = external_url.trim();
      if (safeUrl && !safeUrl.startsWith('https://') && !safeUrl.startsWith('http://')) {
        return res.status(400).json({ error: 'External URL must begin with https:// or http://' });
      }
      resource.external_url = safeUrl;
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) resource.tags = tags;
      else if (typeof tags === 'string') {
        resource.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    // Replace file if uploaded
    if (req.file) {
      // Remove old file from disk if it was stored
      if (resource.file_reference && resource.file_reference.storage_path) {
        const oldPath = path.resolve(__dirname, '..', resource.file_reference.storage_path);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) {}
        }
      }

      resource.file_reference = {
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        storage_path: path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/')
      };
    }

    resource.updated_by = req.user._id;
    await resource.save();

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action: 'UPDATE_RESOURCE',
      category: 'DIGITAL_RESOURCE',
      target_id: resource._id.toString(),
      target_description: `Updated metadata for resource "${resource.title}"`,
      details: {
        status: resource.publication_status,
        access_type: resource.access_type,
        updated_file: !!req.file
      }
    });

    res.json({
      message: 'Digital resource updated successfully.',
      resource
    });
  } catch (err) {
    console.error('Librarian update digital resource error:', err);
    res.status(500).json({ error: err.message || 'Failed to update digital resource.' });
  }
});

// PATCH /api/librarian/digital-resources/:id/status - Quick publish/unpublish/archive toggle
router.patch('/digital-resources/:id/status', async (req, res) => {
  try {
    const { publication_status } = req.body;
    if (!['PUBLISHED', 'DRAFT', 'ARCHIVED'].includes(publication_status)) {
      return res.status(400).json({ error: 'Valid status required: PUBLISHED, DRAFT, or ARCHIVED.' });
    }

    const resource = await DigitalResource.findByIdAndUpdate(
      req.params.id,
      { publication_status, updated_by: req.user._id },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({ error: 'Digital resource not found.' });
    }

    await AuditLog.create({
      actor: req.user._id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action: 'CHANGE_STATUS',
      category: 'DIGITAL_RESOURCE',
      target_id: resource._id.toString(),
      target_description: `Changed publication status of "${resource.title}" to ${publication_status}`,
      details: { new_status: publication_status }
    });

    res.json({
      message: `Resource status changed to ${publication_status}.`,
      resource
    });
  } catch (err) {
    console.error('Librarian update status error:', err);
    res.status(500).json({ error: 'Failed to update resource status.' });
  }
});

// DELETE /api/librarian/digital-resources/:id - Delete resource & clean up file
router.delete('/digital-resources/:id', async (req, res) => {
  try {
    const resource = await DigitalResource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Digital resource not found.' });
    }

    // Unlink physical file if exists
    if (resource.file_reference && resource.file_reference.storage_path) {
      const filePath = path.resolve(__dirname, '..', resource.file_reference.storage_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    // Clean up associated bookmarks
    await Promise.all([
      ResourceBookmark.deleteMany({ resource: resource._id }),
      DigitalResource.findByIdAndDelete(resource._id)
    ]);

    // Audit log
    await AuditLog.create({
      actor: req.user._id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      action: 'DELETE_RESOURCE',
      category: 'DIGITAL_RESOURCE',
      target_id: resource._id.toString(),
      target_description: `Deleted digital resource "${resource.title}" (${resource.category})`,
      details: {
        title: resource.title,
        category: resource.category,
        views: resource.views_count,
        downloads: resource.downloads_count
      }
    });

    res.json({
      message: `Resource "${resource.title}" has been deleted from the catalogue.`
    });
  } catch (err) {
    console.error('Librarian delete digital resource error:', err);
    res.status(500).json({ error: 'Failed to delete digital resource.' });
  }
});

module.exports = router;

