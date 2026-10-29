require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Connect to MongoDB & Seed default data
connectDB();

// Route Handlers
const authRoutes = require('./routes/auth');
const seatRoutes = require('./routes/seats');
const bookRoutes = require('./routes/books');
const roomRoutes = require('./routes/rooms');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');
const librarianRoutes = require('./routes/librarian');
const digitalResourceRoutes = require('./routes/digitalResources');
const { performDailySeatReset } = require('./services/seatReset');

app.use('/api/auth', authRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/librarian', librarianRoutes);
app.use('/api/digital-resources', digitalResourceRoutes);

// Automatic scheduled background job for daily seat availability reset
setInterval(async () => {
  try {
    await performDailySeatReset();
  } catch (err) {
    console.error('Scheduled daily seat reset error:', err.message);
  }
}, 60 * 60 * 1000); // Check hourly

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: 'MongoDB',
    system: 'BIT Central Library Management System',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`BIT Central Library Server running on port ${PORT}`);
  console.log(`MongoDB Connected. Health: http://localhost:${PORT}/api/health`);
  console.log(`=================================================`);
});

module.exports = app;
