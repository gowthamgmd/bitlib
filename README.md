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
   - Integrated personal digital resources bookmark shelf and recent access activity.

5. **Digital Resources Discovery & Management Module**
   - Academic discovery hub organized into **8 prescribed categories**:
     1. *E-books and Textbooks* (Standard reference volumes & curriculum texts)
     2. *Research Papers and Journals* (IEEE, CVPR, NeurIPS reprints)
     3. *Previous-Year Question Papers* (Autonomous & Anna University end-semester question banks)
     4. *Lecture Notes and Study Materials* (Faculty unit-wise slides & formula sheets)
     5. *Laboratory Manuals* (Prescribed observation guides & viva questions)
     6. *Programming and Technical Tutorials* (Full-Stack, React, Node.js, PyTorch)
     7. *Online Courses and Educational Videos* (NPTEL, SWAYAM, MIT OpenCourseWare)
     8. *Other Academic Resources* (GATE CS guides, BITSathy LaTeX report templates)
   - Live multi-field keyword search (title, author, subject, tags).
   - Filter by category, department, subject, and resource format (PDF, E-book, Journal, Video, External Link, Lab Manual, Tutorial).
   - Detailed modal with complete academic metadata and engagement metrics (views, downloads, bookmarks).
   - Secure file streaming with MIME validation and safe external link redirection.
   - Persistent per-student bookmarking with sync across devices.
   - Dedicated Librarian Management Console for curating, uploading files (Multer), publishing, drafting, archiving, and deleting entries with audit logs.

6. **Librarian Operations Portal**
   - Dedicated administrative dashboard for authorized library staff (`LIBRARIAN` and `ADMIN`).
   - Operational overview KPIs: floor occupancy, circulation metrics, overdue loans, room approvals, and digital resource statistics.
   - Administrative seat cancellation with mandatory reason and student notification.
   - Seat maintenance blocking/unblocking.
   - Safe, idempotent daily seat availability reset engine (preserves permanent physical seat layout).
   - Book catalogue CRUD and barcode copy generator.
   - Circulation desk for rapid issue and return by student roll number and barcode.
   - Discussion room request review, conflict checking, approval, and rejection.
   - Student records registry with drill-down modal into active bookings and loans.
   - Tamper-evident administrative audit log.
   - Floor-wise, gender-zone, and fine collection operational reports.

7. **Authentication & Security**
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
