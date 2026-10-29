import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Armchair,
  Layers,
  RotateCcw,
  BookOpen,
  ArrowRightLeft,
  AlertTriangle,
  MessageSquare,
  CalendarCheck,
  Users,
  History,
  BarChart3,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  X,
  Check,
  Building2,
  Eye,
  FileText
} from 'lucide-react';

export default function LibrarianPortal({ user, token, onSwitchToStudentView, onLogout, showMessage }) {
  // Navigation State
  const [activeSection, setActiveSection] = useState('OVERVIEW');

  // Global Filter State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState(1);
  const [sessions, setSessions] = useState([]);
  const [floors, setFloors] = useState([]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Overview Data
  const [overviewData, setOverviewData] = useState(null);

  // Seat Management State
  const [seatReservations, setSeatReservations] = useState([]);
  const [seatSearch, setSeatSearch] = useState('');
  const [seatFloorFilter, setSeatFloorFilter] = useState('ALL');
  const [seatZoneFilter, setSeatZoneFilter] = useState('ALL');
  const [seatStatusFilter, setSeatStatusFilter] = useState('CONFIRMED');

  // Floor Map State
  const [mapFloor, setMapFloor] = useState(1);
  const [mapLayout, setMapLayout] = useState(null);
  const [selectedSeatDetails, setSelectedSeatDetails] = useState(null);

  // Modals State
  const [cancelBookingModal, setCancelBookingModal] = useState(null); // { booking_id, seat_number, student_name }
  const [cancellationReason, setCancellationReason] = useState('');
  const [blockSeatModal, setBlockSeatModal] = useState(null); // { seat_id, seat_number, current_status }
  const [blockReason, setBlockReason] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Book Catalogue State
  const [booksList, setBooksList] = useState([]);
  const [bookSearch, setBookSearch] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editBookModal, setEditBookModal] = useState(null);
  const [manageCopiesModal, setManageCopiesModal] = useState(null);
  const [newBookForm, setNewBookForm] = useState({
    isbn: '',
    title: '',
    author: '',
    category: 'Computer Science',
    publisher: 'Academic Press',
    publication_year: 2024,
    copies_count: 3,
    shelf_location: 'CS-01',
    description: ''
  });
  const [addCopiesCount, setAddCopiesCount] = useState(2);

  // Circulation State (Issue & Return)
  const [loansList, setLoansList] = useState([]);
  const [loanStatusFilter, setLoanStatusFilter] = useState('ALL');
  const [loanSearch, setLoanSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({ roll_number: '', barcode: '', lending_days: 14 });
  const [returnBarcode, setReturnBarcode] = useState('');

  // Overdue Books State
  const [overdueList, setOverdueList] = useState([]);

  // Discussion Rooms State
  const [roomRequests, setRoomRequests] = useState([]);
  const [roomFilterStatus, setRoomFilterStatus] = useState('ALL');
  const [roomDecisionModal, setRoomDecisionModal] = useState(null); // { request, action: 'APPROVE'|'REJECT' }
  const [adminRemarks, setAdminRemarks] = useState('');

  // Students Directory State
  const [studentsList, setStudentsList] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentDrilldown, setSelectedStudentDrilldown] = useState(null);
  const [studentDetailsData, setStudentDetailsData] = useState(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');

  // Reports State
  const [reportsData, setReportsData] = useState(null);

  // Initial Common Data Fetching
  useEffect(() => {
    fetch('/api/seats/sessions')
      .then(res => res.json())
      .then(d => { if (d.sessions) setSessions(d.sessions); });

    fetch('/api/seats/floors')
      .then(res => res.json())
      .then(d => { if (d.floors) setFloors(d.floors); });

    fetch('/api/books/categories')
      .then(res => res.json())
      .then(d => { if (d.categories) setCategories(['ALL', ...d.categories]); });
  }, []);

  // Section Data Fetching
  useEffect(() => {
    if (!token) return;

    if (activeSection === 'OVERVIEW') {
      loadOverview();
    } else if (activeSection === 'SEATS_TABLE') {
      loadSeatReservations();
    } else if (activeSection === 'FLOOR_MAP') {
      loadMapLayout();
    } else if (activeSection === 'CATALOGUE') {
      loadBooks();
    } else if (activeSection === 'CIRCULATION') {
      loadLoans();
    } else if (activeSection === 'OVERDUE') {
      loadOverdue();
    } else if (activeSection === 'ROOM_REQUESTS' || activeSection === 'ROOM_SCHEDULE') {
      loadRoomRequests();
    } else if (activeSection === 'STUDENTS') {
      loadStudents();
    } else if (activeSection === 'AUDIT_LOGS') {
      loadAuditLogs();
    } else if (activeSection === 'REPORTS') {
      loadReports();
    }
  }, [activeSection, selectedDate, selectedSession, token, mapFloor]);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 1. Overview Loader
  const loadOverview = () => {
    setLoading(true);
    fetch(`/api/librarian/overview?date=${selectedDate}&session_number=${selectedSession}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setOverviewData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 2. Seat Reservations Loader
  const loadSeatReservations = () => {
    setLoading(true);
    const params = new URLSearchParams({
      date: selectedDate,
      session_number: selectedSession,
      floor_number: seatFloorFilter,
      zone: seatZoneFilter,
      status: seatStatusFilter,
      search: seatSearch
    });
    fetch(`/api/librarian/seats/reservations?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.reservations) setSeatReservations(data.reservations);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 3. Floor Map Loader
  const loadMapLayout = () => {
    setLoading(true);
    fetch(`/api/librarian/seats/layout?floor_number=${mapFloor}&session_number=${selectedSession}&date=${selectedDate}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setMapLayout(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 4. Cancel Seat Reservation
  const handleCancelSeatBooking = async () => {
    if (!cancelBookingModal) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/librarian/seats/cancel', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          booking_id: cancelBookingModal.booking_id,
          reason: cancellationReason
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to cancel reservation.');
        setActionLoading(false);
        return;
      }
      showMessage('success', `Reservation cancelled. Student notified.`);
      setCancelBookingModal(null);
      setCancellationReason('');
      if (activeSection === 'SEATS_TABLE') loadSeatReservations();
      if (activeSection === 'FLOOR_MAP') loadMapLayout();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // 5. Block / Unblock Seat (Maintenance)
  const handleToggleSeatBlock = async (seatId, newStatus) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/librarian/seats/block', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          seat_id: seatId,
          status: newStatus,
          reason: blockReason || (newStatus === 'MAINTENANCE' ? 'Seat under repair' : 'Restored to service')
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to update seat status.');
        setActionLoading(false);
        return;
      }
      showMessage('success', data.message);
      setBlockSeatModal(null);
      setBlockReason('');
      setSelectedSeatDetails(null);
      if (activeSection === 'FLOOR_MAP') loadMapLayout();
      if (activeSection === 'SEATS_TABLE') loadSeatReservations();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // 6. Daily Reset Trigger
  const handleTriggerDailyReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/librarian/seats/daily-reset', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ date: selectedDate })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Daily reset failed.');
        setResetting(false);
        return;
      }
      showMessage('success', data.message);
      setShowResetModal(false);
      loadOverview();
    } catch {
      showMessage('error', 'Network error.');
    }
    setResetting(false);
  };

  // 7. Books Loader
  const loadBooks = () => {
    setLoading(true);
    const params = new URLSearchParams({ search: bookSearch, category: bookCategoryFilter });
    fetch(`/api/librarian/books?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.books) setBooksList(data.books);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Add Book
  const handleAddBook = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/librarian/books', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newBookForm)
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to add book.');
        setActionLoading(false);
        return;
      }
      showMessage('success', `"${newBookForm.title}" added to catalogue!`);
      setShowAddBookModal(false);
      setNewBookForm({
        isbn: '',
        title: '',
        author: '',
        category: 'Computer Science',
        publisher: 'Academic Press',
        publication_year: 2024,
        copies_count: 3,
        shelf_location: 'CS-01',
        description: ''
      });
      loadBooks();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // Edit Book
  const handleEditBook = async (e) => {
    e.preventDefault();
    if (!editBookModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/librarian/books/${editBookModal._id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(editBookModal)
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to update book.');
        setActionLoading(false);
        return;
      }
      showMessage('success', 'Book metadata updated successfully.');
      setEditBookModal(null);
      loadBooks();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // Add Copies
  const handleAddCopies = async (bookId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/librarian/books/${bookId}/copies`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ count: addCopiesCount, shelf_location: manageCopiesModal.shelf_location || 'GEN-01' })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to add copies.');
        setActionLoading(false);
        return;
      }
      showMessage('success', data.message);
      setManageCopiesModal(null);
      loadBooks();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // Update Copy Status
  const handleUpdateCopyStatus = async (copyId, newStatus) => {
    try {
      const res = await fetch(`/api/librarian/books/copies/${copyId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to update copy status.');
        return;
      }
      showMessage('success', data.message);
      loadBooks();
      setManageCopiesModal(null);
    } catch {
      showMessage('error', 'Network error.');
    }
  };

  // 8. Circulation: Issue Book
  const handleIssueBook = async (e) => {
    e.preventDefault();
    if (!issueForm.roll_number || !issueForm.barcode) {
      showMessage('warning', 'Please fill Roll Number and Barcode.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/librarian/circulation/issue', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(issueForm)
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Issue transaction failed.');
        setActionLoading(false);
        return;
      }
      showMessage('success', data.message);
      setShowIssueModal(false);
      setIssueForm({ roll_number: '', barcode: '', lending_days: 14 });
      loadLoans();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // Circulation: Return Book
  const handleReturnBook = async (barcodeOrLoanId, isLoanId = false) => {
    setActionLoading(true);
    try {
      const body = isLoanId ? { loan_id: barcodeOrLoanId } : { barcode: barcodeOrLoanId };
      const res = await fetch('/api/librarian/circulation/return', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to process return.');
        setActionLoading(false);
        return;
      }
      showMessage('success', data.message);
      setReturnBarcode('');
      loadLoans();
      if (activeSection === 'OVERDUE') loadOverdue();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // Loans Loader
  const loadLoans = () => {
    setLoading(true);
    const params = new URLSearchParams({ status: loanStatusFilter, search: loanSearch });
    fetch(`/api/librarian/circulation/loans?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.loans) setLoansList(data.loans);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Overdue Loader
  const loadOverdue = () => {
    setLoading(true);
    fetch('/api/librarian/circulation/overdue', { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.overdue_loans) setOverdueList(data.overdue_loans);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 9. Room Requests Loader
  const loadRoomRequests = () => {
    setLoading(true);
    const params = new URLSearchParams({ status: roomFilterStatus });
    fetch(`/api/librarian/rooms/requests?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.requests) setRoomRequests(data.requests);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Room Request Decision (Approve / Reject)
  const handleRoomDecision = async () => {
    if (!roomDecisionModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/librarian/rooms/requests/${roomDecisionModal.request._id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          action: roomDecisionModal.action,
          admin_remarks: adminRemarks
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to update request.');
        setActionLoading(false);
        return;
      }
      showMessage('success', data.message);
      setRoomDecisionModal(null);
      setAdminRemarks('');
      loadRoomRequests();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // 10. Students Loader
  const loadStudents = () => {
    setLoading(true);
    fetch(`/api/librarian/students?search=${encodeURIComponent(studentSearch)}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.students) setStudentsList(data.students);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Student Drilldown Loader
  const handleOpenStudentDrilldown = (studentId) => {
    setSelectedStudentDrilldown(studentId);
    fetch(`/api/librarian/students/${studentId}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setStudentDetailsData(data);
      });
  };

  // 11. Audit Logs Loader
  const loadAuditLogs = () => {
    setLoading(true);
    fetch(`/api/librarian/audit-logs?category=${auditCategoryFilter}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.audit_logs) setAuditLogs(data.audit_logs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 12. Reports Loader
  const loadReports = () => {
    setLoading(true);
    fetch('/api/librarian/reports', { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setReportsData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'var(--font-sans)' }}>
      {/* ─────────────────────────────────────────────────────────────
          1. PERSISTENT SIDEBAR NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <aside style={{
        width: '260px',
        background: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxShadow: '4px 0 12px rgba(0,0,0,0.1)',
        zIndex: 40,
        flexShrink: 0
      }}>
        {/* Portal Branding */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(37,99,235,0.3)' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Librarian Portal
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                BITSathy Library
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items (12 Sections) */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.65rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0.4rem 0.6rem 0.25rem' }}>
            Core Operations
          </div>

          {[
            { id: 'OVERVIEW', label: 'Overview Dashboard', icon: LayoutDashboard },
            { id: 'SEATS_TABLE', label: 'Seat Reservations', icon: Armchair },
            { id: 'FLOOR_MAP', label: 'Interactive Floor Map', icon: Layers },
            { id: 'DAILY_RESET', label: 'Daily Seat Reset', icon: RotateCcw },
            { id: 'CATALOGUE', label: 'Book Catalogue', icon: BookOpen },
            { id: 'CIRCULATION', label: 'Issue & Return Desk', icon: ArrowRightLeft },
            { id: 'OVERDUE', label: 'Overdue Books & Fines', icon: AlertTriangle },
            { id: 'ROOM_REQUESTS', label: 'Room Approvals', icon: MessageSquare, badge: overviewData?.metrics?.rooms?.pending_requests },
            { id: 'ROOM_SCHEDULE', label: 'Room Schedule & History', icon: CalendarCheck },
            { id: 'STUDENTS', label: 'Student Directory', icon: Users },
            { id: 'AUDIT_LOGS', label: 'Activity & Audit Log', icon: History },
            { id: 'REPORTS', label: 'Operational Reports', icon: BarChart3 }
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '0.62rem 0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? '#1e293b' : 'transparent',
                  color: isActive ? '#60a5fa' : '#cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  marginBottom: '2px'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#1e293b80'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} color={isActive ? '#60a5fa' : '#94a3b8'} />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Actions Footer */}
        <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #1e293b', background: '#0b1120' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.65rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4338ca', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
              {user?.name?.charAt(0) || 'L'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'Authorized Librarian'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 600 }}>
                {user?.role === 'ADMIN' ? 'Chief Administrator' : 'Staff Librarian'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onSwitchToStudentView}
              title="Preview Student Experience"
              style={{
                flex: 1,
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <Eye size={12} />
              <span>Student View</span>
            </button>
            <button
              onClick={onLogout}
              title="Logout"
              style={{
                background: '#334155',
                color: '#f87171',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.6rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA
      ───────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Operational Bar */}
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              {activeSection === 'OVERVIEW' && 'Operations Overview'}
              {activeSection === 'SEATS_TABLE' && 'Seat Reservations Management'}
              {activeSection === 'FLOOR_MAP' && 'Interactive Floor Map & Maintenance'}
              {activeSection === 'DAILY_RESET' && 'Daily Seat Availability & Reset'}
              {activeSection === 'CATALOGUE' && 'Book Catalogue & Physical Inventory'}
              {activeSection === 'CIRCULATION' && 'Circulation Desk (Book Issue & Return)'}
              {activeSection === 'OVERDUE' && 'Overdue Loans & Fine Collections'}
              {activeSection === 'ROOM_REQUESTS' && 'Discussion Room Requests & Approvals'}
              {activeSection === 'ROOM_SCHEDULE' && 'Discussion Room Schedules'}
              {activeSection === 'STUDENTS' && 'Student Records Directory'}
              {activeSection === 'AUDIT_LOGS' && 'Administrative Audit Log & History'}
              {activeSection === 'REPORTS' && 'Operational Analytics & Reports'}
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              BITSathy Central Library Management System • Live Administrative Console
            </p>
          </div>

          {/* Date & Session Global Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.35rem 0.65rem' }}>
              <Clock size={14} color="#64748b" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', outline: 'none' }}
              />
            </div>

            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(parseInt(e.target.value))}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1e293b',
                outline: 'none'
              }}
            >
              {sessions.map(s => (
                <option key={s.session_number} value={s.session_number}>
                  Session {s.session_number}: {s.start_time} - {s.end_time}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                if (activeSection === 'OVERVIEW') loadOverview();
                else if (activeSection === 'SEATS_TABLE') loadSeatReservations();
                else if (activeSection === 'FLOOR_MAP') loadMapLayout();
                else if (activeSection === 'CATALOGUE') loadBooks();
                else if (activeSection === 'CIRCULATION') loadLoans();
                else if (activeSection === 'OVERDUE') loadOverdue();
                else if (activeSection === 'ROOM_REQUESTS') loadRoomRequests();
                else if (activeSection === 'STUDENTS') loadStudents();
                else if (activeSection === 'AUDIT_LOGS') loadAuditLogs();
                else if (activeSection === 'REPORTS') loadReports();
                showMessage('info', 'Data refreshed from server.');
              }}
              title="Refresh Current Data"
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#475569'
              }}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <div style={{ flex: 1, padding: '1.5rem 1.75rem', overflowY: 'auto' }}>
          {/* ──────────────────────────────────────────────────────────
              SECTION 1: OVERVIEW DASHBOARD
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'OVERVIEW' && (
            <div>
              {/* Summary Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Seats Total & Available */}
                <div className="light-card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>Library Seats (3 Floors)</span>
                    <Armchair size={18} color="#2563eb" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
                    {overviewData?.metrics?.seats?.available || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>available</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                    {overviewData?.metrics?.seats?.reserved || 0} reserved • {overviewData?.metrics?.seats?.blocked || 0} maintenance
                  </div>
                </div>

                {/* Books & Physical Copies */}
                <div className="light-card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #059669' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>Book Inventory</span>
                    <BookOpen size={18} color="#059669" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
                    {overviewData?.metrics?.books?.available_copies || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>/ {overviewData?.metrics?.books?.total_copies || 0} copies</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                    {overviewData?.metrics?.books?.total_titles || 0} unique titles in catalogue
                  </div>
                </div>

                {/* Active & Overdue Loans */}
                <div className="light-card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #d97706' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>Active Borrowings</span>
                    <ArrowRightLeft size={18} color="#d97706" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
                    {overviewData?.metrics?.books?.active_loans || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>on loan</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: overviewData?.metrics?.books?.overdue_loans > 0 ? '#b91c1c' : '#475569', fontWeight: overviewData?.metrics?.books?.overdue_loans > 0 ? 700 : 500 }}>
                    {overviewData?.metrics?.books?.overdue_loans || 0} overdue loans (₹{overviewData?.metrics?.books?.pending_fines || 0} fines)
                  </div>
                </div>

                {/* Discussion Rooms */}
                <div className="light-card" style={{ padding: '1.1rem 1.25rem', borderLeft: '4px solid #7c3aed' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>Discussion Rooms</span>
                    <MessageSquare size={18} color="#7c3aed" />
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0' }}>
                    {overviewData?.metrics?.rooms?.pending_requests || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>pending approval</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                    4 total rooms • {overviewData?.metrics?.rooms?.approved_bookings || 0} approved bookings
                  </div>
                </div>
              </div>

              {/* Quick Action Banner */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 14px rgba(37,99,235,0.2)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Daily Seat Operational Reset Ready</h3>
                  <p style={{ fontSize: '0.82rem', margin: 0, opacity: 0.9 }}>
                    Automatically expires past session reservations, preserves permanent 360-seat floor layouts, and maintains complete historical audit records.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowResetModal(true)}
                    style={{ background: '#ffffff', color: '#1e3a8a', border: 'none', borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RotateCcw size={14} />
                    <span>Run Operational Reset</span>
                  </button>
                  <button
                    onClick={() => setShowIssueModal(true)}
                    style={{ background: '#3b82f6', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} />
                    <span>Quick Issue Book</span>
                  </button>
                </div>
              </div>

              {/* Two Column Grid: Pending Room Requests & Recent Audit Logs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
                {/* Pending Room Requests */}
                <div className="light-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={17} color="#2563eb" />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Pending Discussion Room Requests</h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('ROOM_REQUESTS')}
                      style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View All →
                    </button>
                  </div>

                  {overviewData?.recent_room_requests?.filter(r => r.status === 'PENDING').length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                      No pending room booking requests at this time.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {overviewData?.recent_room_requests?.filter(r => r.status === 'PENDING').map(req => (
                        <div key={req._id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{req.club_name} — {req.room?.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Rep: {req.user?.name} ({req.user?.roll_number}) • {req.booking_date} (Session {req.session_number})
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>"{req.purpose}"</div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => { setRoomDecisionModal({ request: req, action: 'APPROVE' }); setAdminRemarks('Approved by Librarian'); }}
                              style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setRoomDecisionModal({ request: req, action: 'REJECT' }); setAdminRemarks(''); }}
                              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Administrative Activity Log */}
                <div className="light-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={17} color="#4338ca" />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Recent Activity & Audit Log</h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('AUDIT_LOGS')}
                      style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View All →
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {overviewData?.recent_activity?.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                        No recorded administrative actions yet today.
                      </div>
                    ) : (
                      overviewData?.recent_activity?.slice(0, 5).map(log => (
                        <div key={log._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            background: log.category === 'SEAT' ? '#eff6ff' : log.category === 'BOOK' ? '#f0fdf4' : '#faf5ff',
                            color: log.category === 'SEAT' ? '#1d4ed8' : log.category === 'BOOK' ? '#15803d' : '#7e22ce'
                          }}>
                            {log.action}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#0f172a', fontWeight: 600 }}>{log.target_description}</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>By {log.actor_name} • {new Date(log.createdAt).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 2: SEAT RESERVATION MANAGEMENT (TABLE & FILTERS)
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'SEATS_TABLE' && (
            <div className="light-card" style={{ padding: '1.25rem' }}>
              {/* Filter Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem 0.6rem' }}>
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Search student, roll, or seat..."
                      value={seatSearch}
                      onChange={(e) => setSeatSearch(e.target.value)}
                      style={{ border: 'none', outline: 'none', fontSize: '0.78rem', width: '180px' }}
                    />
                  </div>

                  <select
                    value={seatFloorFilter}
                    onChange={(e) => setSeatFloorFilter(e.target.value)}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                  >
                    <option value="ALL">All Floors</option>
                    <option value="1">Floor 1</option>
                    <option value="2">Floor 2</option>
                    <option value="3">Floor 3</option>
                  </select>

                  <select
                    value={seatZoneFilter}
                    onChange={(e) => setSeatZoneFilter(e.target.value)}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                  >
                    <option value="ALL">All Zones</option>
                    <option value="BOYS">Boys Zone (Blue)</option>
                    <option value="GIRLS">Girls Zone (Pink)</option>
                  </select>

                  <select
                    value={seatStatusFilter}
                    onChange={(e) => setSeatStatusFilter(e.target.value)}
                    style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                  >
                    <option value="CONFIRMED">Active Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="COMPLETED">Completed (Historical)</option>
                    <option value="ALL">All Statuses</option>
                  </select>
                </div>

                <button
                  onClick={loadSeatReservations}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Apply Filters
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Seat Number</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Floor & Zone</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Date & Session</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Student Name</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Roll Number</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Department</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seatReservations.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          No reservations match the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      seatReservations.map(res => (
                        <tr key={res._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>
                            {res.seat?.seat_number}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            Floor {res.seat?.floor_number} • <span style={{ color: res.seat?.zone === 'BOYS' ? '#2563eb' : '#ec4899', fontWeight: 600 }}>{res.seat?.zone}</span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            {res.booking_date} (Session {res.session_number})
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>
                            {res.user?.name || '—'}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                            {res.user?.roll_number || '—'}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                            {res.user?.department || '—'}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: res.status === 'CONFIRMED' ? '#dcfce7' : res.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                              color: res.status === 'CONFIRMED' ? '#15803d' : res.status === 'CANCELLED' ? '#b91c1c' : '#475569'
                            }}>
                              {res.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            {res.status === 'CONFIRMED' && (
                              <button
                                onClick={() => {
                                  setCancelBookingModal({
                                    booking_id: res._id,
                                    seat_number: res.seat?.seat_number,
                                    student_name: res.user?.name
                                  });
                                  setCancellationReason('');
                                }}
                                style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Cancel Seat
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 3: INTERACTIVE FLOOR MAP LAYOUT (LIBRARIAN VIEW)
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'FLOOR_MAP' && (
            <div>
              {/* Floor Selector Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', background: '#fff', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Select Floor:</span>
                  {[1, 2, 3].map(f => (
                    <button
                      key={f}
                      onClick={() => setMapFloor(f)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: mapFloor === f ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: mapFloor === f ? '#eff6ff' : '#ffffff',
                        color: mapFloor === f ? '#1d4ed8' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Floor {f}
                    </button>
                  ))}
                </div>

                {/* Map Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem' }}>
                  <span>Total: <strong>{mapLayout?.stats?.total || 120}</strong></span>
                  <span style={{ color: '#16a34a' }}>Available: <strong>{mapLayout?.stats?.available || 0}</strong></span>
                  <span style={{ color: '#2563eb' }}>Reserved: <strong>{mapLayout?.stats?.reserved || 0}</strong></span>
                  <span style={{ color: '#d97706' }}>Blocked: <strong>{mapLayout?.stats?.blocked || 0}</strong></span>
                </div>
              </div>

              {/* Two Wing Floor Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Boys Wing (Left) */}
                <div className="light-card" style={{ padding: '1.25rem', borderTop: '4px solid #2563eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e3a8a' }}>Boys Seating Wing (West)</h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>60 Seats</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                    {mapLayout?.boys_wing?.map(seat => {
                      const isReserved = seat.state === 'RESERVED';
                      const isBlocked = seat.state === 'MAINTENANCE';
                      return (
                        <div
                          key={seat._id}
                          onClick={() => setSelectedSeatDetails(seat)}
                          style={{
                            padding: '0.4rem 0.2rem',
                            borderRadius: '6px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: isBlocked ? '#fef3c7' : isReserved ? '#eff6ff' : '#ffffff',
                            border: `1.5px solid ${isBlocked ? '#f59e0b' : isReserved ? '#2563eb' : '#cbd5e1'}`,
                            color: isBlocked ? '#b45309' : isReserved ? '#1e40af' : '#475569',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                          title={`Seat: ${seat.seat_number}\nStatus: ${seat.state}${seat.student ? `\nStudent: ${seat.student.name} (${seat.student.roll_number})` : ''}`}
                        >
                          <div>{seat.seat_number.split('-').pop()}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>{isBlocked ? 'BLOCKED' : isReserved ? 'BOOKED' : 'OPEN'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Girls Wing (Right) */}
                <div className="light-card" style={{ padding: '1.25rem', borderTop: '4px solid #ec4899' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#9d174d' }}>Girls Seating Wing (East)</h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>60 Seats</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                    {mapLayout?.girls_wing?.map(seat => {
                      const isReserved = seat.state === 'RESERVED';
                      const isBlocked = seat.state === 'MAINTENANCE';
                      return (
                        <div
                          key={seat._id}
                          onClick={() => setSelectedSeatDetails(seat)}
                          style={{
                            padding: '0.4rem 0.2rem',
                            borderRadius: '6px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: isBlocked ? '#fef3c7' : isReserved ? '#fdf2f8' : '#ffffff',
                            border: `1.5px solid ${isBlocked ? '#f59e0b' : isReserved ? '#ec4899' : '#cbd5e1'}`,
                            color: isBlocked ? '#b45309' : isReserved ? '#be185d' : '#475569',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                          title={`Seat: ${seat.seat_number}\nStatus: ${seat.state}${seat.student ? `\nStudent: ${seat.student.name} (${seat.student.roll_number})` : ''}`}
                        >
                          <div>{seat.seat_number.split('-').pop()}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>{isBlocked ? 'BLOCKED' : isReserved ? 'BOOKED' : 'OPEN'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Seat Inspection Drawer (Bottom or Modal) */}
              {selectedSeatDetails && (
                <div style={{ marginTop: '1.25rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Seat: {selectedSeatDetails.seat_number}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: selectedSeatDetails.state === 'RESERVED' ? '#eff6ff' : selectedSeatDetails.state === 'MAINTENANCE' ? '#fef3c7' : '#f0fdf4',
                        color: selectedSeatDetails.state === 'RESERVED' ? '#1d4ed8' : selectedSeatDetails.state === 'MAINTENANCE' ? '#b45309' : '#15803d'
                      }}>
                        {selectedSeatDetails.state}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Floor {selectedSeatDetails.floor_number} • {selectedSeatDetails.zone} Zone • Table: {selectedSeatDetails.table_number} ({selectedSeatDetails.table_type})
                    </div>
                    {selectedSeatDetails.student && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#1e293b' }}>
                        Booked by: <strong>{selectedSeatDetails.student.name}</strong> ({selectedSeatDetails.student.roll_number}) • {selectedSeatDetails.student.email}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedSeatDetails.state === 'RESERVED' && selectedSeatDetails.booking_id && (
                      <button
                        onClick={() => {
                          setCancelBookingModal({
                            booking_id: selectedSeatDetails.booking_id,
                            seat_number: selectedSeatDetails.seat_number,
                            student_name: selectedSeatDetails.student?.name
                          });
                        }}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel Reservation
                      </button>
                    )}

                    {selectedSeatDetails.status === 'MAINTENANCE' ? (
                      <button
                        onClick={() => handleToggleSeatBlock(selectedSeatDetails._id, 'ACTIVE')}
                        style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Unblock Seat (Set Active)
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setBlockSeatModal({
                            seat_id: selectedSeatDetails._id,
                            seat_number: selectedSeatDetails.seat_number,
                            current_status: selectedSeatDetails.status
                          });
                        }}
                        style={{ background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Block for Maintenance
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedSeatDetails(null)}
                      style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 4: DAILY SEAT RESET & AVAILABILITY MECHANISM
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'DAILY_RESET' && (
            <div className="light-card" style={{ padding: '1.75rem', maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <RotateCcw size={28} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Daily Seat Availability Reset</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '600px', margin: '0.35rem auto 0' }}>
                  BITSathy library operating policy mandates automatic seat reset for daily operating hours while preserving 100% of historical audit logs and permanent layouts.
                </p>
              </div>

              {/* Core Policies Compliance Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.65rem' }}>
                  Audit & Operational Guarantee Checklist:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span><strong>Permanent Layout Preserved:</strong> All 360 physical seats across Floors 1, 2, and 3 remain untouched.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span><strong>Zero Data Loss:</strong> Expired bookings transition from <code>CONFIRMED</code> to <code>COMPLETED</code>; no database records are deleted.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span><strong>Maintenance Lock:</strong> Seats blocked for repairs remain blocked until explicitly unblocked by library staff.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span><strong>Automated Background Job:</strong> Runs hourly to sync slots and at 11:59 PM daily to prepare the next operational day.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <span><strong>Idempotency:</strong> Can be triggered repeatedly without risk of double-processing or corrupting future bookings.</span>
                  </div>
                </div>
              </div>

              {/* Action Trigger Card */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e3a8a' }}>Manual Reset for: {selectedDate}</div>
                  <div style={{ fontSize: '0.76rem', color: '#475569' }}>Trigger an immediate operational availability pass for the selected date.</div>
                </div>
                <button
                  onClick={handleTriggerDailyReset}
                  disabled={resetting}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: resetting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={15} />
                  <span>{resetting ? 'Executing Reset...' : 'Trigger Operational Reset Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 5: BOOK CATALOGUE MANAGEMENT
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'CATALOGUE' && (
            <div className="light-card" style={{ padding: '1.25rem' }}>
              {/* Header and Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.65rem' }}>
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Search title, author, ISBN..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.78rem', width: '220px' }}
                    />
                  </div>

                  <select
                    value={bookCategoryFilter}
                    onChange={(e) => setBookCategoryFilter(e.target.value)}
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                    ))}
                  </select>

                  <button
                    onClick={loadBooks}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Filter
                  </button>
                </div>

                <button
                  onClick={() => setShowAddBookModal(true)}
                  style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Add New Book to Catalogue</span>
                </button>
              </div>

              {/* Books List Grid / Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Book Details</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Category</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>ISBN</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Total Copies</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Available</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>On Loan</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Management</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booksList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          No books found.
                        </td>
                      </tr>
                    ) : (
                      booksList.map(b => (
                        <tr key={b._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.title}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>By {b.author} • {b.publisher} ({b.publication_year})</div>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', color: '#334155', fontWeight: 600 }}>
                              {b.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {b.isbn}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>
                            {b.total_copies}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#16a34a', fontWeight: 700 }}>
                            {b.available_copies}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#2563eb', fontWeight: 700 }}>
                            {b.borrowed_copies}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => setManageCopiesModal(b)}
                                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Copies ({b.total_copies})
                              </button>
                              <button
                                onClick={() => setEditBookModal(b)}
                                style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 6: CIRCULATION DESK (ISSUE & RETURN)
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'CIRCULATION' && (
            <div>
              {/* Quick Actions Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Issue Book Action Card */}
                <div className="light-card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a' }}>Issue Book to Student</h3>
                    <button
                      onClick={() => setShowIssueModal(true)}
                      style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Open Issue Form
                    </button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    Enter student register/roll number and physical book barcode. Automatically enforces 3-book maximum limit, overdue fine checks, and issues standard 14-day loan.
                  </p>
                </div>

                {/* Quick Return by Barcode Card */}
                <div className="light-card" style={{ padding: '1.25rem', borderLeft: '4px solid #059669' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#065f46', marginBottom: '0.65rem' }}>Quick Return by Barcode</h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Scan or enter book barcode (e.g. BIT-CO-101-01)..."
                      value={returnBarcode}
                      onChange={(e) => setReturnBarcode(e.target.value)}
                      style={{ flex: 1, padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none' }}
                    />
                    <button
                      onClick={() => { if (returnBarcode) handleReturnBook(returnBarcode); }}
                      style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Process Return
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Loans Table */}
              <div className="light-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>All Active & Historical Loans</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={loanStatusFilter}
                      onChange={(e) => setLoanStatusFilter(e.target.value)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                    >
                      <option value="ALL">All Loans</option>
                      <option value="ISSUED">Active Issued</option>
                      <option value="OVERDUE">Overdue Only</option>
                      <option value="RETURNED">Returned (History)</option>
                    </select>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Book Title & Barcode</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Student Name</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Roll Number</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Issue Date</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Due Date</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loansList.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                            No loans found.
                          </td>
                        </tr>
                      ) : (
                        loansList.map(loan => (
                          <tr key={loan._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{loan.book?.title}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{loan.copy?.barcode}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>
                              {loan.user?.name}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                              {loan.user?.roll_number}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                              {new Date(loan.issue_date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', color: loan.status === 'OVERDUE' ? '#b91c1c' : '#0f172a', fontWeight: loan.status === 'OVERDUE' ? 700 : 500 }}>
                              {new Date(loan.due_date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: loan.status === 'RETURNED' ? '#f1f5f9' : loan.status === 'OVERDUE' ? '#fee2e2' : '#dbeafe',
                                color: loan.status === 'RETURNED' ? '#475569' : loan.status === 'OVERDUE' ? '#b91c1c' : '#1d4ed8'
                              }}>
                                {loan.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                              {loan.status !== 'RETURNED' && (
                                <button
                                  onClick={() => handleReturnBook(loan._id, true)}
                                  style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Record Return
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 7: OVERDUE BOOKS & FINE COLLECTIONS
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'OVERDUE' && (
            <div className="light-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>Overdue Books Tracking</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>College lending policy: ₹2.00 per day fine for late returns.</p>
                </div>
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 800, color: '#991b1b' }}>
                  Total Overdue Titles: {overdueList.length}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#fee2e2', borderBottom: '2px solid #fca5a5', color: '#991b1b' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Title & Barcode</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Student Name</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Roll Number</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Due Date</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Days Overdue</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Fine Accrued</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#15803d' }}>
                          <CheckCircle2 size={28} color="#15803d" style={{ margin: '0 auto 0.5rem' }} />
                          All library book loans are currently in good standing!
                        </td>
                      </tr>
                    ) : (
                      overdueList.map(loan => (
                        <tr key={loan._id} style={{ borderBottom: '1px solid #fee2e2' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>
                            {loan.book?.title}
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Barcode: {loan.copy?.barcode}</div>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>{loan.user?.name}</td>
                          <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)' }}>{loan.user?.roll_number}</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#b91c1c' }}>{new Date(loan.due_date).toLocaleDateString()}</td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#b91c1c' }}>{loan.days_overdue} days</td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#b91c1c' }}>₹{loan.fine_amount}</td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleReturnBook(loan._id, true)}
                              style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Collect & Return
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 8 & 9: DISCUSSION ROOM REQUESTS & SCHEDULES
          ────────────────────────────────────────────────────────── */}
          {(activeSection === 'ROOM_REQUESTS' || activeSection === 'ROOM_SCHEDULE') && (
            <div className="light-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {activeSection === 'ROOM_REQUESTS' ? 'Pending Room Approval Requests' : 'All Discussion Room Schedules'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>4 Group discussion rooms (Ramanujan, Kalam, Sarabhai, Visvesvaraya)</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={roomFilterStatus}
                    onChange={(e) => setRoomFilterStatus(e.target.value)}
                    style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved Bookings</option>
                    <option value="REJECTED">Rejected Requests</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Room Name</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Club / Community</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Student Representative</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Date & Session</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Attendees</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Purpose</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRequests.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          No room booking requests found for this filter.
                        </td>
                      </tr>
                    ) : (
                      roomRequests.map(req => (
                        <tr key={req._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>
                            {req.room?.name}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#4338ca' }}>
                            {req.club_name}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <div>{req.user?.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{req.user?.roll_number}</div>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            {req.booking_date} (Session {req.session_number})
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            {req.attendees_count} / {req.room?.capacity}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.purpose}>
                            {req.purpose}
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: req.status === 'APPROVED' ? '#dcfce7' : req.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                              color: req.status === 'APPROVED' ? '#15803d' : req.status === 'PENDING' ? '#b45309' : '#b91c1c'
                            }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                            {req.status === 'PENDING' && (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  onClick={() => { setRoomDecisionModal({ request: req, action: 'APPROVE' }); setAdminRemarks('Approved by Librarian'); }}
                                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => { setRoomDecisionModal({ request: req, action: 'REJECT' }); setAdminRemarks(''); }}
                                  style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 10: STUDENT RECORDS DIRECTORY
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'STUDENTS' && (
            <div className="light-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Registered Students Directory</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.65rem' }}>
                  <Search size={14} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Search by name, roll, or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.78rem', width: '220px' }}
                  />
                  <button onClick={loadStudents} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer' }}>Search</button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Student Name</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Roll Number</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Department & Year</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Institutional Email</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Active Seats</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Borrowed Books</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Pending Fines</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map(st => (
                      <tr key={st._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>{st.name}</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{st.roll_number}</td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>{st.department} (Yr {st.year})</td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>{st.email}</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{st.active_seats_count}</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: st.active_loans_count > 0 ? '#2563eb' : '#475569' }}>{st.active_loans_count} / 3</td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: st.pending_fines > 0 ? '#b91c1c' : '#16a34a' }}>₹{st.pending_fines}</td>
                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenStudentDrilldown(st._id)}
                            style={{ background: '#f1f5f9', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            View Record
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 11: AUDIT LOGS & NOTIFICATIONS
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'AUDIT_LOGS' && (
            <div className="light-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>System Audit Trail & Administrative History</h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Records all administrative cancellations, approvals, book issues, returns, and resets.</p>
                </div>
                <select
                  value={auditCategoryFilter}
                  onChange={(e) => setAuditCategoryFilter(e.target.value)}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="SEAT">Seat Operations</option>
                  <option value="BOOK">Book Circulation</option>
                  <option value="ROOM">Discussion Rooms</option>
                  <option value="SYSTEM">System Automations</option>
                </select>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Timestamp</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Action</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Target Description</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Actor</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Reason / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#1d4ed8'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>
                          {log.target_description}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          {log.actor_name} ({log.actor_role})
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#475569', fontStyle: 'italic' }}>
                          {log.reason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 12: OPERATIONAL REPORTS & METRICS
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'REPORTS' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                {reportsData?.floors?.map(f => (
                  <div key={f.floor_number} className="light-card" style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Floor {f.floor_number} Occupancy</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                      {f.occupancy_rate}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                      {f.booked_today} booked / {f.total_seats} seats total
                    </div>
                    <div style={{ marginTop: '0.5rem', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${f.occupancy_rate}%`, background: '#2563eb' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Circulation Breakdown */}
              <div className="light-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem' }}>
                  Circulation Breakdown by Book Category
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  {reportsData?.categories && Object.entries(reportsData.categories).map(([cat, stats]) => (
                    <div key={cat} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{cat}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                        Total Issues: <strong>{stats.total_issues}</strong> • Active: <strong style={{ color: '#2563eb' }}>{stats.active}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODALS & ADMINISTRATIVE ACTION FORMS
      ───────────────────────────────────────────────────────────── */}
      {/* 1. Cancel Seat Reservation Modal */}
      {cancelBookingModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
              Cancel Seat Reservation
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
              You are administratively cancelling Seat <strong>{cancelBookingModal.seat_number}</strong> booked by <strong>{cancelBookingModal.student_name}</strong>.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Reason for Cancellation (will be notified to student):
              </label>
              <textarea
                rows="3"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Table maintenance scheduled, operational reallocation..."
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem', fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setCancelBookingModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelSeatBooking}
                disabled={actionLoading}
                style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Block Seat Modal */}
      {blockSeatModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#d97706', marginBottom: '0.5rem' }}>
              Block Seat for Maintenance
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
              Block Seat <strong>{blockSeatModal.seat_number}</strong>. This removes it from available pool until explicitly unblocked. Any existing active bookings for today will be safely cancelled and refunded.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Maintenance Reason / Description:
              </label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Broken chair wheel, power socket repair..."
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem', fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setBlockSeatModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleSeatBlock(blockSeatModal.seat_id, 'MAINTENANCE')}
                disabled={actionLoading}
                style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {actionLoading ? 'Processing...' : 'Block Seat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Daily Reset Confirmation Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '480px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '0.5rem' }}>
              Confirm Operational Daily Seat Reset
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.45 }}>
              This operational action updates past session reservations on <strong>{selectedDate}</strong> to status <code>COMPLETED</code>.
              <br /><br />
              • No physical seats are removed (all 360 remain active).<br />
              • Student accounts & book circulation records remain completely untouched.<br />
              • All historical data is preserved for audit trail.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowResetModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerDailyReset}
                disabled={resetting}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {resetting ? 'Resetting...' : 'Confirm & Run Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Book Modal */}
      {showAddBookModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Add New Book to Catalogue
              </h3>
              <button onClick={() => setShowAddBookModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBook}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, marginBottom: '3px' }}>ISBN *</label>
                  <input
                    type="text"
                    required
                    value={newBookForm.isbn}
                    onChange={(e) => setNewBookForm({ ...newBookForm, isbn: e.target.value })}
                    placeholder="978-013..."
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, marginBottom: '3px' }}>Category *</label>
                  <input
                    type="text"
                    required
                    value={newBookForm.category}
                    onChange={(e) => setNewBookForm({ ...newBookForm, category: e.target.value })}
                    placeholder="Computer Science, AI, Mechanical..."
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, marginBottom: '3px' }}>Title *</label>
                <input
                  type="text"
                  required
                  value={newBookForm.title}
                  onChange={(e) => setNewBookForm({ ...newBookForm, title: e.target.value })}
                  placeholder="e.g. Distributed Systems: Concepts and Design"
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, marginBottom: '3px' }}>Author(s) *</label>
                  <input
                    type="text"
                    required
                    value={newBookForm.author}
                    onChange={(e) => setNewBookForm({ ...newBookForm, author: e.target.value })}
                    placeholder="e.g. George Coulouris"
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, marginBottom: '3px' }}>Copies to Create</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newBookForm.copies_count}
                    onChange={(e) => setNewBookForm({ ...newBookForm, copies_count: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Saving...' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Issue Book Modal */}
      {showIssueModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
                Issue Book at Circulation Desk
              </h3>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleIssueBook}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '4px' }}>Student Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7376231IT101 or GOWTHAM"
                  value={issueForm.roll_number}
                  onChange={(e) => setIssueForm({ ...issueForm, roll_number: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '4px' }}>Book Physical Barcode *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BIT-AR-e581-01"
                  value={issueForm.barcode}
                  onChange={(e) => setIssueForm({ ...issueForm, barcode: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '4px' }}>Loan Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={issueForm.lending_days}
                  onChange={(e) => setIssueForm({ ...issueForm, lending_days: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Issuing...' : 'Issue Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Room Decision Modal (Approve / Reject) */}
      {roomDecisionModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: roomDecisionModal.action === 'APPROVE' ? '#15803d' : '#b91c1c', marginBottom: '0.5rem' }}>
              {roomDecisionModal.action === 'APPROVE' ? 'Approve Discussion Room Request' : 'Reject Discussion Room Request'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
              Room: <strong>{roomDecisionModal.request?.room?.name}</strong> for <strong>"{roomDecisionModal.request?.club_name}"</strong> on {roomDecisionModal.request?.booking_date}.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Librarian Remarks / Reason (notified to student):
              </label>
              <textarea
                rows="3"
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder={roomDecisionModal.action === 'APPROVE' ? 'e.g. Approved. Please maintain cleanliness.' : 'e.g. Room booked for another club, exceeds capacity...'}
                style={{ width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0.5rem', fontSize: '0.82rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setRoomDecisionModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRoomDecision}
                disabled={actionLoading}
                style={{
                  background: roomDecisionModal.action === 'APPROVE' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Processing...' : `Confirm ${roomDecisionModal.action === 'APPROVE' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Student Drilldown Modal */}
      {selectedStudentDrilldown && studentDetailsData && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px', padding: '1.75rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {studentDetailsData.student?.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Roll: <strong>{studentDetailsData.student?.roll_number}</strong> • Dept: {studentDetailsData.student?.department} • Email: {studentDetailsData.student?.email}
                </div>
              </div>
              <button onClick={() => { setSelectedStudentDrilldown(null); setStudentDetailsData(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Active Seats */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem' }}>Active Seat Bookings ({studentDetailsData.seats?.filter(s => s.status === 'CONFIRMED').length})</h4>
              {studentDetailsData.seats?.filter(s => s.status === 'CONFIRMED').length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No active confirmed seat passes.</div>
              ) : (
                studentDetailsData.seats?.filter(s => s.status === 'CONFIRMED').map(s => (
                  <div key={s._id} style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Seat <strong>{s.seat?.seat_number}</strong> on {s.booking_date} (Session {s.session_number})</span>
                    <span style={{ color: '#15803d', fontWeight: 700 }}>Active</span>
                  </div>
                ))
              )}
            </div>

            {/* Book Loans */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065f46', marginBottom: '0.5rem' }}>Book Loans History ({studentDetailsData.loans?.length})</h4>
              {studentDetailsData.loans?.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No book borrowing history.</div>
              ) : (
                studentDetailsData.loans?.map(l => (
                  <div key={l._id} style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>"{l.book?.title}" (Due: {new Date(l.due_date).toLocaleDateString()})</span>
                    <span style={{ fontWeight: 700, color: l.status === 'RETURNED' ? '#64748b' : l.status === 'OVERDUE' ? '#b91c1c' : '#2563eb' }}>{l.status}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={() => { setSelectedStudentDrilldown(null); setStudentDetailsData(null); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
