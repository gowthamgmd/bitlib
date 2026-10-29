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
  Notification,
  DigitalResource
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
      name: 'Librarian',
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

  // 8. Seed Initial Digital Resources
  const drCount = await DigitalResource.countDocuments();
  if (drCount === 0) {
    const adminUser = await User.findOne({ role: 'ADMIN' });
    const adminId = adminUser ? adminUser._id : null;
    const initialResources = [
      {
        title: "Database System Concepts (7th Edition)",
        description: "Comprehensive authoritative university textbook on relational database systems, indexing, query optimization, transaction processing, and concurrency control.",
        author: "Abraham Silberschatz, Henry F. Korth, S. Sudarshan",
        publisher: "McGraw-Hill Education",
        category: "E-books and Textbooks",
        subject: "Database Management Systems",
        department: "Computer Science and Engineering",
        resource_type: "PDF",
        publication_year: 2020,
        cover_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "db_system_concepts_silberschatz.pdf",
          original_name: "db_system_concepts_silberschatz.pdf",
          mime_type: "application/pdf",
          file_size: 989,
          storage_path: "uploads/digital-resources/db_system_concepts_silberschatz.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["DBMS", "Textbook", "SQL", "Relational Database", "CS8492"],
        views_count: 512,
        downloads_count: 240,
        created_by: adminId
      },
      {
        title: "Computer Networking: A Top-Down Approach (8th Edition)",
        description: "Classic networking textbook explaining network protocols from the Application Layer down to Physical layer with internet architecture and wireless systems.",
        author: "James F. Kurose, Keith W. Ross",
        publisher: "Pearson",
        category: "E-books and Textbooks",
        subject: "Computer Networks",
        department: "Information Technology",
        resource_type: "PDF",
        publication_year: 2021,
        cover_image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "kurose_ross_computer_networking.pdf",
          original_name: "kurose_ross_computer_networking.pdf",
          mime_type: "application/pdf",
          file_size: 993,
          storage_path: "uploads/digital-resources/kurose_ross_computer_networking.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["Networking", "TCP/IP", "Sockets", "Protocols", "Textbook"],
        views_count: 388,
        downloads_count: 175,
        created_by: adminId
      },
      {
        title: "Deep Residual Learning for Image Recognition (ResNet Paper)",
        description: "Seminal CVPR research paper introducing deep residual neural networks (ResNet-50, ResNet-101) to solve the degradation problem in ultra-deep networks.",
        author: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
        publisher: "IEEE / CVPR",
        category: "Research Papers and Journals",
        subject: "Computer Vision & Deep Learning",
        department: "Artificial Intelligence & Data Science",
        resource_type: "JOURNAL",
        publication_year: 2016,
        cover_image: "https://images.unsplash.com/photo-1507146426996-ef0538821e1b?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "resnet_deep_residual_learning_he.pdf",
          original_name: "resnet_deep_residual_learning_he.pdf",
          mime_type: "application/pdf",
          file_size: 1001,
          storage_path: "uploads/digital-resources/resnet_deep_residual_learning_he.pdf"
        },
        external_url: "https://arxiv.org/abs/1512.03385",
        access_type: "OPEN_ACCESS",
        publication_status: "PUBLISHED",
        tags: ["ResNet", "Deep Learning", "CVPR", "Research", "Computer Vision"],
        views_count: 730,
        downloads_count: 420,
        created_by: adminId
      },
      {
        title: "Attention Is All You Need (Transformer Architecture)",
        description: "The foundational research paper introducing the Transformer neural network architecture based solely on self-attention mechanisms, powering GPT and modern LLMs.",
        author: "Ashish Vaswani, Noam Shazeer, Niki Parmar, et al.",
        publisher: "NeurIPS",
        category: "Research Papers and Journals",
        subject: "Natural Language Processing",
        department: "Computer Science and Engineering",
        resource_type: "JOURNAL",
        publication_year: 2017,
        cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400",
        external_url: "https://arxiv.org/abs/1706.03762",
        access_type: "OPEN_ACCESS",
        publication_status: "PUBLISHED",
        tags: ["Transformer", "Attention", "NeurIPS", "LLM", "NLP"],
        views_count: 1205,
        downloads_count: 0,
        created_by: adminId
      },
      {
        title: "CS8492 Database Management Systems - Autonomous End Sem Exam Nov/Dec 2024",
        description: "Official BITSathy autonomous end-semester examination question paper with solution outlines, schema diagrams, and SQL problem answers.",
        author: "Office of the Controller of Examinations",
        publisher: "BITSathy Academic Autonomous Division",
        category: "Previous-Year Question Papers",
        subject: "Database Management Systems",
        department: "Computer Science and Engineering",
        resource_type: "PDF",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "bitsathy_dbms_nov_dec_2024.pdf",
          original_name: "bitsathy_dbms_nov_dec_2024.pdf",
          mime_type: "application/pdf",
          file_size: 996,
          storage_path: "uploads/digital-resources/bitsathy_dbms_nov_dec_2024.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["Question Paper", "Autonomous Exam", "DBMS", "End Sem", "2024"],
        views_count: 642,
        downloads_count: 510,
        created_by: adminId
      },
      {
        title: "EC8553 Discrete-Time Signal Processing - Question Bank & Answer Key",
        description: "Compiled 5-year question bank with 2-mark solved questions and 13-mark derivation keys on FFT, IIR/FIR filter structures, and multirate DSP.",
        author: "Department of Electronics and Communication Engineering",
        publisher: "BITSathy Central Library Repository",
        category: "Previous-Year Question Papers",
        subject: "Digital Signal Processing",
        department: "Electronics and Communication Engineering",
        resource_type: "PDF",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "bitsathy_dsp_question_bank_2024.pdf",
          original_name: "bitsathy_dsp_question_bank_2024.pdf",
          mime_type: "application/pdf",
          file_size: 984,
          storage_path: "uploads/digital-resources/bitsathy_dsp_question_bank_2024.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["Question Paper", "DSP", "Question Bank", "ECE", "Signal Processing"],
        views_count: 420,
        downloads_count: 310,
        created_by: adminId
      },
      {
        title: "Design and Analysis of Algorithms: Complete Unit I to V Handouts",
        description: "Comprehensive faculty study material covering Asymptotic notations, Divide-and-Conquer, Dynamic Programming, Greedy choice, and NP-Completeness.",
        author: "Dr. K. S. Ramanujam, Department of CSE",
        publisher: "BITSathy Courseware Repository",
        category: "Lecture Notes and Study Materials",
        subject: "Algorithms",
        department: "Computer Science and Engineering",
        resource_type: "PDF",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "daa_complete_lecture_notes_bitsathy.pdf",
          original_name: "daa_complete_lecture_notes_bitsathy.pdf",
          mime_type: "application/pdf",
          file_size: 1001,
          storage_path: "uploads/digital-resources/daa_complete_lecture_notes_bitsathy.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["DAA", "Algorithms", "Lecture Notes", "Study Material", "Units 1-5"],
        views_count: 850,
        downloads_count: 615,
        created_by: adminId
      },
      {
        title: "Operating Systems: Concurrency, Virtual Memory & File Systems Notes",
        description: "Illustrated study packet covering Semaphores, Mutex locks, Deadlock handling algorithms, Page replacement policies, and Disk scheduling.",
        author: "Prof. N. Meenakshi Sundaram",
        publisher: "BITSathy Academic Press",
        category: "Lecture Notes and Study Materials",
        subject: "Operating Systems",
        department: "Information Technology",
        resource_type: "PDF",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "os_concurrency_paging_notes.pdf",
          original_name: "os_concurrency_paging_notes.pdf",
          mime_type: "application/pdf",
          file_size: 1004,
          storage_path: "uploads/digital-resources/os_concurrency_paging_notes.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["Operating Systems", "Concurrency", "Paging", "Deadlocks", "IT"],
        views_count: 672,
        downloads_count: 489,
        created_by: adminId
      },
      {
        title: "Data Structures and Algorithms Laboratory Manual (Regulation 2021)",
        description: "Official BITSathy laboratory syllabus with 14 verified programming exercises, test case suites, complexity analysis tables, and sample viva questions.",
        author: "Department of Information Technology & CSE",
        publisher: "BITSathy Autonomous Press",
        category: "Laboratory Manuals",
        subject: "Data Structures",
        department: "Information Technology",
        resource_type: "LAB_MANUAL",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "dsa_lab_manual_reg2021.pdf",
          original_name: "dsa_lab_manual_reg2021.pdf",
          mime_type: "application/pdf",
          file_size: 986,
          storage_path: "uploads/digital-resources/dsa_lab_manual_reg2021.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["Lab Manual", "DSA", "Data Structures", "Reg2021", "Practical"],
        views_count: 790,
        downloads_count: 530,
        created_by: adminId
      },
      {
        title: "Embedded Systems & IoT Laboratory Observation Guide",
        description: "Hands-on practical guide with circuit schematics for ARM Cortex-M microcontrollers, ESP32 Wi-Fi modules, sensor interfacing, and MQTT cloud telemetry.",
        author: "School of Electrical Sciences (ECE & EEE)",
        publisher: "BITSathy Innovations Lab",
        category: "Laboratory Manuals",
        subject: "Embedded Systems & IoT",
        department: "Electronics and Communication Engineering",
        resource_type: "LAB_MANUAL",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "embedded_iot_lab_guide.pdf",
          original_name: "embedded_iot_lab_guide.pdf",
          mime_type: "application/pdf",
          file_size: 989,
          storage_path: "uploads/digital-resources/embedded_iot_lab_guide.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["Lab Manual", "IoT", "Embedded", "ESP32", "ARM", "ECE"],
        views_count: 360,
        downloads_count: 215,
        created_by: adminId
      },
      {
        title: "Full-Stack Modern Web Engineering: React, Node.js, Express & MongoDB",
        description: "Comprehensive guide covering component lifecycle, state management, REST API architectures, JWT authorization, MongoDB indexing, and cloud deployment on Vercel/Render.",
        author: "Gowtham & Student Technical Guild",
        publisher: "BITSathy Open Source Community",
        category: "Programming and Technical Tutorials",
        subject: "Web Development",
        department: "Computer Science and Engineering",
        resource_type: "TUTORIAL",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "fullstack_react_node_mongodb_guide.pdf",
          original_name: "fullstack_react_node_mongodb_guide.pdf",
          mime_type: "application/pdf",
          file_size: 991,
          storage_path: "uploads/digital-resources/fullstack_react_node_mongodb_guide.pdf"
        },
        external_url: "https://developer.mozilla.org/en-US/docs/Learn",
        access_type: "OPEN_ACCESS",
        publication_status: "PUBLISHED",
        tags: ["React", "Node.js", "MongoDB", "Full-Stack", "JavaScript", "REST API"],
        views_count: 890,
        downloads_count: 670,
        created_by: adminId
      },
      {
        title: "PyTorch Deep Learning & Computer Vision Handbook",
        description: "Jupyter-style practical tutorial covering Tensors, Autograd, CNN architectures, transfer learning with torchvision, and model deployment.",
        author: "AI Research Group, BITSathy",
        publisher: "BITSathy Centre of Excellence",
        category: "Programming and Technical Tutorials",
        subject: "Machine Learning",
        department: "Artificial Intelligence & Data Science",
        resource_type: "TUTORIAL",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=400",
        external_url: "https://pytorch.org/tutorials/",
        access_type: "OPEN_ACCESS",
        publication_status: "PUBLISHED",
        tags: ["PyTorch", "Python", "Deep Learning", "Computer Vision", "Tensors"],
        views_count: 640,
        downloads_count: 380,
        created_by: adminId
      },
      {
        title: "NPTEL: Cloud Computing by Prof. Soumya Kanti Ghosh (IIT Kharagpur)",
        description: "12-week national online course covering Cloud virtualization architectures, Service models (IaaS, PaaS, SaaS), Resource management, SLA, and OpenStack deployment.",
        author: "Prof. Soumya Kanti Ghosh, Department of CSE, IIT Kharagpur",
        publisher: "NPTEL / SWAYAM - Ministry of Education, Govt of India",
        category: "Online Courses and Educational Videos",
        subject: "Cloud Computing & Distributed Systems",
        department: "Computer Science and Engineering",
        resource_type: "VIDEO",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400",
        external_url: "https://nptel.ac.in/courses/106105167",
        access_type: "OPEN_ACCESS",
        publication_status: "PUBLISHED",
        tags: ["NPTEL", "Cloud Computing", "IIT Kharagpur", "SWAYAM", "Online Course"],
        views_count: 720,
        downloads_count: 0,
        created_by: adminId
      },
      {
        title: "MIT OpenCourseWare 6.006: Introduction to Algorithms",
        description: "World-renowned video lectures on Algorithmic Thinking, Peak Finding, Sorting & Trees, Hashing, Numerics, Graphs, Shortest Paths, and Dynamic Programming.",
        author: "Prof. Erik Demaine & Prof. Srini Devadas",
        publisher: "Massachusetts Institute of Technology (MIT OCW)",
        category: "Online Courses and Educational Videos",
        subject: "Data Structures and Algorithms",
        department: "Computer Science and Engineering",
        resource_type: "VIDEO",
        publication_year: 2021,
        cover_image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=400",
        external_url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/",
        access_type: "OPEN_ACCESS",
        publication_status: "PUBLISHED",
        tags: ["MIT", "Algorithms", "Video Lectures", "Erik Demaine", "Free Education"],
        views_count: 940,
        downloads_count: 0,
        created_by: adminId
      },
      {
        title: "GATE CS & IT: 15-Year Solved Papers & Chapter-wise Analysis",
        description: "Carefully indexed previous 15 years GATE Computer Science question papers with detailed step-by-step explanations, shortcut formulas, and topic weightage breakdown.",
        author: "BITSathy GATE Training Cell",
        publisher: "Central Library Competitive Exam Section",
        category: "Other Academic Resources",
        subject: "GATE Preparation",
        department: "All Departments",
        resource_type: "PDF",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "gate_cs_it_15_year_solved_papers.pdf",
          original_name: "gate_cs_it_15_year_solved_papers.pdf",
          mime_type: "application/pdf",
          file_size: 985,
          storage_path: "uploads/digital-resources/gate_cs_it_15_year_solved_papers.pdf"
        },
        access_type: "INSTITUTIONAL",
        publication_status: "PUBLISHED",
        tags: ["GATE", "Competitive Exam", "Solved Papers", "Higher Studies", "CS/IT"],
        views_count: 810,
        downloads_count: 592,
        created_by: adminId
      },
      {
        title: "BITSathy Standard LaTeX Template for Final Year B.E. / B.Tech Project Reports",
        description: "Official IEEE/BITSathy compliant LaTeX template and formatting guide with predefined title pages, certificate layouts, bibliography styles, and figure alignment guides.",
        author: "Dean Academic Quality Assurance",
        publisher: "BITSathy Academic Publications",
        category: "Other Academic Resources",
        subject: "Academic Writing & Thesis",
        department: "All Departments",
        resource_type: "PDF",
        publication_year: 2024,
        cover_image: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=400",
        file_reference: {
          filename: "bitsathy_latex_project_template_guide.pdf",
          original_name: "bitsathy_latex_project_template_guide.pdf",
          mime_type: "application/pdf",
          file_size: 999,
          storage_path: "uploads/digital-resources/bitsathy_latex_project_template_guide.pdf"
        },
        access_type: "OPEN_ACCESS",
        publication_status: "PUBLISHED",
        tags: ["LaTeX", "Project Report", "Thesis", "S7/S8 Project", "Template", "BITSathy"],
        views_count: 950,
        downloads_count: 821,
        created_by: adminId
      }
    ];
    await DigitalResource.insertMany(initialResources);
    console.log('MongoDB: Seeded 16 digital resources across all 8 academic categories.');
  }

  console.log('MongoDB: BIT Central Library initialized and seeded successfully.');
}

module.exports = {
  connectDB
};
