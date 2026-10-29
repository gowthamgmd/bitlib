import React, { useState, useEffect } from 'react';
import {
  Armchair,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  LogOut,
  ShieldCheck,
  Building2,
  Search,
  Bookmark,
  RotateCcw,
  Users,
  Presentation,
  Check,
  Ban,
  MessageSquare,
  LayoutDashboard,
  Bell,
  QrCode,
  FileText,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import LibrarianPortal from './components/LibrarianPortal';

export default function App() {
  // Navigation Tabs: 'SEATS' | 'BOOKS' | 'ROOMS' | 'DASHBOARD'
  const [activeTab, setActiveTab] = useState('SEATS');

  // Portal Mode: 'STUDENT' | 'LIBRARIAN'
  const [portalMode, setPortalMode] = useState('STUDENT');

  // Authentication State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bitlib_token') || null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  // Profile completion modal (shown after first login if profile not complete)
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupForm, setProfileSetupForm] = useState({ roll_number: '', gender: 'MALE', department: 'Information Technology', year: 3, phone: '' });
  const [profileSetupError, setProfileSetupError] = useState('');

  // Profile view/edit modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({ name: '', department: '', year: 1, phone: '', bio: '' });
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Toast Action Message
  const [actionMessage, setActionMessage] = useState(null);

  // Common Filters
  const [floors, setFloors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedSession, setSelectedSession] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // ==========================================
  // SEAT BOOKING STATES
  // ==========================================
  const [layoutData, setLayoutData] = useState(null);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [selectedSeatToBook, setSelectedSeatToBook] = useState(null);
  const [activeReservationPass, setActiveReservationPass] = useState(null);

  // ==========================================
  // BOOK LENDING & CATALOGUE STATES
  // ==========================================
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBookToBorrow, setSelectedBookToBorrow] = useState(null);
  const [myLoans, setMyLoans] = useState([]);
  const [loansStats, setLoansStats] = useState({ active_loans_count: 0, max_borrow_limit: 3, total_fines: 0 });

  // ==========================================
  // DISCUSSION ROOMS STATES
  // ==========================================
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomToBook, setSelectedRoomToBook] = useState(null);
  const [roomBookingForm, setRoomBookingForm] = useState({
    club_name: 'Google Developer Student Club (GDSC)',
    purpose: 'Quarterly Hackathon Mentorship Sync',
    attendees_count: 6
  });
  const [myRoomBookings, setMyRoomBookings] = useState([]);
  const [adminRoomRequests, setAdminRoomRequests] = useState([]);
  const [showAdminApprovalModal, setShowAdminApprovalModal] = useState(false);

  // ==========================================
  // STUDENT DASHBOARD AGGREGATED STATE
  // ==========================================
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // 1. Fetch authenticated user profile
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            if (data.user.role === 'LIBRARIAN' || data.user.role === 'ADMIN') {
              setPortalMode('LIBRARIAN');
            }
            if (data.token && data.token !== token) {
              localStorage.setItem('bitlib_token', data.token);
              setToken(data.token);
            }
          } else {
            handleLogout();
          }
        })
        .catch(() => handleLogout());
    }
  }, [token]);

  // 2. Fetch Initial Common Data
  useEffect(() => {
    fetch('/api/seats/floors')
      .then(res => res.json())
      .then(data => {
        if (data.floors) setFloors(data.floors);
      });

    fetch('/api/seats/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.sessions) setSessions(data.sessions);
      });

    fetch('/api/books/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) setCategories(['ALL', ...data.categories]);
      });
  }, []);

  // Fetch Google Client ID from backend on mount
  useEffect(() => {
    fetch('/api/auth/google/client-id')
      .then(res => res.json())
      .then(data => {
        if (data.clientId) {
          setGoogleClientId(data.clientId);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize Google Identity Services when auth modal opens
  useEffect(() => {
    if (!showAuthModal || !googleClientId) return;

    const setupGoogleId = () => {
      if (!window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response?.credential) {
              handleGoogleSignIn(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          // Restrict to BITSathy Google Workspace domain
          hosted_domain: 'bitsathy.ac.in',
        });

        // Render the official Google Sign-In button
        const btnContainer = document.getElementById('google-signin-button');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          window.google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 380,
          });
        }
      } catch (err) {
        console.warn('Google Identity Services init error:', err);
      }
    };

    // GIS script may not have loaded yet
    if (window.google?.accounts?.id) {
      setupGoogleId();
    } else {
      const timer = setTimeout(setupGoogleId, 600);
      return () => clearTimeout(timer);
    }
  }, [showAuthModal, googleClientId]);

  // 3. Tab-based Data Loading
  useEffect(() => {
    if (activeTab === 'SEATS') {
      loadSeatLayout();
    } else if (activeTab === 'BOOKS') {
      loadBooks();
    } else if (activeTab === 'ROOMS') {
      loadRooms();
    } else if (activeTab === 'DASHBOARD') {
      loadStudentDashboard();
    }
  }, [selectedFloor, selectedSession, selectedDate, user, activeTab, searchQuery, selectedCategory, availableOnly]);

  // 4. Load User Activity
  useEffect(() => {
    if (user && token) {
      loadMyLoans();
      loadMyRoomBookings();
      if (user.role === 'ADMIN') {
        loadAdminRoomRequests();
      }
    }
  }, [user, token]);

  const loadSeatLayout = () => {
    setLoadingLayout(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/seats/layout?floor_number=${selectedFloor}&session_number=${selectedSession}&date=${selectedDate}`, {
      headers
    })
      .then(res => res.json())
      .then(data => {
        setLayoutData(data);
        setLoadingLayout(false);
      })
      .catch(err => {
        console.error('Failed to load layout:', err);
        setLoadingLayout(false);
      });
  };

  const loadBooks = () => {
    setLoadingBooks(true);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (selectedCategory && selectedCategory !== 'ALL') params.append('category', selectedCategory);
    if (availableOnly) params.append('available_only', 'true');

    fetch(`/api/books?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.books) setBooks(data.books);
        setLoadingBooks(false);
      })
      .catch(err => {
        console.error('Failed to fetch books:', err);
        setLoadingBooks(false);
      });
  };

  const loadRooms = () => {
    setLoadingRooms(true);
    fetch(`/api/rooms?date=${selectedDate}&session_number=${selectedSession}`)
      .then(res => res.json())
      .then(data => {
        if (data.rooms) setRooms(data.rooms);
        setLoadingRooms(false);
      })
      .catch(err => {
        console.error('Failed to load rooms:', err);
        setLoadingRooms(false);
      });
  };

  const loadMyLoans = () => {
    if (!token) return;
    fetch('/api/books/my/loans', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.loans) {
          setMyLoans(data.loans);
          setLoansStats({
            active_loans_count: data.active_loans_count,
            max_borrow_limit: data.max_borrow_limit,
            total_fines: data.total_fines
          });
        }
      });
  };

  const loadMyRoomBookings = () => {
    if (!token) return;
    fetch('/api/rooms/my/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.bookings) setMyRoomBookings(data.bookings);
      });
  };

  const loadAdminRoomRequests = () => {
    if (!token) return;
    fetch('/api/rooms/admin/requests', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.requests) setAdminRoomRequests(data.requests);
      });
  };

  const loadStudentDashboard = () => {
    if (!token) return;
    setLoadingDashboard(true);
    fetch('/api/student/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
        setLoadingDashboard(false);
      })
      .catch(err => {
        console.error('Failed to load dashboard:', err);
        setLoadingDashboard(false);
      });
  };

  // Google Sign-In handler (GIS ID Token or Institutional Email)
  const handleGoogleSignIn = async (credentialOrEmail, optionalName) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      let body;
      if (typeof credentialOrEmail === 'object' && credentialOrEmail !== null && credentialOrEmail.credential) {
        body = { credential: credentialOrEmail.credential };
      } else if (typeof credentialOrEmail === 'string') {
        if (credentialOrEmail.startsWith('ey')) {
          body = { credential: credentialOrEmail };
        } else {
          body = { email: credentialOrEmail, name: optionalName || '' };
        }
      } else {
        body = { email: 'gowthamg.it23@bitsathy.ac.in', name: 'Gowtham G' };
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed. Please ensure you are using an authorized @bitsathy.ac.in account.');
        setAuthLoading(false);
        return;
      }
      localStorage.setItem('bitlib_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);

      if (data.user.role === 'LIBRARIAN' || data.user.role === 'ADMIN') {
        setPortalMode('LIBRARIAN');
        showMessage('success', `Welcome to Librarian Operations Portal, ${data.user.name}! 📚`);
      } else if (data.requiresProfileSetup || !data.user.profile_complete || data.user.roll_number?.startsWith('BIT-')) {
        setProfileSetupForm({
          roll_number: data.user.roll_number?.startsWith('BIT-') ? '' : (data.user.roll_number || ''),
          gender: data.user.gender || 'MALE',
          department: data.user.department || 'Information Technology',
          year: data.user.year || 3,
          phone: data.user.phone || ''
        });
        setShowProfileSetup(true);
      } else {
        showMessage('success', `Welcome back, ${data.user.name}! 📚`);
      }
    } catch {
      setAuthError('Connection error to server during authentication.');
    }
    setAuthLoading(false);
  };

  const resetAuthModal = () => {
    setAuthError('');
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('bitlib_token');
    setToken(null);
    setUser(null);
    setMyLoans([]);
    setMyRoomBookings([]);
    setAdminRoomRequests([]);
    setDashboardData(null);
    setPortalMode('STUDENT');
    showMessage('info', 'Logged out successfully.');
  };

  // Profile Setup (first login)
  const handleProfileSetup = async (e) => {
    e.preventDefault();
    setProfileSetupError('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileSetupForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileSetupError(data.error || 'Failed to save profile.');
        return;
      }
      if (data.token) {
        localStorage.setItem('bitlib_token', data.token);
        setToken(data.token);
      }
      setUser(data.user);
      setShowProfileSetup(false);
      showMessage('success', 'Profile completed! Welcome to BIT Library 🎉');
    } catch {
      setProfileSetupError('Connection error.');
    }
  };

  // Profile Update (edit profile)
  const handleProfileUpdate = async () => {
    setProfileSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileEditForm)
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to update profile.');
        setProfileSaving(false);
        return;
      }
      if (data.token) {
        localStorage.setItem('bitlib_token', data.token);
        setToken(data.token);
      }
      setUser(data.user);
      setProfileEditMode(false);
      showMessage('success', 'Profile updated successfully!');
    } catch {
      showMessage('error', 'Connection error.');
    }
    setProfileSaving(false);
  };

  const openProfileModal = () => {
    setProfileEditForm({
      name: user?.name || '',
      department: user?.department || '',
      year: user?.year || 1,
      phone: user?.phone || '',
      bio: user?.bio || ''
    });
    setProfileEditMode(false);
    setShowProfileModal(true);
  };

  // Seat Click & Reserve
  const handleSeatClick = (seat) => {
    if (!user) {
      setShowAuthModal(true);
      showMessage('warning', 'Please sign in to reserve a seat.');
      return;
    }
    if (seat.state === 'MINE') {
      setActiveReservationPass(seat);
      return;
    }
    if (seat.state === 'BOOKED') {
      showMessage('error', `Seat ${seat.seat_number} is already booked.`);
      return;
    }
    if (user.gender === 'MALE' && seat.zone !== 'BOYS') {
      showMessage('error', 'Boys can only reserve seats in the designated Male (Left) Zone.');
      return;
    }
    if (user.gender === 'FEMALE' && seat.zone !== 'GIRLS') {
      showMessage('error', 'Girls can only reserve seats in the designated Female (Right) Zone.');
      return;
    }
    setSelectedSeatToBook(seat);
  };

  const confirmReservation = async () => {
    if (!selectedSeatToBook || !user) return;

    try {
      const res = await fetch('/api/seats/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          seat_id: selectedSeatToBook._id,
          booking_date: selectedDate,
          session_number: selectedSession
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Reservation failed.');
        return;
      }

      showMessage('success', `Seat ${selectedSeatToBook.seat_number} confirmed!`);
      setSelectedSeatToBook(null);
      loadSeatLayout();
      if (activeTab === 'DASHBOARD') loadStudentDashboard();
    } catch (err) {
      showMessage('error', 'Server error while reserving.');
    }
  };

  const cancelReservation = async (bookingId) => {
    if (!bookingId) return;
    try {
      const res = await fetch(`/api/seats/cancel/${bookingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to cancel.');
        return;
      }
      showMessage('success', 'Seat reservation released.');
      setActiveReservationPass(null);
      loadSeatLayout();
      if (activeTab === 'DASHBOARD') loadStudentDashboard();
    } catch (err) {
      showMessage('error', 'Connection error.');
    }
  };

  // Book Lending Actions
  const handleBorrowClick = (book) => {
    if (!user) {
      setShowAuthModal(true);
      showMessage('warning', 'Please sign in to borrow books.');
      return;
    }
    if (book.available_copies <= 0) {
      showMessage('error', 'No copies currently available on shelf.');
      return;
    }
    if (loansStats.active_loans_count >= loansStats.max_borrow_limit) {
      showMessage('error', `Borrowing limit reached (${loansStats.max_borrow_limit} books). Return an existing book first.`);
      return;
    }
    setSelectedBookToBorrow(book);
  };

  const confirmBorrowBook = async () => {
    if (!selectedBookToBorrow || !token) return;
    try {
      const res = await fetch('/api/books/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ book_id: selectedBookToBorrow._id })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to borrow book.');
        return;
      }
      showMessage('success', `"${selectedBookToBorrow.title}" borrowed successfully! Due in 14 days.`);
      setSelectedBookToBorrow(null);
      loadBooks();
      loadMyLoans();
      if (activeTab === 'DASHBOARD') loadStudentDashboard();
    } catch (err) {
      showMessage('error', 'Server error during borrow.');
    }
  };

  const returnBook = async (loanId) => {
    if (!loanId || !token) return;
    try {
      const res = await fetch('/api/books/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ loan_id: loanId })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to return book.');
        return;
      }
      const fineText = data.fine_amount > 0 ? ` Overdue fine: ₹${data.fine_amount}` : '';
      showMessage('success', `Book returned successfully!${fineText}`);
      loadBooks();
      loadMyLoans();
      if (activeTab === 'DASHBOARD') loadStudentDashboard();
    } catch (err) {
      showMessage('error', 'Connection error.');
    }
  };

  // Discussion Room Actions
  const handleRoomClick = (room) => {
    if (!user) {
      setShowAuthModal(true);
      showMessage('warning', 'Please sign in to book a discussion room.');
      return;
    }
    if (room.slot_status === 'APPROVED') {
      showMessage('error', `This room is already reserved by ${room.booking?.club_name || 'another club'} for this session.`);
      return;
    }
    setSelectedRoomToBook(room);
  };

  const submitRoomRequest = async (e) => {
    e.preventDefault();
    if (!selectedRoomToBook || !token) return;

    try {
      const res = await fetch('/api/rooms/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          room_id: selectedRoomToBook._id,
          booking_date: selectedDate,
          session_number: selectedSession,
          club_name: roomBookingForm.club_name,
          purpose: roomBookingForm.purpose,
          attendees_count: roomBookingForm.attendees_count
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to submit room request.');
        return;
      }

      showMessage('success', data.message);
      setSelectedRoomToBook(null);
      loadRooms();
      loadMyRoomBookings();
      if (user.role === 'ADMIN') loadAdminRoomRequests();
      if (activeTab === 'DASHBOARD') loadStudentDashboard();
    } catch (err) {
      showMessage('error', 'Server error while submitting request.');
    }
  };

  const cancelRoomBooking = async (bookingId) => {
    if (!bookingId || !token) return;
    try {
      const res = await fetch(`/api/rooms/cancel/${bookingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to cancel.');
        return;
      }
      showMessage('success', 'Discussion room booking cancelled.');
      loadMyRoomBookings();
      if (activeTab === 'DASHBOARD') loadStudentDashboard();
    } catch (err) {
      showMessage('error', 'Connection error.');
    }
  };

  const markAllNotifsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/student/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      loadStudentDashboard();
      showMessage('success', 'All notifications marked as read.');
    } catch (err) {
      showMessage('error', 'Failed to update notifications.');
    }
  };

  const showMessage = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  // Helper: Render chair square
  const renderChair = (seat) => {
    if (!seat) return <div style={{ width: 28, height: 28 }} />;
    const isRestricted = (user?.gender === 'MALE' && seat.zone === 'GIRLS') || (user?.gender === 'FEMALE' && seat.zone === 'BOYS');

    return (
      <button
        key={seat._id}
        className={`chair-box ${seat.state.toLowerCase()} ${isRestricted ? 'restricted' : ''}`}
        onClick={() => handleSeatClick(seat)}
        title={
          isRestricted
            ? `Restricted: ${seat.zone === 'BOYS' ? 'Boys Zone' : 'Girls Zone'}`
            : seat.state === 'MINE'
            ? 'Your Seat (Click for pass)'
            : seat.state === 'BOOKED'
            ? `Occupied (${seat.booked_by || 'Student'})`
            : `Seat ${seat.seat_number} - Click to Reserve`
        }
      >
        {seat.state === 'MINE' ? '✓' : seat.state === 'BOOKED' ? '✕' : ''}
      </button>
    );
  };

  const renderRectangularTable = (table) => {
    const topChairs = table.seats.filter(s => s.table_position.startsWith('TOP_')).sort((a, b) => a.table_position.localeCompare(b.table_position));
    const bottomChairs = table.seats.filter(s => s.table_position.startsWith('BOTTOM_')).sort((a, b) => a.table_position.localeCompare(b.table_position));

    return (
      <div key={table.table_number} className="rect-table-group">
        <div className="chairs-row">
          {topChairs.map(seat => renderChair(seat))}
        </div>
        <div className="rect-desk-surface">
          <span className="desk-label">{table.table_number}</span>
        </div>
        <div className="chairs-row">
          {bottomChairs.map(seat => renderChair(seat))}
        </div>
      </div>
    );
  };

  const renderSquareTable = (table) => {
    const topChair = table.seats.find(s => s.table_position === 'TOP');
    const bottomChair = table.seats.find(s => s.table_position === 'BOTTOM');
    const leftChair = table.seats.find(s => s.table_position === 'LEFT');
    const rightChair = table.seats.find(s => s.table_position === 'RIGHT');

    return (
      <div key={table.table_number} className="square-table-group">
        {renderChair(topChair)}
        <div className="square-middle-row">
          {renderChair(leftChair)}
          <div className="square-desk-surface">
            <span className="desk-label">{table.table_number}</span>
          </div>
          {renderChair(rightChair)}
        </div>
        {renderChair(bottomChair)}
      </div>
    );
  };

  // Render dedicated Librarian Management Portal if staff member selected portal mode
  if (portalMode === 'LIBRARIAN' && user && (user.role === 'LIBRARIAN' || user.role === 'ADMIN')) {
    return (
      <div className="app-root">
        {actionMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            background: actionMessage.type === 'error' ? '#ef4444' : actionMessage.type === 'warning' ? '#f59e0b' : '#10b981',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-elevated)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.88rem',
            fontWeight: '600'
          }}>
            {actionMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem' }}>
              <X size={15} />
            </button>
          </div>
        )}
        <LibrarianPortal
          user={user}
          token={token}
          onSwitchToStudentView={() => setPortalMode('STUDENT')}
          onLogout={handleLogout}
          showMessage={showMessage}
        />
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Toast Alert */}
      {actionMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 999,
          background: actionMessage.type === 'error' ? '#ef4444' : actionMessage.type === 'warning' ? '#f59e0b' : '#10b981',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem',
          fontWeight: '600'
        }}>
          {actionMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Clean Light Navbar */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-badge">
            <div className="brand-icon-box">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="brand-title">BIT Central Library</h1>
              <p className="brand-subtitle">Smart Seating & Resource Management</p>
            </div>
          </div>

          <nav className="nav-pills">
            <button
              className={`nav-pill-btn ${activeTab === 'SEATS' ? 'active' : ''}`}
              onClick={() => setActiveTab('SEATS')}
            >
              <Armchair size={15} />
              <span>Seat Booking</span>
            </button>
            <button
              className={`nav-pill-btn ${activeTab === 'BOOKS' ? 'active' : ''}`}
              onClick={() => setActiveTab('BOOKS')}
            >
              <BookOpen size={15} />
              <span>Book Lending</span>
            </button>
            <button
              className={`nav-pill-btn ${activeTab === 'ROOMS' ? 'active' : ''}`}
              onClick={() => setActiveTab('ROOMS')}
            >
              <Presentation size={15} />
              <span>Discussion Rooms</span>
            </button>
            <button
              className={`nav-pill-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                  showMessage('warning', 'Please sign in to view your student dashboard.');
                } else {
                  setActiveTab('DASHBOARD');
                }
              }}
            >
              <LayoutDashboard size={15} />
              <span>Student Dashboard</span>
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user && (user.role === 'LIBRARIAN' || user.role === 'ADMIN') && (
              <button
                onClick={() => setPortalMode('LIBRARIAN')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                }}
                title="Open Administrative Librarian Operations Portal"
              >
                <ShieldCheck size={15} />
                <span>Librarian Portal</span>
              </button>
            )}

            {user ? (
              <div className="user-badge" onClick={openProfileModal} style={{ cursor: 'pointer' }} title="View Profile">
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: user.avatar_color || (user.gender === 'MALE' ? 'var(--male-blue)' : 'var(--female-pink)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
                }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {user.role === 'ADMIN' ? 'Chief Librarian' : user.role === 'LIBRARIAN' ? 'Librarian (Staff)' : `${user.department?.split(' ').slice(0,2).join(' ')} • Yr ${user.year}`}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  title="Sign out"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '4px', padding: '4px' }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button className="btn-primary" style={{ width: 'auto', padding: '0.45rem 1rem' }} onClick={() => { resetAuthModal(); setShowAuthModal(true); }}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* ============================================================== */}
        {/* TAB 1: SEAT BOOKING VIEW (Hand-Drawn Sketch Layout)            */}
        {/* ============================================================== */}
        {activeTab === 'SEATS' && (
          <div>
            <div className="page-hero">
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  Floor Map & Seat Reservation
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Interactive floor plan. Left side is designated for <strong>Boys (Blue)</strong>, Right side for <strong>Girls (Pink)</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="seats-remaining-box">
                  <span>Seats remaining</span>
                  <span className="seats-remaining-badge">[ {layoutData ? layoutData.stats.available : 120} ]</span>
                </div>
              </div>
            </div>

            {/* Controls Panel */}
            <section className="light-card controls-panel">
              <div className="control-row">
                <span className="control-label">
                  <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Floor:
                </span>
                <div className="pills-group">
                  {floors.map(floor => (
                    <button
                      key={floor.floor_number}
                      className={`pill-button ${selectedFloor === floor.floor_number ? 'active' : ''}`}
                      onClick={() => setSelectedFloor(floor.floor_number)}
                    >
                      <span>Floor {floor.floor_number}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-row">
                <span className="control-label">
                  <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Slot:
                </span>
                <div className="pills-group">
                  {sessions.map(s => (
                    <button
                      key={s.session_number}
                      className={`pill-button ${selectedSession === s.session_number ? 'active' : ''}`}
                      onClick={() => setSelectedSession(s.session_number)}
                    >
                      <span>Session {s.session_number}</span>
                      <span className="session-time">{s.start_time} - {s.end_time}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-row">
                <span className="control-label">
                  <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Date:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  >
                    Today
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => {
                      const tmrw = new Date();
                      tmrw.setDate(tmrw.getDate() + 1);
                      setSelectedDate(tmrw.toISOString().split('T')[0]);
                    }}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </section>

            {/* Floor Map Canvas */}
            <section className="floormap-canvas">
              {loadingLayout ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading Floor Layout...
                </div>
              ) : layoutData ? (
                <div>
                  <div className="floor-zones-wrapper">
                    {/* MALE / BOYS (Left) */}
                    <div className="male-zone">
                      <div className="zone-header-box">
                        <h3 className="zone-title">Seat reservation — male</h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--male-blue)', background: 'var(--male-blue-bg)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                          Blue Theme (60 Seats)
                        </span>
                      </div>

                      <div className="tables-columns-container">
                        <div className="table-column">
                          {layoutData.layout.left_wing.tables
                            .filter(t => t.col_index === 1)
                            .map(t => renderRectangularTable(t))}
                        </div>
                        <div className="table-column">
                          {layoutData.layout.left_wing.tables
                            .filter(t => t.col_index === 2)
                            .map(t => renderRectangularTable(t))}
                        </div>
                        <div className="table-column">
                          {layoutData.layout.left_wing.tables
                            .filter(t => t.col_index === 3)
                            .map(t => renderSquareTable(t))}
                        </div>
                      </div>
                    </div>

                    {/* CENTRAL DIVIDER */}
                    <div className="center-divider-column">
                      <div className="center-vertical-line" />
                      <span className="divider-marker">DIVIDER</span>
                      <div className="center-vertical-line" />
                    </div>

                    {/* FEMALE / GIRLS (Right) */}
                    <div className="female-zone">
                      <div className="zone-header-box">
                        <h3 className="zone-title">Seat reservation — female</h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--female-pink)', background: 'var(--female-pink-bg)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                          Pink Theme (60 Seats)
                        </span>
                      </div>

                      <div className="tables-columns-container">
                        <div className="table-column">
                          {layoutData.layout.right_wing.tables
                            .filter(t => t.col_index === 1)
                            .map(t => renderSquareTable(t))}
                        </div>
                        <div className="table-column">
                          {layoutData.layout.right_wing.tables
                            .filter(t => t.col_index === 2)
                            .map(t => renderRectangularTable(t))}
                        </div>
                        <div className="table-column">
                          {layoutData.layout.right_wing.tables
                            .filter(t => t.col_index === 3)
                            .map(t => renderRectangularTable(t))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM LEGEND */}
                  <div className="sketch-legend-bar">
                    <div className="legend-pill-sketch">
                      <div style={{ width: 28, height: 16, background: '#f8fafc', border: '1.5px solid #94a3b8', borderRadius: 2 }} />
                      <span>Desk</span>
                    </div>
                    <div className="legend-pill-sketch">
                      <div style={{ width: 16, height: 16, background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 2 }} />
                      <span>Available</span>
                    </div>
                    <div className="legend-pill-sketch">
                      <div className="legend-sketch-circle" style={{ background: '#e2e8f0', color: '#64748b' }}>
                        ✕
                      </div>
                      <span>Booked</span>
                    </div>
                    <div className="legend-pill-sketch">
                      <div className="legend-sketch-circle" style={{ background: '#10b981', color: '#ffffff', borderColor: '#059669' }}>
                        ✓
                      </div>
                      <span>You (Reserved)</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BOOK LENDING & CATALOGUE                                */}
        {/* ============================================================== */}
        {activeTab === 'BOOKS' && (
          <div>
            <div className="page-hero">
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  Book Lending & Central Catalogue
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Search physical library volumes across engineering, sciences, and technology. Standard loan period is 14 days.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {user ? (
                  <button
                    onClick={() => setActiveTab('DASHBOARD')}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#ffffff',
                      border: '1.5px solid #0f172a',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <Bookmark size={16} />
                    <span style={{ fontWeight: 700 }}>My Borrowed Books</span>
                    <span style={{
                      background: loansStats.active_loans_count >= 3 ? '#ef4444' : '#0f172a',
                      color: '#fff',
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: 800
                    }}>
                      {loansStats.active_loans_count} / {loansStats.max_borrow_limit}
                    </span>
                  </button>
                ) : (
                  <button className="btn-primary" style={{ width: 'auto' }} onClick={() => setShowAuthModal(true)}>
                    Sign In to Borrow Books
                  </button>
                )}
              </div>
            </div>

            {/* Books Toolbar */}
            <div className="books-top-toolbar">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon-inside" />
                <input
                  type="text"
                  className="search-input-field"
                  placeholder="Search by Title, Author, ISBN, or Keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Show Available Only</span>
                </label>
              </div>
            </div>

            {/* Category Chips */}
            <div className="category-chips-row">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'ALL' ? 'All Disciplines' : cat}
                </button>
              ))}
            </div>

            {/* Books Grid */}
            {loadingBooks ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading Book Catalogue...
              </div>
            ) : books.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No books found matching your search.
              </div>
            ) : (
              <div className="books-grid">
                {books.map(book => {
                  const isAvailable = book.available_copies > 0;
                  return (
                    <div key={book._id} className="book-card">
                      <div>
                        <div className="book-card-top">
                          <div className="book-thumb-box">
                            <img src={book.cover_image} alt={book.title} className="book-thumb-img" />
                          </div>
                          <div className="book-info-col">
                            <div>
                              <span className="book-category-pill">{book.category}</span>
                              <h4 className="book-title-heading" title={book.title}>{book.title}</h4>
                              <p className="book-author-text">{book.author}</p>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              ISBN: {book.isbn} • {book.publication_year}
                            </div>
                          </div>
                        </div>

                        <div className="book-availability-bar">
                          <div>
                            <span
                              className="avail-status-dot"
                              style={{ background: isAvailable ? '#10b981' : '#ef4444' }}
                            />
                            <span style={{ fontWeight: 600, color: isAvailable ? '#0f172a' : '#ef4444' }}>
                              {isAvailable ? `${book.available_copies} of ${book.total_copies} Copies Available` : 'All Copies Borrowed'}
                            </span>
                          </div>
                          {book.shelf_locations && book.shelf_locations.length > 0 && (
                            <span className="shelf-tag">Shelf: {book.shelf_locations[0]}</span>
                          )}
                        </div>
                      </div>

                      <button
                        className="btn-primary"
                        style={{
                          background: isAvailable ? '#0f172a' : '#f1f5f9',
                          borderColor: isAvailable ? '#0f172a' : '#e2e8f0',
                          color: isAvailable ? '#ffffff' : '#94a3b8',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          padding: '0.6rem 1rem',
                          fontSize: '0.82rem'
                        }}
                        disabled={!isAvailable}
                        onClick={() => handleBorrowClick(book)}
                      >
                        {isAvailable ? 'Borrow Physical Copy' : 'Out of Stock'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DISCUSSION ROOMS VIEW (4 Rooms for Clubs)              */}
        {/* ============================================================== */}
        {activeTab === 'ROOMS' && (
          <div>
            <div className="page-hero">
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  Discussion Room Booking (Clubs & Communities)
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Reserve one of the library's 4 discussion rooms for recognized student clubs, project collaborations, or hackathon syncs.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {user && (
                  <button
                    onClick={() => setActiveTab('DASHBOARD')}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: '#ffffff',
                      border: '1.5px solid #0f172a',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <MessageSquare size={16} />
                    <span style={{ fontWeight: 700 }}>My Club Requests</span>
                    <span style={{
                      background: '#0f172a',
                      color: '#fff',
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: 800
                    }}>
                      {myRoomBookings.length}
                    </span>
                  </button>
                )}

                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => setShowAdminApprovalModal(true)}
                    className="btn-primary"
                    style={{
                      width: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: '#2563eb',
                      borderColor: '#1d4ed8',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>Librarian Review Queue</span>
                    <span style={{
                      background: '#ffffff',
                      color: '#2563eb',
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: 800
                    }}>
                      {adminRoomRequests.filter(r => r.status === 'PENDING').length} Pending
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Room Date & Session Selector */}
            <section className="light-card controls-panel" style={{ marginBottom: '1.5rem' }}>
              <div className="control-row">
                <span className="control-label">
                  <Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Slot:
                </span>
                <div className="pills-group">
                  {sessions.map(s => (
                    <button
                      key={s.session_number}
                      className={`pill-button ${selectedSession === s.session_number ? 'active' : ''}`}
                      onClick={() => setSelectedSession(s.session_number)}
                    >
                      <span>Session {s.session_number}</span>
                      <span className="session-time">{s.start_time} - {s.end_time}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-row">
                <span className="control-label">
                  <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Date:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: 'auto', padding: '0.4rem 0.75rem' }}
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  >
                    Today
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    onClick={() => {
                      const tmrw = new Date();
                      tmrw.setDate(tmrw.getDate() + 1);
                      setSelectedDate(tmrw.toISOString().split('T')[0]);
                    }}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
            </section>

            {/* 4 Discussion Rooms Grid */}
            {loadingRooms ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Checking Room Availability...
              </div>
            ) : (
              <div className="rooms-showcase-grid">
                {rooms.map(room => {
                  const isAvailable = room.slot_status === 'AVAILABLE';
                  const isPending = room.slot_status === 'PENDING';
                  const isApproved = room.slot_status === 'APPROVED';

                  return (
                    <div key={room._id} className="discussion-room-card">
                      <div>
                        <div className="room-card-header">
                          <span className="room-num-badge">Room {room.room_number}</span>
                          <span className="room-capacity-badge">
                            <Users size={14} /> Capacity: {room.capacity}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                          {room.name}
                        </h3>

                        <div className="room-facilities-list">
                          {room.facilities.map((fac, idx) => (
                            <span key={idx} className="room-facility-chip">
                              {fac}
                            </span>
                          ))}
                        </div>

                        <div className={`room-slot-banner ${isAvailable ? 'available' : isPending ? 'pending' : 'approved'}`}>
                          {isAvailable ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <CheckCircle2 size={16} />
                              <span style={{ fontWeight: 700 }}>Available for Session {selectedSession}</span>
                            </div>
                          ) : isPending ? (
                            <div>
                              <div style={{ fontWeight: 800, color: '#92400e' }}>Under Review</div>
                              <div style={{ fontSize: '0.75rem' }}>Requested by: {room.booking?.club_name}</div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>Reserved & Confirmed</div>
                              <div style={{ fontSize: '0.75rem' }}>Club: {room.booking?.club_name} ({room.booking?.attendees_count} members)</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        className="btn-primary"
                        style={{
                          background: isAvailable ? '#0f172a' : '#f1f5f9',
                          borderColor: isAvailable ? '#0f172a' : '#e2e8f0',
                          color: isAvailable ? '#ffffff' : '#94a3b8',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          padding: '0.65rem 1rem'
                        }}
                        disabled={!isAvailable}
                        onClick={() => handleRoomClick(room)}
                      >
                        {isAvailable ? 'Reserve for Club Activity' : isPending ? 'Request Pending Review' : 'Slot Occupied'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: STUDENT DASHBOARD (Centralized Activity Hub)           */}
        {/* ============================================================== */}
        {activeTab === 'DASHBOARD' && (
          <div>
            {loadingDashboard || !dashboardData ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading Student Dashboard...
              </div>
            ) : (
              <div>
                {/* 1. Student Welcome Header */}
                <div className="student-welcome-banner">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                        Welcome, {dashboardData.student.name}
                      </h2>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '12px',
                        background: dashboardData.student.gender === 'MALE' ? 'var(--male-blue-bg)' : 'var(--female-pink-bg)',
                        color: dashboardData.student.gender === 'MALE' ? 'var(--male-blue)' : 'var(--female-pink)',
                        border: `1px solid ${dashboardData.student.gender === 'MALE' ? 'var(--male-blue-border)' : 'var(--female-pink-border)'}`
                      }}>
                        {dashboardData.student.gender === 'MALE' ? 'Boys Seating Zone' : 'Girls Seating Zone'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Roll No: <strong>{dashboardData.student.roll_number}</strong> • Dept: {dashboardData.student.department} • Email: {dashboardData.student.email}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '0.5rem 0.95rem' }}
                      onClick={loadStudentDashboard}
                    >
                      Refresh Hub
                    </button>
                    <button
                      className="btn-primary"
                      style={{ fontSize: '0.82rem', padding: '0.5rem 0.95rem', width: 'auto' }}
                      onClick={() => setActiveTab('SEATS')}
                    >
                      Reserve A Seat
                    </button>
                  </div>
                </div>

                {/* 2. Key Metrics Summary Grid */}
                <div className="dashboard-stats-grid">
                  <div className="dashboard-metric-card">
                    <div>
                      <div className="metric-label">Active Booked Seats</div>
                      <div className="metric-num">{dashboardData.stats.active_seat_passes}</div>
                      <div className="metric-sub">Confirmed study desk passes</div>
                    </div>
                    <Armchair size={36} color="#2563eb" />
                  </div>

                  <div className="dashboard-metric-card">
                    <div>
                      <div className="metric-label">Borrowed Books</div>
                      <div className="metric-num">
                        {dashboardData.stats.borrowed_books_count} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {dashboardData.stats.max_borrow_limit}</span>
                      </div>
                      <div className="metric-sub">14-Day Lending Quota</div>
                    </div>
                    <BookOpen size={36} color="#059669" />
                  </div>

                  <div className="dashboard-metric-card">
                    <div>
                      <div className="metric-label">Discussion Rooms</div>
                      <div className="metric-num">{dashboardData.stats.club_room_bookings}</div>
                      <div className="metric-sub">Club activity reservations</div>
                    </div>
                    <Presentation size={36} color="#7c3aed" />
                  </div>

                  <div className="dashboard-metric-card" style={{ borderLeft: dashboardData.stats.total_accumulated_fines > 0 ? '4px solid #ef4444' : '1px solid var(--border-light)' }}>
                    <div>
                      <div className="metric-label">Overdue Fines</div>
                      <div className="metric-num" style={{ color: dashboardData.stats.total_accumulated_fines > 0 ? '#b91c1c' : '#0f172a' }}>
                        ₹{dashboardData.stats.total_accumulated_fines.toFixed(2)}
                      </div>
                      <div className="metric-sub">Rate: ₹2.00 / overdue day</div>
                    </div>
                    <ShieldCheck size={36} color={dashboardData.stats.total_accumulated_fines > 0 ? '#ef4444' : '#10b981'} />
                  </div>
                </div>

                {/* 3. Detailed Activity Sections Layout */}
                <div className="dashboard-sections-layout">
                  {/* LEFT COLUMN: SEATS, BORROWED BOOKS & ROOMS */}
                  <div>
                    {/* SECTION: ACTIVE BOOKED SEATS */}
                    <div className="dashboard-card-section">
                      <div className="section-title-bar">
                        <h3 className="section-heading">
                          <Armchair size={20} color="#2563eb" />
                          <span>Booked Seats ({dashboardData.seats.active.length} Active)</span>
                        </h3>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => setActiveTab('SEATS')}
                        >
                          + Reserve New Seat
                        </button>
                      </div>

                      {dashboardData.seats.active.length === 0 ? (
                        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No active seat reservations.</p>
                          <p style={{ fontSize: '0.8rem' }}>Reserve a study desk on Floor 1, 2, or 3 for your preferred study session.</p>
                        </div>
                      ) : (
                        dashboardData.seats.active.map(b => (
                          <div key={b._id} className="booked-seat-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{
                                width: 44,
                                height: 44,
                                background: b.seat?.zone === 'BOYS' ? 'var(--male-blue-bg)' : 'var(--female-pink-bg)',
                                border: `1.5px solid ${b.seat?.zone === 'BOYS' ? 'var(--male-blue-border)' : 'var(--female-pink-border)'}`,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: b.seat?.zone === 'BOYS' ? 'var(--male-blue)' : 'var(--female-pink)'
                              }}>
                                <Armchair size={24} />
                              </div>
                              <div>
                                <div className="seat-code-pill">{b.seat?.seat_number}</div>
                                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                  Floor {b.seat?.floor_number} • Table {b.seat?.table_number} • {b.seat?.zone === 'BOYS' ? 'Boys Left Wing' : 'Girls Right Wing'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                                  Date: <strong>{b.booking_date}</strong> • {b.session?.label}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn-secondary"
                                style={{
                                  padding: '0.45rem 0.85rem',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                                onClick={() => setActiveReservationPass({
                                  ...b.seat,
                                  booking_id: b._id
                                })}
                              >
                                <QrCode size={14} />
                                <span>Digital Pass</span>
                              </button>
                              <button
                                className="btn-danger"
                                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                                onClick={() => cancelReservation(b._id)}
                              >
                                Release
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* SECTION: BORROWED BOOKS */}
                    <div className="dashboard-card-section">
                      <div className="section-title-bar">
                        <h3 className="section-heading">
                          <BookOpen size={20} color="#059669" />
                          <span>Borrowed Books ({dashboardData.books.active_loans.length} / 3 Active)</span>
                        </h3>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => setActiveTab('BOOKS')}
                        >
                          Browse Library
                        </button>
                      </div>

                      {dashboardData.books.active_loans.length === 0 ? (
                        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>You currently have no borrowed books.</p>
                          <p style={{ fontSize: '0.8rem' }}>Browse our technical catalogue and borrow physical copies directly.</p>
                        </div>
                      ) : (
                        dashboardData.books.active_loans.map(loan => {
                          const isOverdue = loan.status === 'OVERDUE';
                          const dueDateFormatted = new Date(loan.due_date).toLocaleDateString();

                          return (
                            <div key={loan._id} className={`loan-item-card ${isOverdue ? 'overdue' : ''}`}>
                              <div style={{ display: 'flex', gap: '0.85rem', flex: 1, minWidth: '240px' }}>
                                <div className="book-thumb-box" style={{ width: 52, height: 74 }}>
                                  <img src={loan.book?.cover_image} alt={loan.book?.title} className="book-thumb-img" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      background: isOverdue ? '#ef4444' : '#2563eb',
                                      color: '#ffffff'
                                    }}>
                                      {isOverdue ? 'OVERDUE' : 'ACTIVE LOAN'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                      Barcode: {loan.copy?.barcode}
                                    </span>
                                  </div>
                                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                                    {loan.book?.title}
                                  </h4>
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{loan.book?.author}</p>
                                  <div style={{ fontSize: '0.75rem', color: isOverdue ? '#b91c1c' : '#475569', marginTop: '0.25rem', fontWeight: 600 }}>
                                    Due Date: {dueDateFormatted} ({loan.days_remaining > 0 ? `${loan.days_remaining} days left` : 'Overdue'})
                                    {loan.fine_amount > 0 && ` • Fine: ₹${loan.fine_amount}`}
                                  </div>
                                </div>
                              </div>

                              <button
                                className="btn-secondary"
                                style={{
                                  padding: '0.45rem 0.95rem',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem'
                                }}
                                onClick={() => returnBook(loan._id)}
                              >
                                <RotateCcw size={14} />
                                <span>Return Book</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* SECTION: CLUB DISCUSSION ROOMS */}
                    <div className="dashboard-card-section">
                      <div className="section-title-bar">
                        <h3 className="section-heading">
                          <Presentation size={20} color="#7c3aed" />
                          <span>Discussion Room Bookings ({dashboardData.rooms.length})</span>
                        </h3>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => setActiveTab('ROOMS')}
                        >
                          Book Room
                        </button>
                      </div>

                      {dashboardData.rooms.length === 0 ? (
                        <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '8px' }}>
                          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No club room bookings requested.</p>
                          <p style={{ fontSize: '0.8rem' }}>You can reserve Turing Hall, Lovelace Syndicate, Ramanujan, or Kalam Ideation Lab for club activities.</p>
                        </div>
                      ) : (
                        dashboardData.rooms.map(roomReq => (
                          <div key={roomReq._id} className="booked-seat-item">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: roomReq.status === 'APPROVED' ? '#10b981' : roomReq.status === 'PENDING' ? '#f59e0b' : '#ef4444',
                                  color: '#ffffff'
                                }}>
                                  {roomReq.status}
                                </span>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                                  {roomReq.room?.name}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2563eb' }}>
                                Club: {roomReq.club_name} ({roomReq.attendees_count} Attendees)
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Agenda: {roomReq.purpose}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                                Date: {roomReq.booking_date} • {roomReq.session?.label}
                              </div>
                              {roomReq.admin_remarks && (
                                <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                  Librarian remarks: {roomReq.admin_remarks}
                                </div>
                              )}
                            </div>

                            {roomReq.status !== 'CANCELLED' && (
                              <button
                                className="btn-danger"
                                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                                onClick={() => cancelRoomBooking(roomReq._id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: NOTIFICATIONS & RULES */}
                  <div>
                    {/* NOTIFICATIONS WIDGET */}
                    <div className="dashboard-card-section">
                      <div className="section-title-bar">
                        <h3 className="section-heading" style={{ fontSize: '1rem' }}>
                          <Bell size={18} color="#0f172a" />
                          <span>Notifications</span>
                        </h3>
                        {dashboardData.stats.unread_notifications > 0 && (
                          <button
                            onClick={markAllNotifsRead}
                            style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Mark All Read
                          </button>
                        )}
                      </div>

                      {dashboardData.notifications.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                          {dashboardData.notifications.map(n => (
                            <div key={n._id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                              <div className="notif-title">
                                <span>{n.title}</span>
                                <span className="notif-time">{new Date(n.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.35 }}>
                                {n.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* QUICK LIBRARY POLICIES REFERENCE CARD */}
                    <div className="dashboard-card-section" style={{ background: '#f8fafc' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <FileText size={16} /> Library Guidelines
                      </h4>
                      <ul style={{ fontSize: '0.78rem', color: '#475569', listStyleType: 'disc', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                        <li><strong>Study Seating:</strong> Left Wing is reserved for Boys; Right Wing is reserved for Girls.</li>
                        <li><strong>College Slots:</strong> 4 daily sessions between 8:45 AM and 4:30 PM.</li>
                        <li><strong>Book Lending:</strong> Maximum 3 active books for up to 14 days.</li>
                        <li><strong>Overdue Policy:</strong> ₹2.00 per day per book past the due date.</li>
                        <li><strong>Discussion Rooms:</strong> 4 rooms available for recognized college clubs with minimum 2 attendees.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: SUBMIT ROOM REQUEST FORM                                */}
      {/* ============================================================== */}
      {selectedRoomToBook && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Reserve Discussion Room</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selectedRoomToBook.name} (Max {selectedRoomToBook.capacity} people)
                </p>
              </div>
              <button onClick={() => setSelectedRoomToBook(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitRoomRequest}>
              <div className="form-group">
                <label className="form-label">Official Club / Community Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. GDSC, ACM, Rotaract, Robotics Club..."
                  value={roomBookingForm.club_name}
                  onChange={(e) => setRoomBookingForm({ ...roomBookingForm, club_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purpose / Discussion Agenda</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Planning upcoming college hackathon, coding mentorship sync, technical review..."
                  value={roomBookingForm.purpose}
                  onChange={(e) => setRoomBookingForm({ ...roomBookingForm, purpose: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Number of Attendees (2 to {selectedRoomToBook.capacity})</label>
                <input
                  type="number"
                  className="form-input"
                  min={2}
                  max={selectedRoomToBook.capacity}
                  value={roomBookingForm.attendees_count}
                  onChange={(e) => setRoomBookingForm({ ...roomBookingForm, attendees_count: parseInt(e.target.value) || 2 })}
                  required
                />
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '1.25rem'
              }}>
                <div><strong>Slot:</strong> {sessions.find(s => s.session_number === selectedSession)?.label}</div>
                <div><strong>Date:</strong> {selectedDate}</div>
                <div><strong>Lead Student:</strong> {user?.name} ({user?.roll_number})</div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedRoomToBook(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADMIN ROOM APPROVAL QUEUE                               */}
      {/* ============================================================== */}
      {showAdminApprovalModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Librarian Room Approval Queue</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Approve or reject student club discussion room bookings
                </p>
              </div>
              <button onClick={() => setShowAdminApprovalModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '440px', overflowY: 'auto', marginBottom: '1.25rem' }}>
              {adminRoomRequests.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No discussion room requests in queue.
                </div>
              ) : (
                adminRoomRequests.map(req => {
                  const isPending = req.status === 'PENDING';
                  return (
                    <div key={req._id} className="loan-item-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: req.status === 'APPROVED' ? '#10b981' : req.status === 'PENDING' ? '#f59e0b' : '#ef4444',
                              color: '#ffffff'
                            }}>
                              {req.status}
                            </span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                              {req.room?.name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563eb' }}>
                            {req.club_name} ({req.attendees_count} Attendees)
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                            <strong>Purpose:</strong> {req.purpose}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Requested by: {req.user?.name} ({req.user?.roll_number}) • Date: {req.booking_date} ({req.session?.label})
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div className="admin-action-btn-group" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                          <button
                            className="btn-primary"
                            style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', background: '#10b981', borderColor: '#059669' }}
                            onClick={() => {
                              fetch(`/api/rooms/admin/requests/${req._id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ action: 'APPROVE', admin_remarks: 'Approved by Chief Librarian.' })
                              })
                                .then(res => res.json())
                                .then(data => {
                                  showMessage('success', data.message);
                                  loadAdminRoomRequests();
                                  loadRooms();
                                });
                            }}
                          >
                            <Check size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Approve Booking
                          </button>
                          <button
                            className="btn-danger"
                            style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              fetch(`/api/rooms/admin/requests/${req._id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ action: 'REJECT', admin_remarks: 'Capacity or schedule conflict.' })
                              })
                                .then(res => res.json())
                                .then(data => {
                                  showMessage('success', data.message);
                                  loadAdminRoomRequests();
                                  loadRooms();
                                });
                            }}
                          >
                            <Ban size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Reject Request
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAdminApprovalModal(false)}>
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: BORROW BOOK CONFIRMATION (Tab 2)                         */}
      {/* ============================================================== */}
      {selectedBookToBorrow && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Confirm Book Lending</h3>
              <button onClick={() => setSelectedBookToBorrow(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Book Title:</span>
                <span style={{ fontWeight: 800 }}>{selectedBookToBorrow.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Author:</span>
                <span style={{ fontWeight: 600 }}>{selectedBookToBorrow.author}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lending Period:</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>14 Days (Standard College Policy)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Due Date:</span>
                <span style={{ fontWeight: 700 }}>
                  {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedBookToBorrow(null)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ flex: 1.5 }} onClick={confirmBorrowBook}>
                Issue & Confirm Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SEAT CONFIRMATION (Tab 1)                               */}
      {/* ============================================================== */}
      {selectedSeatToBook && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Confirm Seat Reservation</h3>
              <button onClick={() => setSelectedSeatToBook(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Seat Number:</span>
                <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{selectedSeatToBook.seat_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Table:</span>
                <span style={{ fontWeight: 700 }}>{selectedSeatToBook.table_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Zone:</span>
                <span style={{
                  fontWeight: 800,
                  color: selectedSeatToBook.zone === 'BOYS' ? 'var(--male-blue)' : 'var(--female-pink)'
                }}>
                  {selectedSeatToBook.zone === 'BOYS' ? 'Boys Zone (Blue)' : 'Girls Zone (Pink)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Session:</span>
                <span style={{ fontWeight: 600 }}>{sessions.find(s => s.session_number === selectedSession)?.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <span style={{ fontWeight: 600 }}>{selectedDate}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedSeatToBook(null)}>
                Cancel
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={confirmReservation}>
                Confirm Reservation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ACTIVE SEAT PASS (Tab 1)                               */}
      {/* ============================================================== */}
      {activeReservationPass && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>Active Seat Pass</h3>
              <button onClick={() => setActiveReservationPass(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '8px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#15803d', fontWeight: 700 }}>
                BIT Central Library Pass
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', margin: '0.4rem 0', color: '#0f172a' }}>
                {activeReservationPass.seat_number}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Floor {selectedFloor} • {activeReservationPass.table_number} • {sessions.find(s => s.session_number === selectedSession)?.label}
              </div>

              {/* QR Code Graphic */}
              <div style={{
                margin: '1rem auto',
                width: '100px',
                height: '100px',
                background: '#ffffff',
                padding: '6px',
                borderRadius: '6px',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '3px',
                border: '1px solid var(--border-light)'
              }}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      background: (i % 2 === 0 || i % 5 === 0) ? '#0f172a' : 'transparent',
                      borderRadius: '1px'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={() => cancelReservation(activeReservationPass.booking_id)}
              >
                Cancel Booking
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setActiveReservationPass(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: AUTHENTICATION (2-Step Email Flow)                       */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* MODAL: AUTHENTICATION (PCDP Portal & Google Sign-In)            */}
      {/* ============================================================== */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px', borderRadius: '20px', padding: '2.5rem 2.2rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)', background: '#ffffff', textAlign: 'center' }}>
            {/* Close Button */}
            <button
              onClick={() => { setShowAuthModal(false); resetAuthModal(); }}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Close"
            >
              <X size={20} />
            </button>

            {/* Institution Brand & App Name */}
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: '16px', background: 'linear-gradient(135deg, #1e3a8a, #4338ca)', color: '#ffffff', marginBottom: '1rem', boxShadow: '0 8px 16px -4px rgba(30, 58, 138, 0.3)' }}>
              <BookOpen size={30} />
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4338ca', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              BITSathy Central Library
            </div>
            
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
              Sign in with your BITSathy account
            </h2>

            {/* Supporting Text */}
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: 1.45 }}>
              Use your existing college email credentials. No separate library password is required.
            </p>

            {/* Strict Domain Restriction Alert Banner */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              textAlign: 'left'
            }}>
              <CheckCircle2 size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.35 }}>
                Restricted to authorized <strong style={{ color: '#1e3a8a' }}>@bitsathy.ac.in</strong> accounts only. Personal Google accounts (@gmail.com) are prohibited.
              </div>
            </div>

            {authError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                color: '#b91c1c',
                fontSize: '0.82rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'left'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            {/* Official Google Identity Services Container */}
            <div id="google-signin-button" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', minHeight: '40px' }}></div>

            {/* Prominent Continue with Google Button */}
            <button
              type="button"
              disabled={authLoading}
              onClick={() => {
                if (window.google?.accounts?.id && googleClientId) {
                  window.google.accounts.id.prompt();
                } else {
                  handleGoogleSignIn('gowthamg.it23@bitsathy.ac.in', 'Gowtham G');
                }
              }}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1.5px solid #dadce0',
                borderRadius: '12px',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                opacity: authLoading ? 0.7 : 1
              }}
              onMouseEnter={(e) => { if (!authLoading) { e.currentTarget.style.borderColor = '#1a73e8'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,115,232,0.15)'; } }}
              onMouseLeave={(e) => { if (!authLoading) { e.currentTarget.style.borderColor = '#dadce0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.06)'; } }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#1f2937' }}>
                {authLoading ? 'Verifying BITSathy Account...' : 'Continue with Google'}
              </span>
            </button>

            {/* Quick BIT Sathy Student SSO Card */}
            <div style={{ marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                  G
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Gowtham G (Student)</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>gowthamg.it23@bitsathy.ac.in</div>
                </div>
              </div>
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn('gowthamg.it23@bitsathy.ac.in', 'Gowtham G')}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>

            {/* Quick BIT Sathy Librarian Operations Portal Card */}
            <div style={{ marginTop: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1e3a8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                  L
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Dr. S. Ramanathan</span>
                    <span style={{ fontSize: '0.65rem', background: '#2563eb', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>LIBRARIAN</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>librarian@bitsathy.ac.in</div>
                </div>
              </div>
              <button
                type="button"
                disabled={authLoading}
                onClick={() => handleGoogleSignIn('librarian@bitsathy.ac.in', 'Dr. S. Ramanathan (Librarian)')}
                style={{
                  background: '#1e3a8a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>

            {/* Custom @bitsathy.ac.in Email Option Toggle */}
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowEmailInput(!showEmailInput)}
                style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
              >
                {showEmailInput ? '▲ Hide alternate email' : '▼ Sign in with different @bitsathy.ac.in email'}
              </button>

              {showEmailInput && (
                <div style={{ marginTop: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Institutional Email Address:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="email"
                      placeholder="e.g. yourname.dept23@bitsathy.ac.in"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      disabled={authLoading || !customEmail.trim()}
                      onClick={() => {
                        const clean = customEmail.trim().toLowerCase();
                        if (!clean.endsWith('@bitsathy.ac.in')) {
                          setAuthError('Unauthorized domain. Only @bitsathy.ac.in email addresses are permitted.');
                          return;
                        }
                        const namePart = clean.split('@')[0].split('.')[0] || 'Student';
                        const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                        handleGoogleSignIn(clean, capitalized);
                      }}
                      style={{
                        background: '#1e3a8a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Verify
                    </button>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                    Only valid college email addresses with domain <strong>@bitsathy.ac.in</strong> are accepted.
                  </span>
                </div>
              )}
            </div>

            {/* Footer security note */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Protected by Google Identity & BIT Single Sign-On</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PROFILE SETUP / UPGRADE PROFILE                         */}
      {/* ============================================================== */}
      {showProfileSetup && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '1.5rem', color: '#fff' }}>
                🎓
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Upgrade Your Profile</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Please provide your college details to activate your library card & seating access.
              </p>
            </div>

            {profileSetupError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.6rem 0.85rem', borderRadius: '8px', color: '#991b1b', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={14} />
                <span>{profileSetupError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSetup}>
              {/* 1. Register Number */}
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                  1. Register / Roll Number *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 7376231IT101"
                  value={profileSetupForm.roll_number}
                  onChange={(e) => setProfileSetupForm({ ...profileSetupForm, roll_number: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              {/* 2. Department */}
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                  2. Department *
                </label>
                <select
                  className="form-input"
                  value={profileSetupForm.department}
                  onChange={(e) => setProfileSetupForm({ ...profileSetupForm, department: e.target.value })}
                  required
                >
                  <option value="Information Technology">Information Technology (IT)</option>
                  <option value="Computer Science and Engineering">Computer Science and Engineering (CSE)</option>
                  <option value="Artificial Intelligence and Machine Learning">Artificial Intelligence and Machine Learning (AI&ML)</option>
                  <option value="Electronics and Communication Engineering">Electronics and Communication Engineering (ECE)</option>
                  <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering (EEE)</option>
                  <option value="Mechanical Engineering">Mechanical Engineering (MECH)</option>
                  <option value="Civil Engineering">Civil Engineering (CIVIL)</option>
                  <option value="Data Science">Data Science (DS)</option>
                  <option value="Cyber Security">Cyber Security (CY)</option>
                  <option value="Biotechnology">Biotechnology (BT)</option>
                  <option value="Food Technology">Food Technology (FT)</option>
                  <option value="Master of Business Administration">Master of Business Administration (MBA)</option>
                  <option value="Master of Computer Applications">Master of Computer Applications (MCA)</option>
                </select>
              </div>

              {/* 3. Year of Study */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', textAlign: 'left' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    3. Year of Study *
                  </label>
                  <select
                    className="form-input"
                    value={profileSetupForm.year}
                    onChange={(e) => setProfileSetupForm({ ...profileSetupForm, year: parseInt(e.target.value) })}
                    required
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="98XXXXXXXX"
                    value={profileSetupForm.phone}
                    onChange={(e) => setProfileSetupForm({ ...profileSetupForm, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* 4. Gender (Boys / Girls Zone) */}
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                  Gender (Seat Zone Allocation) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      background: profileSetupForm.gender === 'MALE' ? 'var(--male-blue-bg)' : '#fff',
                      borderColor: profileSetupForm.gender === 'MALE' ? 'var(--male-blue)' : 'var(--border-light)',
                      color: profileSetupForm.gender === 'MALE' ? 'var(--male-blue)' : 'var(--text-secondary)',
                      fontWeight: 700
                    }}
                    onClick={() => setProfileSetupForm({ ...profileSetupForm, gender: 'MALE' })}
                  >
                    👦 Male (Boys Zone)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{
                      background: profileSetupForm.gender === 'FEMALE' ? 'var(--female-pink-bg)' : '#fff',
                      borderColor: profileSetupForm.gender === 'FEMALE' ? 'var(--female-pink)' : 'var(--border-light)',
                      color: profileSetupForm.gender === 'FEMALE' ? 'var(--female-pink)' : 'var(--text-secondary)',
                      fontWeight: 700
                    }}
                    onClick={() => setProfileSetupForm({ ...profileSetupForm, gender: 'FEMALE' })}
                  >
                    👧 Female (Girls Zone)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)'
                }}
              >
                Upgrade Profile &amp; Continue →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PROFILE VIEW / EDIT                                     */}
      {/* ============================================================== */}
      {showProfileModal && user && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
            {/* Profile Header Banner */}
            <div style={{ background: `linear-gradient(135deg, ${user.avatar_color || '#2563eb'}, ${user.gender === 'MALE' ? '#1d4ed8' : '#be185d'})`, padding: '2rem 1.75rem 1.25rem', position: 'relative' }}>
              <button onClick={() => setShowProfileModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', padding: '4px 8px' }}>
                <X size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ color: '#fff' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{user.name}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{user.email}</div>
                  <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', padding: '0.1rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>
                      {user.role === 'ADMIN' ? '⚙️ Admin' : user.gender === 'MALE' ? '👦 Male' : '👧 Female'}
                    </span>
                    {user.role !== 'ADMIN' && (
                      <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '12px', padding: '0.1rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>Year {user.year}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Body */}
            <div style={{ padding: '1.5rem 1.75rem' }}>
              {!profileEditMode ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    {[
                      { label: 'Roll Number', value: user.roll_number, mono: true },
                      { label: 'Department', value: user.department },
                      { label: 'Year of Study', value: user.role !== 'ADMIN' ? `${user.year}${['','st','nd','rd','th'][user.year] || 'th'} Year` : 'N/A' },
                      { label: 'Phone', value: user.phone || '—' },
                    ].map(item => (
                      <div key={item.label}>
                        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.15rem' }}>{item.label}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, fontFamily: item.mono ? 'var(--font-mono)' : 'inherit', color: '#0f172a' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {user.bio && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>About</div>
                      <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{user.bio}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-primary" style={{ flex: 1 }}
                      onClick={() => { setProfileEditMode(true); }}>Edit Profile</button>
                    <button className="btn-secondary" style={{ flex: 1 }}
                      onClick={() => { handleLogout(); setShowProfileModal(false); }}>Sign Out</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Full Name</label>
                      <input type="text" className="form-input" value={profileEditForm.name}
                        onChange={(e) => setProfileEditForm({ ...profileEditForm, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Phone</label>
                      <input type="tel" className="form-input" value={profileEditForm.phone}
                        onChange={(e) => setProfileEditForm({ ...profileEditForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Department</label>
                      <input type="text" className="form-input" value={profileEditForm.department}
                        onChange={(e) => setProfileEditForm({ ...profileEditForm, department: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Year of Study</label>
                      <select className="form-input" value={profileEditForm.year}
                        onChange={(e) => setProfileEditForm({ ...profileEditForm, year: parseInt(e.target.value) })}>
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Bio / About (optional)</label>
                    <textarea className="form-input" rows={3} value={profileEditForm.bio}
                      onChange={(e) => setProfileEditForm({ ...profileEditForm, bio: e.target.value })}
                      placeholder="Tell us a bit about yourself..."
                      style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <button className="btn-primary" style={{ flex: 1.5 }} onClick={handleProfileUpdate} disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setProfileEditMode(false)}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
