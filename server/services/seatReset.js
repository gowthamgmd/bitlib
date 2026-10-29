const { SeatBooking, AuditLog, Session } = require('../models');

/**
 * Idempotently mark past / expired seat bookings as COMPLETED.
 * Preserves all permanent seat layouts, student records, and audit history.
 * Never deletes any rows.
 */
async function performDailySeatReset(actorUser = null, targetDate = null) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const compareDate = targetDate || today;

    // Find all CONFIRMED bookings with booking_date strictly prior to compareDate
    const pastBookings = await SeatBooking.find({
      booking_date: { $lt: compareDate },
      status: 'CONFIRMED'
    });

    let expiredCount = 0;
    if (pastBookings.length > 0) {
      const pastIds = pastBookings.map(b => b._id);
      const updateResult = await SeatBooking.updateMany(
        { _id: { $in: pastIds } },
        { $set: { status: 'COMPLETED' } }
      );
      expiredCount = updateResult.modifiedCount || pastBookings.length;
    }

    // Also check for today's past sessions if compareDate === today
    // e.g. Session 1 ended at 10:25 AM, if local time is past 10:25 AM
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    const sessions = await Session.find().lean();
    const expiredSessionNumbers = [];

    sessions.forEach(sess => {
      if (sess.end_time && sess.end_time < currentTimeStr) {
        expiredSessionNumbers.push(sess.session_number);
      }
    });

    let todayExpiredCount = 0;
    if (expiredSessionNumbers.length > 0 && compareDate === today) {
      const todayPastResult = await SeatBooking.updateMany(
        {
          booking_date: today,
          session_number: { $in: expiredSessionNumbers },
          status: 'CONFIRMED'
        },
        { $set: { status: 'COMPLETED' } }
      );
      todayExpiredCount = todayPastResult.modifiedCount || 0;
    }

    const totalCompleted = expiredCount + todayExpiredCount;

    // Record in AuditLog
    await AuditLog.create({
      actor: actorUser ? (actorUser._id || actorUser.id) : null,
      actor_name: actorUser?.name || 'Automated Scheduler',
      actor_role: actorUser?.role || 'SYSTEM',
      action: 'DAILY_SEAT_RESET',
      category: 'SEAT',
      target_description: `Daily seat availability reset executed for ${compareDate}`,
      details: {
        targetDate: compareDate,
        previousDaysCompleted: expiredCount,
        todayExpiredSessionsCompleted: todayExpiredCount,
        totalCompleted
      }
    });

    return {
      success: true,
      message: `Daily seat reset completed safely. ${totalCompleted} expired reservation(s) marked as COMPLETED. Permanent layout preserved.`,
      targetDate: compareDate,
      expiredCount,
      todayExpiredCount,
      totalCompleted
    };
  } catch (err) {
    console.error('Error during daily seat reset:', err);
    throw err;
  }
}

module.exports = {
  performDailySeatReset
};
