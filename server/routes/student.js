const express = require('express');
const {
  User,
  SeatBooking,
  BookLoan,
  RoomBooking,
  Notification,
  Seat,
  Floor,
  Session,
  Book,
  BookCopy,
  DiscussionRoom,
  DigitalResource,
  ResourceBookmark,
  ResourceActivity
} = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const DAILY_FINE_RATE = 2.0;

function calculateFine(dueDate, returnDate = new Date()) {
  const due = new Date(dueDate);
  const ret = new Date(returnDate);
  if (ret <= due) return 0.0;
  const diffTime = Math.abs(ret - due);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays * DAILY_FINE_RATE;
}

// GET /api/student/dashboard - Unified Student Dashboard Data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch Student Profile
    const student = await User.findById(userId).select('-password_hash').lean();
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    // 2. Fetch Seat Reservations
    const seatBookings = await SeatBooking.find({ user: userId })
      .populate('seat')
      .populate('session')
      .sort({ booking_date: -1, createdAt: -1 })
      .lean();

    const activeSeats = seatBookings.filter(b => b.status === 'CONFIRMED');
    const pastSeats = seatBookings.filter(b => b.status !== 'CONFIRMED');

    // 3. Fetch Book Loans
    const bookLoans = await BookLoan.find({ user: userId })
      .populate('book')
      .populate('copy')
      .sort({ issue_date: -1 })
      .lean();

    const now = new Date();
    let totalFine = 0;

    const enrichedLoans = bookLoans.map(loan => {
      let status = loan.status;
      let fine = loan.fine_amount;

      if (loan.status === 'ISSUED') {
        const due = new Date(loan.due_date);
        if (now > due) {
          status = 'OVERDUE';
          fine = calculateFine(loan.due_date, now);
        }
      }

      totalFine += fine;

      // Calculate days remaining or days overdue
      const due = new Date(loan.due_date);
      const diffTime = due - now;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...loan,
        status,
        fine_amount: fine,
        days_remaining: daysRemaining,
        is_overdue: status === 'OVERDUE'
      };
    });

    const activeLoans = enrichedLoans.filter(l => l.status === 'ISSUED' || l.status === 'OVERDUE');
    const returnedLoans = enrichedLoans.filter(l => l.status === 'RETURNED');

    // 4. Fetch Discussion Room Bookings
    const roomBookings = await RoomBooking.find({ user: userId })
      .populate('room')
      .populate('session')
      .sort({ booking_date: -1, createdAt: -1 })
      .lean();

    // 5. Fetch Notifications
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const unreadNotifsCount = notifications.filter(n => !n.is_read).length;

    // 6. Fetch Student's Digital Resources (Bookmarks & Recent Access)
    const [bookmarks, digitalActivities, recentMaterials] = await Promise.all([
      ResourceBookmark.find({ user: userId })
        .populate('resource')
        .sort({ createdAt: -1 })
        .lean(),
      ResourceActivity.find({ user: userId })
        .populate('resource')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      DigitalResource.find({ publication_status: 'PUBLISHED' })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    ]);

    // Filter out bookmarks where resource might have been deleted
    const validBookmarks = bookmarks
      .filter(b => b.resource && b.resource.publication_status === 'PUBLISHED')
      .map(b => ({
        ...b.resource,
        bookmarked_at: b.createdAt
      }));

    // 7. Summary Stats
    const stats = {
      active_seat_passes: activeSeats.length,
      borrowed_books_count: activeLoans.length,
      max_borrow_limit: 3,
      club_room_bookings: roomBookings.length,
      total_accumulated_fines: totalFine,
      unread_notifications: unreadNotifsCount,
      saved_resources_count: validBookmarks.length
    };

    res.json({
      student,
      stats,
      seats: {
        active: activeSeats,
        history: pastSeats
      },
      books: {
        active_loans: activeLoans,
        returned_history: returnedLoans
      },
      rooms: roomBookings,
      digital_resources: {
        bookmarks: validBookmarks,
        recent_activity: digitalActivities,
        new_materials: recentMaterials
      },
      notifications
    });

  } catch (err) {
    console.error('Student dashboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve student dashboard data.' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { is_read: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id }, { is_read: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

module.exports = router;
