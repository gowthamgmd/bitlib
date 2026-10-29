const express = require('express');
const { Seat, Floor, Session, SeatBooking, Notification, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all 3 floors
router.get('/floors', async (req, res) => {
  try {
    const floors = await Floor.find().sort({ floor_number: 1 });
    res.json({ floors });
  } catch (err) {
    console.error('Error fetching floors:', err);
    res.status(500).json({ error: 'Failed to fetch floors.' });
  }
});

// Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ session_number: 1 });
    res.json({ sessions });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

// Get seat layout and live occupancy for a given Floor, Date, and Session
// Public or Authenticated (if authenticated, highlights user's own reserved seat)
router.get('/layout', async (req, res) => {
  try {
    const floorNumber = parseInt(req.query.floor_number) || 1;
    const sessionNumber = parseInt(req.query.session_number) || 1;
    const bookingDate = req.query.date || new Date().toISOString().split('T')[0];

    // Optional user token from Authorization header
    let currentUserId = null;
    let currentUserGender = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        currentUserId = decoded.id;
        const liveUser = await User.findById(decoded.id);
        currentUserGender = liveUser ? liveUser.gender : decoded.gender;
      } catch (e) {
        // Token invalid or expired; proceed as guest
      }
    }

    const [floor, session, allSeats] = await Promise.all([
      Floor.findOne({ floor_number: floorNumber }),
      Session.findOne({ session_number: sessionNumber }),
      Seat.find({ floor_number: floorNumber }).sort({ row_index: 1, col_index: 1 })
    ]);

    if (!floor) {
      return res.status(404).json({ error: `Floor ${floorNumber} not found.` });
    }

    if (!session) {
      return res.status(404).json({ error: `Session ${sessionNumber} not found.` });
    }

    // Get all confirmed seat bookings for this session and date
    const activeBookings = await SeatBooking.find({
      session_number: sessionNumber,
      booking_date: bookingDate,
      status: 'CONFIRMED'
    }).populate('user', 'roll_number name gender');

    const bookingMap = new Map();
    activeBookings.forEach(b => {
      bookingMap.set(b.seat.toString(), b);
    });

    // Partition seats into Left (Boys - Blue) and Right (Girls - Pink)
    const boysSeats = [];
    const girlsSeats = [];

    allSeats.forEach(seat => {
      const seatIdStr = seat._id.toString();
      const existingBooking = bookingMap.get(seatIdStr);

      let seatState = 'AVAILABLE';
      let isMyBooking = false;
      let bookedByRoll = null;

      if (seat.status === 'MAINTENANCE') {
        seatState = 'MAINTENANCE';
      } else if (existingBooking) {
        if (currentUserId && existingBooking.user && existingBooking.user._id.toString() === currentUserId.toString()) {
          seatState = 'MINE';
          isMyBooking = true;
        } else {
          seatState = 'BOOKED';
        }
        bookedByRoll = existingBooking.user ? existingBooking.user.roll_number : null;
      }

      // Check gender accessibility rule for current user
      const isRestrictedForUser = currentUserGender
        ? (currentUserGender === 'MALE' && seat.zone === 'GIRLS') ||
          (currentUserGender === 'FEMALE' && seat.zone === 'BOYS')
        : false;

      const seatData = {
        _id: seat._id,
        seat_number: seat.seat_number,
        floor_number: seat.floor_number,
        zone: seat.zone,
        side: seat.side,
        table_number: seat.table_number,
        table_type: seat.table_type,
        table_position: seat.table_position,
        color_theme: seat.color_theme,
        row_index: seat.row_index,
        col_index: seat.col_index,
        state: seatState,
        is_my_booking: isMyBooking,
        booking_id: existingBooking ? existingBooking._id : null,
        booked_by: bookedByRoll,
        is_restricted_for_user: isRestrictedForUser
      };

      if (seat.side === 'LEFT') {
        boysSeats.push(seatData);
      } else {
        girlsSeats.push(seatData);
      }
    });

    // Group into tables
    const groupIntoTables = (seatsList) => {
      const tableMap = new Map();
      seatsList.forEach(s => {
        if (!tableMap.has(s.table_number)) {
          tableMap.set(s.table_number, {
            table_number: s.table_number,
            table_type: s.table_type,
            row_index: s.row_index,
            col_index: s.col_index,
            seats: []
          });
        }
        tableMap.get(s.table_number).seats.push(s);
      });
      return Array.from(tableMap.values()).sort((a, b) => {
        if (a.col_index !== b.col_index) return a.col_index - b.col_index;
        return a.row_index - b.row_index;
      });
    };

    const boysTables = groupIntoTables(boysSeats);
    const girlsTables = groupIntoTables(girlsSeats);

    const totalSeats = allSeats.length;
    const bookedCount = activeBookings.filter(b => allSeats.some(s => s._id.toString() === b.seat.toString())).length;
    const availableCount = totalSeats - bookedCount;

    res.json({
      floor,
      session,
      booking_date: bookingDate,
      stats: {
        total: totalSeats,
        booked: bookedCount,
        available: availableCount,
        occupancy_rate: totalSeats > 0 ? Math.round((bookedCount / totalSeats) * 100) : 0
      },
      layout: {
        left_wing: {
          title: 'Boys Seating Wing (West)',
          side: 'LEFT',
          zone: 'BOYS',
          color: '#2563eb', // Blue
          seats: boysSeats,
          tables: boysTables
        },
        right_wing: {
          title: 'Girls Seating Wing (East)',
          side: 'RIGHT',
          zone: 'GIRLS',
          color: '#ec4899', // Pink
          seats: girlsSeats,
          tables: girlsTables
        }
      }
    });
  } catch (err) {
    console.error('Error fetching seat layout:', err);
    res.status(500).json({ error: 'Failed to fetch seat layout.' });
  }
});

// Reserve a seat
router.post('/reserve', authenticateToken, async (req, res) => {
  try {
    const { seat_id, booking_date, session_number } = req.body;
    const userId = req.user.id;
    const dbUser = await User.findById(userId);
    const userGender = dbUser ? dbUser.gender : req.user.gender;

    if (!seat_id || !booking_date || !session_number) {
      return res.status(400).json({ error: 'Seat ID, booking date, and session number are required.' });
    }

    // 1. Verify Seat exists
    const seat = await Seat.findById(seat_id);
    if (!seat) {
      return res.status(404).json({ error: 'Seat not found.' });
    }

    if (seat.status === 'MAINTENANCE') {
      return res.status(400).json({ error: 'This seat is currently unavailable due to maintenance.' });
    }

    // 2. Enforce Gender Access Rules
    if (userGender === 'MALE' && seat.zone !== 'BOYS') {
      return res.status(403).json({
        error: 'Access Restricted: Male students can only reserve seats in the designated Boys Seating Zone (Left Wing / Blue).'
      });
    }

    if (userGender === 'FEMALE' && seat.zone !== 'GIRLS') {
      return res.status(403).json({
        error: 'Access Restricted: Female students can only reserve seats in the designated Girls Seating Zone (Right Wing / Pink).'
      });
    }

    // 3. Verify Session exists
    const session = await Session.findOne({ session_number: parseInt(session_number) });
    if (!session) {
      return res.status(404).json({ error: `Session ${session_number} not found.` });
    }

    // 4. Check if student already has a booking for the same date and session
    const existingUserBooking = await SeatBooking.findOne({
      user: userId,
      booking_date: booking_date,
      session_number: parseInt(session_number),
      status: 'CONFIRMED'
    }).populate('seat');

    if (existingUserBooking) {
      return res.status(409).json({
        error: `You already have an active seat reservation (Seat ${existingUserBooking.seat.seat_number}) for ${session.label} on ${booking_date}. Please cancel your existing booking first.`
      });
    }

    // 5. Atomic Reservation attempt (Protected by MongoDB Unique Index)
    try {
      const newBooking = await SeatBooking.create({
        user: userId,
        seat: seat._id,
        session: session._id,
        session_number: session.session_number,
        booking_date: booking_date,
        status: 'CONFIRMED'
      });

      // 6. Create student notification
      await Notification.create({
        user: userId,
        title: 'Seat Reservation Confirmed',
        message: `Seat ${seat.seat_number} on Floor ${seat.floor_number} (${seat.zone === 'BOYS' ? 'Boys Left Wing' : 'Girls Right Wing'}) is confirmed for ${session.label} on ${booking_date}.`,
        type: 'SEAT'
      });

      const populated = await SeatBooking.findById(newBooking._id)
        .populate('seat')
        .populate('session')
        .populate('user', 'roll_number name gender department');

      res.status(201).json({
        message: 'Seat successfully reserved!',
        booking: populated
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        return res.status(409).json({
          error: `Seat ${seat.seat_number} was just reserved by another student for ${session.label}. Please select another seat.`
        });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error('Reservation error:', err);
    res.status(500).json({ error: 'Internal server error while reserving seat.' });
  }
});

// Cancel a seat booking
router.post('/cancel/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await SeatBooking.findById(bookingId).populate('seat').populate('session');

    if (!booking) {
      return res.status(404).json({ error: 'Reservation record not found.' });
    }

    // Only owner or admin can cancel
    if (booking.user.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This booking has already been cancelled.' });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    // Create notification
    await Notification.create({
      user: booking.user,
      title: 'Seat Reservation Cancelled',
      message: `Your booking for Seat ${booking.seat.seat_number} on ${booking.booking_date} (${booking.session.label}) has been cancelled.`,
      type: 'SEAT'
    });

    res.json({
      message: 'Seat reservation cancelled successfully.',
      booking
    });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Failed to cancel reservation.' });
  }
});

// Get student's personal bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await SeatBooking.find({ user: req.user.id })
      .populate('seat')
      .populate('session')
      .sort({ booking_date: -1, createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error('Error fetching my bookings:', err);
    res.status(500).json({ error: 'Failed to retrieve your bookings.' });
  }
});

module.exports = router;
