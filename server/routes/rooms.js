const express = require('express');
const { DiscussionRoom, RoomBooking, Session, User, Notification } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// 1. Get all 4 discussion rooms and their live availability for a date & session
router.get('/', async (req, res) => {
  try {
    const bookingDate = req.query.date || new Date().toISOString().split('T')[0];
    const sessionNumber = parseInt(req.query.session_number) || 1;

    const [rooms, session, bookings] = await Promise.all([
      DiscussionRoom.find().sort({ room_number: 1 }).lean(),
      Session.findOne({ session_number: sessionNumber }).lean(),
      RoomBooking.find({
        booking_date: bookingDate,
        session_number: sessionNumber,
        status: { $in: ['PENDING', 'APPROVED'] }
      }).populate('user', 'roll_number name department').lean()
    ]);

    const bookingMap = new Map();
    bookings.forEach(b => {
      bookingMap.set(b.room.toString(), b);
    });

    const enrichedRooms = rooms.map(room => {
      const activeBooking = bookingMap.get(room._id.toString());
      let slotStatus = 'AVAILABLE';
      let bookingDetails = null;

      if (room.status === 'MAINTENANCE') {
        slotStatus = 'MAINTENANCE';
      } else if (activeBooking) {
        slotStatus = activeBooking.status; // 'APPROVED' or 'PENDING'
        bookingDetails = {
          _id: activeBooking._id,
          club_name: activeBooking.club_name,
          purpose: activeBooking.purpose,
          attendees_count: activeBooking.attendees_count,
          booked_by: activeBooking.user ? activeBooking.user.name : null,
          roll_number: activeBooking.user ? activeBooking.user.roll_number : null,
          status: activeBooking.status
        };
      }

      return {
        ...room,
        slot_status: slotStatus,
        booking: bookingDetails
      };
    });

    res.json({
      booking_date: bookingDate,
      session,
      rooms: enrichedRooms
    });
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ error: 'Failed to fetch discussion rooms.' });
  }
});

// 2. Student: Submit a discussion room booking request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { room_id, booking_date, session_number, club_name, purpose, attendees_count } = req.body;
    const userId = req.user.id;

    if (!room_id || !booking_date || !session_number || !club_name || !purpose || !attendees_count) {
      return res.status(400).json({ error: 'All fields (Room, Date, Session, Club Name, Purpose, Attendees) are required.' });
    }

    const room = await DiscussionRoom.findById(room_id);
    if (!room) {
      return res.status(404).json({ error: 'Discussion room not found.' });
    }

    if (room.status === 'MAINTENANCE') {
      return res.status(400).json({ error: 'This discussion room is currently closed for maintenance.' });
    }

    const count = parseInt(attendees_count);
    if (count < 2) {
      return res.status(400).json({ error: 'Discussion rooms require a minimum of 2 attendees for group activity.' });
    }
    if (count > room.capacity) {
      return res.status(400).json({ error: `Selected room capacity is ${room.capacity} members. You specified ${count} attendees.` });
    }

    const session = await Session.findOne({ session_number: parseInt(session_number) });
    if (!session) {
      return res.status(404).json({ error: 'Invalid session selected.' });
    }

    // Check if room is already approved for this date & session
    const existingApproved = await RoomBooking.findOne({
      room: room._id,
      booking_date,
      session_number: parseInt(session_number),
      status: 'APPROVED'
    });

    if (existingApproved) {
      return res.status(409).json({
        error: `Discussion Room "${room.name}" is already reserved by ${existingApproved.club_name} for this session.`
      });
    }

    // Check if this student already has a pending or approved request for the same session
    const userConflict = await RoomBooking.findOne({
      user: userId,
      booking_date,
      session_number: parseInt(session_number),
      status: { $in: ['PENDING', 'APPROVED'] }
    });

    if (userConflict) {
      return res.status(409).json({
        error: 'You already have an active discussion room reservation request for this time slot.'
      });
    }

    // Auto-approve if user is Admin, else mark as PENDING for library admin approval
    const initialStatus = req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING';

    const booking = await RoomBooking.create({
      room: room._id,
      user: userId,
      session: session._id,
      session_number: session.session_number,
      booking_date,
      club_name: club_name.trim(),
      purpose: purpose.trim(),
      attendees_count: count,
      status: initialStatus
    });

    // Create notification
    await Notification.create({
      user: userId,
      title: initialStatus === 'APPROVED' ? 'Discussion Room Reserved' : 'Room Booking Request Submitted',
      message: `Your booking request for ${room.name} on ${booking_date} (${session.label}) on behalf of "${club_name}" is ${initialStatus.toLowerCase()}.`,
      type: 'ROOM'
    });

    const populated = await RoomBooking.findById(booking._id)
      .populate('room')
      .populate('session')
      .populate('user', 'roll_number name department');

    res.status(201).json({
      message: initialStatus === 'APPROVED' ? 'Room booking confirmed!' : 'Booking request submitted for librarian review.',
      booking: populated
    });
  } catch (err) {
    console.error('Room request error:', err);
    res.status(500).json({ error: 'Failed to submit room reservation request.' });
  }
});

// 3. Student: Get personal room booking requests
router.get('/my/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await RoomBooking.find({ user: req.user.id })
      .populate('room')
      .populate('session')
      .sort({ booking_date: -1, createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error('Error fetching my room bookings:', err);
    res.status(500).json({ error: 'Failed to retrieve room bookings.' });
  }
});

// 4. Student or Admin: Cancel room reservation
router.post('/cancel/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await RoomBooking.findById(req.params.id)
      .populate('room')
      .populate('session');

    if (!booking) {
      return res.status(404).json({ error: 'Room booking record not found.' });
    }

    if (booking.user.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This reservation is already cancelled.' });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    await Notification.create({
      user: booking.user,
      title: 'Discussion Room Booking Cancelled',
      message: `Your reservation for ${booking.room.name} on ${booking.booking_date} (${booking.session.label}) has been cancelled.`,
      type: 'ROOM'
    });

    res.json({
      message: 'Discussion room booking cancelled successfully.',
      booking
    });
  } catch (err) {
    console.error('Cancel room booking error:', err);
    res.status(500).json({ error: 'Failed to cancel room booking.' });
  }
});

// 5. Admin: List all room booking requests
router.get('/admin/requests', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const requests = await RoomBooking.find()
      .populate('room')
      .populate('session')
      .populate('user', 'roll_number name email department')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error('Admin fetch room requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve room requests.' });
  }
});

// 6. Admin: Approve or Reject room reservation request
router.patch('/admin/requests/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { action, admin_remarks } = req.body; // action: 'APPROVE' or 'REJECT'
    const bookingId = req.params.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either APPROVE or REJECT.' });
    }

    const booking = await RoomBooking.findById(bookingId)
      .populate('room')
      .populate('session');

    if (!booking) {
      return res.status(404).json({ error: 'Room booking request not found.' });
    }

    if (action === 'APPROVE') {
      // Check for overlapping approval
      const existingApproved = await RoomBooking.findOne({
        _id: { $ne: booking._id },
        room: booking.room._id,
        booking_date: booking.booking_date,
        session_number: booking.session_number,
        status: 'APPROVED'
      });

      if (existingApproved) {
        return res.status(409).json({
          error: `Cannot approve: Room is already booked and approved for ${existingApproved.club_name}.`
        });
      }

      booking.status = 'APPROVED';
    } else {
      booking.status = 'REJECTED';
    }

    booking.admin_remarks = admin_remarks ? admin_remarks.trim() : '';
    await booking.save();

    // Notify student of approval/rejection
    await Notification.create({
      user: booking.user,
      title: action === 'APPROVE' ? 'Discussion Room Approved!' : 'Discussion Room Request Rejected',
      message: action === 'APPROVE'
        ? `Your booking for ${booking.room.name} on ${booking.booking_date} (${booking.session.label}) has been APPROVED by the librarian.`
        : `Your booking request for ${booking.room.name} was rejected. Remarks: ${admin_remarks || 'Not specified'}.`,
      type: 'ROOM'
    });

    res.json({
      message: `Request successfully ${action === 'APPROVE' ? 'approved' : 'rejected'}.`,
      booking
    });
  } catch (err) {
    console.error('Review room request error:', err);
    res.status(500).json({ error: 'Failed to update room booking status.' });
  }
});

module.exports = router;
