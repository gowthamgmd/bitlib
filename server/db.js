const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  User,
  Floor,
  Seat,
  Session,
  SeatBooking,
  Book,
  BookCopy,
  DiscussionRoom,
  Notification
} = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bitlib';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB successfully at ${MONGODB_URI}`);
    await seedInitialData();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

async function seedInitialData() {
  // 1. Seed Sessions (Exact college timing slots)
  const sessionCount = await Session.countDocuments();
  if (sessionCount === 0) {
    await Session.insertMany([
      { session_number: 1, start_time: '08:45', end_time: '10:25', label: 'Session 1: 08:45 AM - 10:25 AM' },
      { session_number: 2, start_time: '10:40', end_time: '12:20', label: 'Session 2: 10:40 AM - 12:20 PM' },
      { session_number: 3, start_time: '13:30', end_time: '15:10', label: 'Session 3: 01:30 PM - 03:10 PM' },
      { session_number: 4, start_time: '15:25', end_time: '16:30', label: 'Session 4: 03:25 PM - 04:30 PM' }
    ]);
  }

  // 2. Seed Default Accounts
  const userCount = await User.countDocuments();
  let student1, student2;
  if (userCount === 0) {
    const adminPassHash = bcrypt.hashSync('Admin@123', 10);
    const studentPassHash = bcrypt.hashSync('Student@123', 10);

    const insertedUsers = await User.insertMany([
      {
        roll_number: 'ADMIN001',
        name: 'Chief Librarian',
        email: 'admin@bitsathy.ac.in',
        password_hash: adminPassHash,
        gender: 'MALE',
        role: 'ADMIN',
        department: 'Central Library',
        year: 0,
        join_year: '',
        avatar_color: '#0891b2',
        profile_complete: true
      },
      {
        roll_number: '7376221CS101',
        name: 'Rahul Sharma',
        email: 'rahuls.cs21@bitsathy.ac.in',
        password_hash: studentPassHash,
        gender: 'MALE',
        role: 'STUDENT',
        department: 'Computer Science and Engineering',
        year: 3,
        join_year: '21',
        avatar_color: '#2563eb',
        profile_complete: true
      },
      {
        roll_number: '7376221CS202',
        name: 'Priya Patel',
        email: 'priyap.it21@bitsathy.ac.in',
        password_hash: studentPassHash,
        gender: 'FEMALE',
        role: 'STUDENT',
        department: 'Information Technology',
        year: 3,
        join_year: '21',
        avatar_color: '#db2777',
        profile_complete: true
      },
      {
        roll_number: '7376221EC105',
        name: 'Karthik Raja',
        email: 'karthikr.ec21@bitsathy.ac.in',
        password_hash: studentPassHash,
        gender: 'MALE',
        role: 'STUDENT',
        department: 'Electronics and Communication Engineering',
        year: 3,
        join_year: '21',
        avatar_color: '#7c3aed',
        profile_complete: true
      },
      {
        roll_number: '7376221EC208',
        name: 'Ananya Sundar',
        email: 'ananya.ec21@bitsathy.ac.in',
        password_hash: studentPassHash,
        gender: 'FEMALE',
        role: 'STUDENT',
        department: 'Electronics and Communication Engineering',
        year: 3,
        join_year: '21',
        avatar_color: '#059669',
        profile_complete: true
      }
    ]);
    student1 = insertedUsers[1];
    student2 = insertedUsers[2];
  } else {
    student1 = await User.findOne({ roll_number: '7376221CS101' });
    student2 = await User.findOne({ roll_number: '7376221CS202' });
  }

  // Ensure dedicated Librarian account exists
  const librarianExists = await User.findOne({ email: 'librarian@bitsathy.ac.in' });
  if (!librarianExists) {
    await User.create({
      roll_number: 'LIB-001',
      name: 'Dr. S. Ramanathan (Librarian)',
      email: 'librarian@bitsathy.ac.in',
      password_hash: '',
      gender: 'MALE',
      role: 'LIBRARIAN',
      department: 'Central Library Operations',
      year: 0,
      join_year: '',
      avatar_color: '#4338ca',
      profile_complete: true
    });
  }

  // 3. Seed 3 Floors
  const floorCount = await Floor.countDocuments();
  if (floorCount === 0) {
    await Floor.insertMany([
      {
        floor_number: 1,
        name: 'Ground Floor (Periodicals & Digital Library)',
        description: 'Lending circulation counter, reference stacks, discussion rooms 1 & 2.'
      },
      {
        floor_number: 2,
        name: 'First Floor (Engineering & Technology Core)',
        description: 'Computer Science, IT, Electronics, Mechanical and Electrical volumes.'
      },
      {
        floor_number: 3,
        name: 'Second Floor (Quiet Study & Research Stacks)',
        description: 'Mathematics, Physical Sciences, Humanities, Management and Journals.'
      }
    ]);
  }

  // 4. Seed Seating Layout for all 3 Floors (120 seats/floor matching hand-drawn diagram)
  const seatCount = await Seat.countDocuments();
  if (seatCount !== 360) {
    console.log(`Configuring seats (${seatCount} -> 360 seats, 120 per floor)...`);
    await Seat.deleteMany({});
    await SeatBooking.deleteMany({});

    const seats = [];
    for (let floor = 1; floor <= 3; floor++) {
      // --- BOYS WING (LEFT) ---
      // Column 1 & 2: 6 Rectangular Tables (3 rows x 2 columns, 8 seats each = 48 seats)
      let rectTableIndex = 1;
      for (let c = 1; c <= 2; c++) {
        for (let r = 1; r <= 3; r++) {
          const tableCode = `B-R${rectTableIndex}`;
          // 4 chairs on top
          for (let p = 1; p <= 4; p++) {
            seats.push({
              floor_number: floor,
              zone: 'BOYS',
              side: 'LEFT',
              color_theme: '#2563eb',
              seat_number: `F${floor}-B-R${rectTableIndex}-T${p}`,
              table_number: tableCode,
              table_type: 'RECTANGULAR_8',
              table_position: `TOP_${p}`,
              row_index: r,
              col_index: c,
              status: 'ACTIVE'
            });
          }
          // 4 chairs on bottom
          for (let p = 1; p <= 4; p++) {
            seats.push({
              floor_number: floor,
              zone: 'BOYS',
              side: 'LEFT',
              color_theme: '#2563eb',
              seat_number: `F${floor}-B-R${rectTableIndex}-B${p}`,
              table_number: tableCode,
              table_type: 'RECTANGULAR_8',
              table_position: `BOTTOM_${p}`,
              row_index: r,
              col_index: c,
              status: 'ACTIVE'
            });
          }
          rectTableIndex++;
        }
      }

      // Column 3: 3 Square Tables (near divider, 4 seats each = 12 seats)
      for (let r = 1; r <= 3; r++) {
        const tableCode = `B-SQ${r}`;
        const positions = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
        positions.forEach((pos, idx) => {
          seats.push({
            floor_number: floor,
            zone: 'BOYS',
            side: 'LEFT',
            color_theme: '#2563eb',
            seat_number: `F${floor}-B-SQ${r}-${pos[0]}${idx + 1}`,
            table_number: tableCode,
            table_type: 'SQUARE_4',
            table_position: pos,
            row_index: r,
            col_index: 3,
            status: 'ACTIVE'
          });
        });
      }

      // --- GIRLS WING (RIGHT) ---
      // Column 1: 3 Square Tables (near divider, 4 seats each = 12 seats)
      for (let r = 1; r <= 3; r++) {
        const tableCode = `G-SQ${r}`;
        const positions = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
        positions.forEach((pos, idx) => {
          seats.push({
            floor_number: floor,
            zone: 'GIRLS',
            side: 'RIGHT',
            color_theme: '#ec4899',
            seat_number: `F${floor}-G-SQ${r}-${pos[0]}${idx + 1}`,
            table_number: tableCode,
            table_type: 'SQUARE_4',
            table_position: pos,
            row_index: r,
            col_index: 1,
            status: 'ACTIVE'
          });
        });
      }

      // Column 2 & 3: 6 Rectangular Tables (3 rows x 2 columns, 8 seats each = 48 seats)
      let gRectTableIndex = 1;
      for (let c = 2; c <= 3; c++) {
        for (let r = 1; r <= 3; r++) {
          const tableCode = `G-R${gRectTableIndex}`;
          // 4 chairs on top
          for (let p = 1; p <= 4; p++) {
            seats.push({
              floor_number: floor,
              zone: 'GIRLS',
              side: 'RIGHT',
              color_theme: '#ec4899',
              seat_number: `F${floor}-G-R${gRectTableIndex}-T${p}`,
              table_number: tableCode,
              table_type: 'RECTANGULAR_8',
              table_position: `TOP_${p}`,
              row_index: r,
              col_index: c,
              status: 'ACTIVE'
            });
          }
          // 4 chairs on bottom
          for (let p = 1; p <= 4; p++) {
            seats.push({
              floor_number: floor,
              zone: 'GIRLS',
              side: 'RIGHT',
              color_theme: '#ec4899',
              seat_number: `F${floor}-G-R${gRectTableIndex}-B${p}`,
              table_number: tableCode,
              table_type: 'RECTANGULAR_8',
              table_position: `BOTTOM_${p}`,
              row_index: r,
              col_index: c,
              status: 'ACTIVE'
            });
          }
          gRectTableIndex++;
        }
      }
    }
    await Seat.insertMany(seats);
    console.log('Seeded 360 seats (120 per floor: 60 Boys + 60 Girls).');
  }

  // 5. Seed 4 Discussion Rooms
  const roomCount = await DiscussionRoom.countDocuments();
  if (roomCount === 0) {
    await DiscussionRoom.insertMany([
      {
        room_number: 1,
        name: 'Discussion Room 1 (Turing Hall)',
        capacity: 8,
        facilities: ['4K Presentation Display', 'Whiteboard', 'High-Speed LAN'],
        status: 'AVAILABLE'
      },
      {
        room_number: 2,
        name: 'Discussion Room 2 (Lovelace Syndicate)',
        capacity: 10,
        facilities: ['HD Conference Cam', 'Interactive Digital Whiteboard', 'Dual Monitors'],
        status: 'AVAILABLE'
      },
      {
        room_number: 3,
        name: 'Discussion Room 3 (Ramanujan Colloquium)',
        capacity: 12,
        facilities: ['Projector with Motorized Screen', 'Audio Mic Array', 'Glassboard'],
        status: 'AVAILABLE'
      },
      {
        room_number: 4,
        name: 'Discussion Room 4 (Kalam Ideation Lab)',
        capacity: 8,
        facilities: ['Acoustic Wall Panels', 'Magnetic Whiteboard', 'Conference Phone'],
        status: 'AVAILABLE'
      }
    ]);
  }

  // 6. Seed Books and Physical Copies
  const bookCount = await Book.countDocuments();
  if (bookCount === 0) {
    const sampleBooks = [
      {
        isbn: '978-0131103627',
        title: 'The C Programming Language',
        author: 'Brian W. Kernighan, Dennis M. Ritchie',
        category: 'Computer Science',
        publisher: 'Prentice Hall',
        publication_year: 1988,
        cover_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=60',
        description: 'The authoritative reference manual on C programming, concise and foundational.',
        copies: 4,
        shelf: 'CS-01-A'
      },
      {
        isbn: '978-0262033848',
        title: 'Introduction to Algorithms (CLRS)',
        author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
        category: 'Computer Science',
        publisher: 'MIT Press',
        publication_year: 2009,
        cover_image: 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?w=400&auto=format&fit=crop&q=60',
        description: 'Comprehensive textbook providing in-depth analysis of data structures and algorithms.',
        copies: 5,
        shelf: 'CS-02-B'
      },
      {
        isbn: '978-0132350884',
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        category: 'Software Engineering',
        publisher: 'Prentice Hall',
        publication_year: 2008,
        cover_image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop&q=60',
        description: 'Even bad code can function. But if code isn’t clean, it can bring a development organization to its knees.',
        copies: 3,
        shelf: 'SE-01-C'
      },
      {
        isbn: '978-0134685991',
        title: 'Effective Java (3rd Edition)',
        author: 'Joshua Bloch',
        category: 'Computer Science',
        publisher: 'Addison-Wesley',
        publication_year: 2018,
        cover_image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&auto=format&fit=crop&q=60',
        description: 'The definitive guide to best practices in the Java programming language.',
        copies: 3,
        shelf: 'CS-03-A'
      },
      {
        isbn: '978-0133594140',
        title: 'Computer Networks (5th Edition)',
        author: 'Andrew S. Tanenbaum, David J. Wetherall',
        category: 'Networking',
        publisher: 'Pearson',
        publication_year: 2011,
        cover_image: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&auto=format&fit=crop&q=60',
        description: 'Principles of modern computer networking from physical layers up to cloud applications.',
        copies: 4,
        shelf: 'NW-01-D'
      },
      {
        isbn: '978-0073380452',
        title: 'Digital Integrated Circuits: A Design Perspective',
        author: 'Jan M. Rabaey, Anantha Chandrakasan, Borivoje Nikolic',
        category: 'Electronics',
        publisher: 'Prentice Hall',
        publication_year: 2003,
        cover_image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=60',
        description: 'Classic textbook on VLSI design principles, timing, and power optimization.',
        copies: 3,
        shelf: 'EC-02-B'
      },
      {
        isbn: '978-0136019701',
        title: 'Artificial Intelligence: A Modern Approach',
        author: 'Stuart Russell, Peter Norvig',
        category: 'Artificial Intelligence',
        publisher: 'Pearson',
        publication_year: 2020,
        cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60',
        description: 'The leading text in AI theory, probabilistic reasoning, machine learning and robotics.',
        copies: 4,
        shelf: 'AI-01-A'
      },
      {
        isbn: '978-0070153073',
        title: 'Higher Engineering Mathematics',
        author: 'B.S. Grewal',
        category: 'Mathematics',
        publisher: 'Khanna Publishers',
        publication_year: 2017,
        cover_image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&auto=format&fit=crop&q=60',
        description: 'Standard collegiate reference text covering calculus, linear algebra, and transforms.',
        copies: 6,
        shelf: 'MA-01-A'
      }
    ];

    for (const b of sampleBooks) {
      const createdBook = await Book.create({
        isbn: b.isbn,
        title: b.title,
        author: b.author,
        category: b.category,
        publisher: b.publisher,
        publication_year: b.publication_year,
        cover_image: b.cover_image,
        description: b.description
      });

      const copies = [];
      for (let c = 1; c <= b.copies; c++) {
        copies.push({
          book: createdBook._id,
          barcode: `BIT-${b.category.substring(0, 2).toUpperCase()}-${createdBook._id.toString().slice(-4)}-${c.toString().padStart(2, '0')}`,
          shelf_location: `${b.shelf}-R${c}`,
          status: 'AVAILABLE'
        });
      }
      await BookCopy.insertMany(copies);
    }
  }

  // 7. Seed Initial Welcome Notifications
  const notifCount = await Notification.countDocuments();
  if (notifCount === 0 && student1 && student2) {
    await Notification.insertMany([
      {
        user: student1._id,
        title: 'Welcome to BIT Central Library',
        message: 'Your digital library account is active. You can reserve seats, borrow up to 3 books, and book discussion rooms for clubs.',
        type: 'SYSTEM'
      },
      {
        user: student2._id,
        title: 'Welcome to BIT Central Library',
        message: 'Explore 3 floors of silent study spaces and our extensive technical book catalogue.',
        type: 'SYSTEM'
      }
    ]);
  }

  console.log('MongoDB: BIT Central Library initialized and seeded successfully.');
}

module.exports = {
  connectDB
};
