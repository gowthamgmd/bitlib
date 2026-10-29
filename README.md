# 📚 BITSathy Central Library Management System

A Central Library Management System built for **Bannari Amman Institute of Technology (BITSathy)**.

## 🚀 Key Modules & Capabilities

1. **Library Seat Booking & Interactive Floor Map**
   - 360 physical seats across 3 library floors (Floor 1 Ground Floor, Floor 2 Digital Library, Floor 3 Silent Reading).
   - Zone-separated seating architecture: **Boys Seating Wing (West / Blue)** and **Girls Seating Wing (East / Pink)**.
   - 5 daily operational time slots with real-time seat status (`AVAILABLE`, `BOOKED`, `MINE`, `MAINTENANCE`).
   - Digital Gate Pass with QR code verification and check-in confirmation.

2. **Book Lending & Circulation**
   - Complete book catalogue across academic disciplines (Computer Science, Artificial Intelligence, Electronics, Literature, Mechanical, etc.).
   - Multi-copy inventory tracking with barcode scanning.
   - Borrowing limit validation (max 3 active books per student).
   - Automated overdue tracking at ₹2.00/day past due date.

3. **Discussion Room Reservation**
   - 4 specialized collaborative discussion rooms (`Turing Hall`, `Lovelace Conference Room`, `Ramanujan Study Suite`, `Hopper Seminar Room`).
   - Club/community reservation requests with group attendee validation.
   - Strict time-slot conflict check to prevent double bookings.

4. **Student Booking Dashboard**
   - Personal active reservations, live passes, loan history, fine calculators, and in-app notification center.
   - Profile management with Roll Number, Department, and Year of study.

5. **Librarian Operations Portal**
   - Dedicated 12-section administrative dashboard for authorized library staff (`LIBRARIAN` and `ADMIN`).
   - Operational overview KPIs: floor occupancy, circulation metrics, overdue loans, room approvals.
   - Administrative seat cancellation with mandatory reason and student notification.
   - Seat maintenance blocking/unblocking.
   - Safe, idempotent daily seat availability reset engine (preserves permanent physical seat layout).
   - Book catalogue CRUD and barcode copy generator.
   - Circulation desk for rapid issue and return by student roll number and barcode.
   - Discussion room request review, conflict checking, approval, and rejection.
   - Student records registry with drill-down modal into active bookings and loans.
   - Tamper-evident administrative audit log.
   - Floor-wise, gender-zone, and fine collection operational reports.

6. **Authentication & Security**
   - Google OAuth 2.0 / OpenID Connect restricted to `@bitsathy.ac.in` institutional domain.
   - Role-Based Access Control (RBAC): `STUDENT`, `LIBRARIAN`, `ADMIN`.
   - JWT session management and protected REST API endpoints.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Lucide Icons, Pure CSS Design System
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: Google OAuth 2.0 / OpenID Connect + JWT
- **Scheduled Tasks**: Automated hourly seat reset service

---

## 💻 Getting Started Locally

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://localhost:27017` (or MongoDB Atlas URI)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/gowthamgmd/bitlib.git
cd bitlib

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/bitlib
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
PORT=5000
```

### 4. Running the Application
```bash
# Start backend server
node server/index.js

# In another terminal, start frontend client
cd client
npm run dev
```

Visit `http://localhost:3000` (or the port indicated by Vite) in your browser.

---

## 👥 User Roles for Evaluation

- **Librarian Staff**: `librarian@bitsathy.ac.in` (Staff ID: `LIB-001`, Dr. S. Ramanathan)
- **Administrator**: `admin@bitsathy.ac.in` (Chief Librarian)
- **Student (Male)**: `gowthamg.it23@bitsathy.ac.in` (Roll: `7376231IT101`, Information Technology)
- **Student (Female)**: `darshanaramesh.ad23@bitsathy.ac.in` (Roll: `7376231AD102`, AI & Data Science)
