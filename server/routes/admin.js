const express = require('express');
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
  RoomBooking
} = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

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

// 1. GET /api/admin/analytics - Comprehensive Library Analytics & Circulation Reports
router.get('/analytics', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalStudents,
      totalBooks,
      totalCopies,
      activeLoans,
      returnedLoans,
      floors,
      allSeats,
      todaySeatBookings,
      totalRooms,
      roomBookings
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT' }),
      Book.countDocuments(),
      BookCopy.countDocuments(),
      BookLoan.find({ status: { $in: ['ISSUED', 'OVERDUE'] } }).populate('book copy user').lean(),
      BookLoan.find({ status: 'RETURNED' }).lean(),
      Floor.find().sort({ floor_number: 1 }).lean(),
      Seat.find().lean(),
      SeatBooking.find({ booking_date: today, status: 'CONFIRMED' }).lean(),
      DiscussionRoom.countDocuments(),
      RoomBooking.find().lean()
    ]);

    // Calculate Overdue loans and fines
    const now = new Date();
    let overdueCount = 0;
    let totalPendingFines = 0;

    activeLoans.forEach(loan => {
      const due = new Date(loan.due_date);
      if (now > due) {
        overdueCount++;
        totalPendingFines += calculateFine(loan.due_date, now);
      }
    });

    const collectedFines = returnedLoans.reduce((sum, l) => sum + (l.fine_amount || 0), 0);

    // Floor-wise Occupancy Analytics for Today
    const floorAnalytics = floors.map(f => {
      const floorSeats = allSeats.filter(s => s.floor_number === f.floor_number);
      const floorBookings = todaySeatBookings.filter(b =>
        floorSeats.some(s => s._id.toString() === b.seat.toString())
      );

      const boysSeats = floorSeats.filter(s => s.zone === 'BOYS');
      const girlsSeats = floorSeats.filter(s => s.zone === 'GIRLS');

      const boysBookings = floorBookings.filter(b =>
        boysSeats.some(s => s._id.toString() === b.seat.toString())
      );
      const girlsBookings = floorBookings.filter(b =>
        girlsSeats.some(s => s._id.toString() === b.seat.toString())
      );

      return {
        floor_number: f.floor_number,
        name: f.name,
        total_seats: floorSeats.length,
        booked_today: floorBookings.length,
        occupancy_rate: floorSeats.length > 0 ? Math.round((floorBookings.length / floorSeats.length) * 100) : 0,
        boys_zone: {
          total: boysSeats.length,
          booked: boysBookings.length,
          occupancy_rate: boysSeats.length > 0 ? Math.round((boysBookings.length / boysSeats.length) * 100) : 0
        },
        girls_zone: {
          total: girlsSeats.length,
          booked: girlsBookings.length,
          occupancy_rate: girlsSeats.length > 0 ? Math.round((girlsBookings.length / girlsSeats.length) * 100) : 0
        }
      };
    });

    // Discussion Room Stats
    const approvedRooms = roomBookings.filter(r => r.status === 'APPROVED').length;
    const pendingRooms = roomBookings.filter(r => r.status === 'PENDING').length;

    res.json({
      overview: {
        total_students: totalStudents,
        total_unique_titles: totalBooks,
        total_physical_copies: totalCopies,
        available_copies: totalCopies - activeLoans.length,
        active_loans_count: activeLoans.length,
        overdue_loans_count: overdueCount,
        pending_fines: totalPendingFines,
        collected_fines: collectedFines,
        discussion_rooms_count: totalRooms,
        room_requests_pending: pendingRooms,
        room_requests_approved: approvedRooms
      },
      floor_occupancy: floorAnalytics,
      recent_active_loans: activeLoans.slice(0, 10).map(l => ({
        _id: l._id,
        title: l.book?.title,
        barcode: l.copy?.barcode,
        student: l.user?.name,
        roll_number: l.user?.roll_number,
        issue_date: l.issue_date,
        due_date: l.due_date,
        is_overdue: new Date() > new Date(l.due_date)
      }))
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: 'Failed to generate administrative analytics.' });
  }
});

// 2. GET /api/admin/students - List all registered students with active borrowings & fines
router.get('/students', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const students = await User.find({ role: 'STUDENT' })
      .select('-password_hash')
      .sort({ roll_number: 1 })
      .lean();

    const studentIds = students.map(s => s._id);

    const [loans, seatBookings, roomBookings] = await Promise.all([
      BookLoan.find({ user: { $in: studentIds } }).lean(),
      SeatBooking.find({ user: { $in: studentIds }, status: 'CONFIRMED' }).lean(),
      RoomBooking.find({ user: { $in: studentIds } }).lean()
    ]);

    const enrichedStudents = students.map(st => {
      const userLoans = loans.filter(l => l.user.toString() === st._id.toString());
      const activeLoans = userLoans.filter(l => l.status === 'ISSUED' || l.status === 'OVERDUE');
      const userSeats = seatBookings.filter(s => s.user.toString() === st._id.toString());
      const userRooms = roomBookings.filter(r => r.user.toString() === st._id.toString());

      return {
        ...st,
        active_loans_count: activeLoans.length,
        active_seats_count: userSeats.length,
        room_requests_count: userRooms.length
      };
    });

    res.json({ students: enrichedStudents });
  } catch (err) {
    console.error('Admin students list error:', err);
    res.status(500).json({ error: 'Failed to retrieve students list.' });
  }
});

// 3. PATCH /api/admin/seats/:id/status - Maintenance toggle for seats
router.patch('/seats/:id/status', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'MAINTENANCE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or MAINTENANCE.' });
    }

    const seat = await Seat.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!seat) return res.status(404).json({ error: 'Seat not found.' });

    res.json({ message: `Seat ${seat.seat_number} status set to ${status}.`, seat });
  } catch (err) {
    console.error('Seat status update error:', err);
    res.status(500).json({ error: 'Failed to update seat status.' });
  }
});

// 4. PATCH /api/admin/rooms/:id/status - Maintenance toggle for discussion rooms
router.patch('/rooms/:id/status', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['AVAILABLE', 'MAINTENANCE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be AVAILABLE or MAINTENANCE.' });
    }

    const room = await DiscussionRoom.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    res.json({ message: `${room.name} status set to ${status}.`, room });
  } catch (err) {
    console.error('Room status update error:', err);
    res.status(500).json({ error: 'Failed to update room status.' });
  }
});

module.exports = router;
