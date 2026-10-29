const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  roll_number: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, default: '' },
  gender: { type: String, enum: ['MALE', 'FEMALE'], default: 'MALE' },
  role: { type: String, enum: ['STUDENT', 'LIBRARIAN', 'ADMIN'], default: 'STUDENT' },
  department: { type: String, default: 'Engineering' },
  // Profile fields
  year: { type: Number, default: 1 },           // Current year of study (1-4)
  join_year: { type: String, default: '' },       // e.g. '23' parsed from email
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatar_color: { type: String, default: '#2563eb' }, // random accent color on register
  profile_complete: { type: Boolean, default: false } // false until profile setup is done
}, { timestamps: true });

// Floor Schema
const floorSchema = new mongoose.Schema({
  floor_number: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String }
});

// Seat Schema
const seatSchema = new mongoose.Schema({
  floor_number: { type: Number, required: true, min: 1, max: 3 },
  zone: { type: String, enum: ['BOYS', 'GIRLS'], required: true },
  side: { type: String, enum: ['LEFT', 'RIGHT'], required: true },
  color_theme: { type: String, required: true }, // Blue: #2563eb, Pink: #ec4899
  seat_number: { type: String, required: true, unique: true }, // e.g. F1-B-T1-01
  table_number: { type: String, required: true }, // e.g. BT1, ST1
  table_type: { type: String, enum: ['RECTANGULAR_8', 'SQUARE_4'], required: true },
  table_position: { type: String, required: true }, // TOP_1..TOP_4, BOTTOM_1..BOTTOM_4, or TOP, BOTTOM, LEFT, RIGHT
  row_index: { type: Number, required: true },
  col_index: { type: Number, required: true },
  status: { type: String, enum: ['ACTIVE', 'MAINTENANCE'], default: 'ACTIVE' }
});

// Session Schema (Exact BIT College Timings)
const sessionSchema = new mongoose.Schema({
  session_number: { type: Number, required: true, unique: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  label: { type: String, required: true }
});

// Seat Booking Schema
const seatBookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seat: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  session_number: { type: Number, required: true },
  booking_date: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED', 'COMPLETED'], default: 'CONFIRMED' },
  cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellation_reason: { type: String, default: '' }
}, { timestamps: true });

// Compound index to guarantee atomic double-booking prevention in MongoDB
seatBookingSchema.index(
  { seat: 1, booking_date: 1, session: 1 },
  { unique: true, partialFilterExpression: { status: 'CONFIRMED' } }
);

// Book Metadata Schema
const bookSchema = new mongoose.Schema({
  isbn: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  publisher: { type: String },
  publication_year: { type: Number },
  cover_image: { type: String },
  description: { type: String }
}, { timestamps: true });

// Physical Book Copies Schema
const bookCopySchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  barcode: { type: String, required: true, unique: true },
  shelf_location: { type: String },
  status: { type: String, enum: ['AVAILABLE', 'BORROWED', 'MAINTENANCE', 'DAMAGED', 'LOST'], default: 'AVAILABLE' }
});

// Book Loan Schema
const bookLoanSchema = new mongoose.Schema({
  copy: { type: mongoose.Schema.Types.ObjectId, ref: 'BookCopy', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  returned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issue_date: { type: Date, default: Date.now },
  due_date: { type: Date, required: true },
  return_date: { type: Date },
  fine_amount: { type: Number, default: 0.0 },
  status: { type: String, enum: ['ISSUED', 'RETURNED', 'OVERDUE'], default: 'ISSUED' }
}, { timestamps: true });

// Discussion Room Schema (Exactly 4 rooms)
const discussionRoomSchema = new mongoose.Schema({
  room_number: { type: Number, required: true, unique: true, min: 1, max: 4 },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  facilities: [{ type: String }],
  status: { type: String, enum: ['AVAILABLE', 'MAINTENANCE'], default: 'AVAILABLE' }
});

// Discussion Room Booking Schema
const roomBookingSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionRoom', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  session_number: { type: Number, required: true },
  booking_date: { type: String, required: true }, // Format: YYYY-MM-DD
  club_name: { type: String, required: true, trim: true },
  purpose: { type: String, required: true, trim: true },
  attendees_count: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
  admin_remarks: { type: String, default: '' },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewed_at: { type: Date }
}, { timestamps: true });

// Prevent overlapping approved bookings for the same room & session
roomBookingSchema.index(
  { room: 1, booking_date: 1, session: 1 },
  { unique: true, partialFilterExpression: { status: 'APPROVED' } }
);

// Notifications Schema
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['SEAT', 'BOOK', 'ROOM', 'FINE', 'SYSTEM'], default: 'SYSTEM' },
  is_read: { type: Boolean, default: false }
}, { timestamps: true });

// Digital Resource Schema
const digitalResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  author: { type: String, trim: true, default: '' },
  publisher: { type: String, trim: true, default: '' },
  category: {
    type: String,
    enum: [
      'E-books and Textbooks',
      'Research Papers and Journals',
      'Previous-Year Question Papers',
      'Lecture Notes and Study Materials',
      'Laboratory Manuals',
      'Programming and Technical Tutorials',
      'Online Courses and Educational Videos',
      'Other Academic Resources'
    ],
    required: true
  },
  subject: { type: String, trim: true, default: 'General' },
  department: { type: String, trim: true, default: 'All Departments' },
  resource_type: {
    type: String,
    enum: ['PDF', 'EBOOK', 'JOURNAL', 'VIDEO', 'EXTERNAL_LINK', 'LAB_MANUAL', 'TUTORIAL'],
    default: 'PDF'
  },
  publication_year: { type: Number, default: () => new Date().getFullYear() },
  cover_image: { type: String, default: '' },
  file_reference: {
    filename: { type: String },
    original_name: { type: String },
    mime_type: { type: String },
    file_size: { type: Number },
    storage_path: { type: String }
  },
  external_url: { type: String, trim: true, default: '' },
  access_type: {
    type: String,
    enum: ['OPEN_ACCESS', 'INSTITUTIONAL', 'RESTRICTED'],
    default: 'INSTITUTIONAL'
  },
  publication_status: {
    type: String,
    enum: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
    default: 'PUBLISHED'
  },
  tags: [{ type: String, trim: true }],
  views_count: { type: Number, default: 0 },
  downloads_count: { type: Number, default: 0 },
  bookmarks_count: { type: Number, default: 0 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

digitalResourceSchema.index({ category: 1, publication_status: 1 });
digitalResourceSchema.index({ department: 1, publication_status: 1 });
digitalResourceSchema.index({ title: 'text', description: 'text', author: 'text', subject: 'text', tags: 'text' });

// Resource Bookmark Schema
const resourceBookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalResource', required: true }
}, { timestamps: true });

resourceBookmarkSchema.index({ user: 1, resource: 1 }, { unique: true });

// Resource Activity / Access Log Schema
const resourceActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalResource', required: true },
  activity_type: { type: String, enum: ['VIEW', 'DOWNLOAD', 'EXTERNAL_VISIT'], required: true }
}, { timestamps: true });

resourceActivitySchema.index({ user: 1, createdAt: -1 });

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actor_name: { type: String, default: 'System Automated Job' },
  actor_role: { type: String, default: 'SYSTEM' },
  action: { type: String, required: true },
  category: { type: String, enum: ['SEAT', 'BOOK', 'ROOM', 'DIGITAL_RESOURCE', 'SYSTEM'], required: true },
  target_id: { type: String },
  target_description: { type: String, required: true },
  reason: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Floor = mongoose.model('Floor', floorSchema);
const Seat = mongoose.model('Seat', seatSchema);
const Session = mongoose.model('Session', sessionSchema);
const SeatBooking = mongoose.model('SeatBooking', seatBookingSchema);
const Book = mongoose.model('Book', bookSchema);
const BookCopy = mongoose.model('BookCopy', bookCopySchema);
const BookLoan = mongoose.model('BookLoan', bookLoanSchema);
const DiscussionRoom = mongoose.model('DiscussionRoom', discussionRoomSchema);
const RoomBooking = mongoose.model('RoomBooking', roomBookingSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const DigitalResource = mongoose.model('DigitalResource', digitalResourceSchema);
const ResourceBookmark = mongoose.model('ResourceBookmark', resourceBookmarkSchema);
const ResourceActivity = mongoose.model('ResourceActivity', resourceActivitySchema);

module.exports = {
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
};
