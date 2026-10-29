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
  FileText,
  Calendar,
  Wrench,
  Ban,
  Bookmark,
  GraduationCap,
  Download,
  Upload,
  Sparkles
} from 'lucide-react';


export default function LibrarianPortal({ user, token, onSwitchToStudentView, onLogout, showMessage }) {
  // Navigation State (12 sections)
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

  // Digital Resources Management State
  const [digitalList, setDigitalList] = useState([]);
  const [digitalStats, setDigitalStats] = useState({ total: 0, published: 0, draft: 0, archived: 0, views: 0, downloads: 0, bookmarks: 0 });
  const [digitalSearch, setDigitalSearch] = useState('');
  const [digitalCatFilter, setDigitalCatFilter] = useState('ALL');
  const [digitalDeptFilter, setDigitalDeptFilter] = useState('ALL');
  const [digitalTypeFilter, setDigitalTypeFilter] = useState('ALL');
  const [digitalStatusFilter, setDigitalStatusFilter] = useState('ALL');
  const [digitalSortBy, setDigitalSortBy] = useState('recent');
  const [digitalPage, setDigitalPage] = useState(1);
  const [digitalTotalPages, setDigitalTotalPages] = useState(1);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [deleteResourceModal, setDeleteResourceModal] = useState(null);
  const [resourceSourceMode, setResourceSourceMode] = useState('FILE'); // 'FILE' | 'URL'
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    author: '',
    publisher: '',
    category: 'E-books and Textbooks',
    subject: 'Computer Science',
    department: 'Computer Science and Engineering',
    resource_type: 'PDF',
    publication_year: new Date().getFullYear(),
    external_url: '',
    access_type: 'INSTITUTIONAL',
    publication_status: 'PUBLISHED',
    tags: ''
  });
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [resourceFormError, setResourceFormError] = useState('');


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
    } else if (activeSection === 'DIGITAL_RESOURCES') {
      loadDigitalResources();
    }
  }, [
    activeSection, selectedDate, selectedSession, token, mapFloor,
    digitalSearch, digitalCatFilter, digitalDeptFilter, digitalTypeFilter, digitalStatusFilter, digitalSortBy, digitalPage
  ]);


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
      status: seatStatusFilter,
      floor_number: seatFloorFilter,
      zone: seatZoneFilter,
      search: seatSearch
    });
    fetch(`/api/librarian/seats?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setSeatReservations(data.reservations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 3. Map Layout Loader
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
  const handleCancelReservation = async (e) => {
    e.preventDefault();
    if (!cancelBookingModal) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/librarian/seats/cancel', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          booking_id: cancelBookingModal.booking_id,
          reason: cancellationReason.trim() || 'Cancelled by Librarian for academic floor maintenance'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to cancel reservation.');
        setActionLoading(false);
        return;
      }
      showMessage('success', 'Reservation cancelled. Student notified.');
      setCancelBookingModal(null);
      setCancellationReason('');
      setSelectedSeatDetails(null);
      loadSeatReservations();
      if (activeSection === 'FLOOR_MAP') loadMapLayout();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // 5. Block / Unblock Seat Toggle
  const handleToggleBlock = async (seatId, currentStatus, reason) => {
    setActionLoading(true);
    const newStatus = currentStatus === 'MAINTENANCE' ? 'ACTIVE' : 'MAINTENANCE';
    try {
      const res = await fetch('/api/librarian/seats/block', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          seat_id: seatId,
          status: newStatus,
          reason: reason || 'Scheduled physical desk/socket maintenance'
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
      loadMapLayout();
      loadSeatReservations();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // 6. Daily Reset Trigger
  const handleDailyReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/librarian/seats/daily-reset', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ target_date: selectedDate })
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
      loadSeatReservations();
      loadMapLayout();
    } catch {
      showMessage('error', 'Network error.');
    }
    setResetting(false);
  };

  // 7. Books Loaders & CRUD
  const loadBooks = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (bookSearch.trim()) params.append('search', bookSearch.trim());
    if (bookCategoryFilter && bookCategoryFilter !== 'ALL') params.append('category', bookCategoryFilter);
    fetch(`/api/librarian/books?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setBooksList(data.books || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

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

  const handleAddCopies = async (e) => {
    e.preventDefault();
    if (!manageCopiesModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/librarian/books/${manageCopiesModal._id}/copies`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ count: addCopiesCount, shelf_location: 'GEN-01' })
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
      if (manageCopiesModal) {
        setManageCopiesModal(prev => ({
          ...prev,
          copies: prev.copies.map(c => c._id === copyId ? { ...c, status: newStatus } : c)
        }));
      }
    } catch {
      showMessage('error', 'Network error.');
    }
  };

  // 8. Circulation (Issue & Return)
  const loadLoans = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (loanStatusFilter && loanStatusFilter !== 'ALL') params.append('status', loanStatusFilter);
    if (loanSearch.trim()) params.append('search', loanSearch.trim());
    fetch(`/api/librarian/circulation/loans?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setLoansList(data.loans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

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
        body: JSON.stringify({
          roll_number: issueForm.roll_number.trim(),
          barcode: issueForm.barcode.trim(),
          loan_period_days: issueForm.lending_days
        })
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
      loadOverview();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  const handleReturnBook = async (barcodeToReturn) => {
    const code = barcodeToReturn || returnBarcode;
    if (!code.trim()) {
      showMessage('warning', 'Please enter a valid book copy barcode.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/librarian/circulation/return', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ barcode: code.trim() })
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
      loadOverview();
      if (activeSection === 'OVERDUE') loadOverdue();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // 9. Overdue
  const loadOverdue = () => {
    setLoading(true);
    fetch('/api/librarian/circulation/overdue', { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setOverdueList(data.overdue_loans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 10. Discussion Rooms
  const loadRoomRequests = () => {
    setLoading(true);
    const params = new URLSearchParams({
      date: selectedDate,
      status: roomFilterStatus
    });
    fetch(`/api/librarian/rooms/requests?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setRoomRequests(data.requests || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleReviewRoomRequest = async (e) => {
    e.preventDefault();
    if (!roomDecisionModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/librarian/rooms/requests/${roomDecisionModal.request._id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          action: roomDecisionModal.action,
          admin_remarks: adminRemarks.trim() || (roomDecisionModal.action === 'APPROVE' ? 'Approved by Librarian' : 'Rejected due to schedule conflict')
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
      loadOverview();
    } catch {
      showMessage('error', 'Network error.');
    }
    setActionLoading(false);
  };

  // 11. Students Directory
  const loadStudents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (studentSearch.trim()) params.append('search', studentSearch.trim());
    fetch(`/api/librarian/students?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setStudentsList(data.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleOpenStudentDrilldown = (studentId) => {
    setSelectedStudentDrilldown(studentId);
    setStudentDetailsData(null);
    fetch(`/api/librarian/students/${studentId}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => setStudentDetailsData(data));
  };

  // 12. Audit Logs
  const loadAuditLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (auditCategoryFilter && auditCategoryFilter !== 'ALL') params.append('category', auditCategoryFilter);
    fetch(`/api/librarian/audit-logs?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setAuditLogs(data.audit_logs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // 13. Reports
  const loadReports = () => {
    setLoading(true);
    fetch('/api/librarian/reports', { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setReportsData(data.reports);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // ==============================================================
  // PHYSICAL FLOOR MAP TABLE GROUPING (MATCHES SEAT BOOKING PAGE)
  // ==============================================================
  const groupIntoTables = (seatsList = []) => {
    const tableMap = new Map();
    seatsList.forEach(s => {
      if (!tableMap.has(s.table_number)) {
        tableMap.set(s.table_number, {
          table_number: s.table_number,
          table_type: s.table_type,
          row_index: s.row_index,
          col_index: s.col_index,
          seats: []
        });
      }
      tableMap.get(s.table_number).seats.push(s);
    });
    return Array.from(tableMap.values()).sort((a, b) => {
      if (a.col_index !== b.col_index) return a.col_index - b.col_index;
      return a.row_index - b.row_index;
    });
  };

  // ==========================================
  // DIGITAL RESOURCE MANAGEMENT HANDLERS
  // ==========================================
  const loadDigitalResources = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: digitalPage,
      limit: 15,
      sort_by: digitalSortBy
    });
    if (digitalSearch.trim()) params.append('search', digitalSearch.trim());
    if (digitalCatFilter !== 'ALL') params.append('category', digitalCatFilter);
    if (digitalDeptFilter !== 'ALL') params.append('department', digitalDeptFilter);
    if (digitalTypeFilter !== 'ALL') params.append('resource_type', digitalTypeFilter);
    if (digitalStatusFilter !== 'ALL') params.append('publication_status', digitalStatusFilter);

    fetch(`/api/librarian/digital-resources?${params.toString()}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        if (data.resources) {
          setDigitalList(data.resources);
          setDigitalTotalPages(data.total_pages || 1);
          if (data.stats) setDigitalStats(data.stats);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load digital resources:', err);
        setLoading(false);
      });
  };

  const handleOpenAddResource = () => {
    setEditingResource(null);
    setResourceSourceMode('FILE');
    setSelectedUploadFile(null);
    setResourceFormError('');
    setResourceForm({
      title: '',
      description: '',
      author: '',
      publisher: 'Bannari Amman Institute of Technology',
      category: 'E-books and Textbooks',
      subject: 'Computer Science',
      department: 'Computer Science and Engineering',
      resource_type: 'PDF',
      publication_year: new Date().getFullYear(),
      external_url: '',
      access_type: 'INSTITUTIONAL',
      publication_status: 'PUBLISHED',
      tags: ''
    });
    setShowResourceModal(true);
  };

  const handleOpenEditResource = (resource) => {
    setEditingResource(resource);
    setResourceSourceMode(resource.external_url ? 'URL' : 'FILE');
    setSelectedUploadFile(null);
    setResourceFormError('');
    setResourceForm({
      title: resource.title || '',
      description: resource.description || '',
      author: resource.author || '',
      publisher: resource.publisher || '',
      category: resource.category || 'E-books and Textbooks',
      subject: resource.subject || 'General',
      department: resource.department || 'All Departments',
      resource_type: resource.resource_type || 'PDF',
      publication_year: resource.publication_year || new Date().getFullYear(),
      external_url: resource.external_url || '',
      access_type: resource.access_type || 'INSTITUTIONAL',
      publication_status: resource.publication_status || 'PUBLISHED',
      tags: Array.isArray(resource.tags) ? resource.tags.join(', ') : (resource.tags || '')
    });
    setShowResourceModal(true);
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    setResourceFormError('');

    if (!resourceForm.title.trim()) {
      setResourceFormError('Resource Title is required.');
      return;
    }

    if (resourceSourceMode === 'URL') {
      const url = resourceForm.external_url.trim();
      if (!url) {
        setResourceFormError('External academic URL is required.');
        return;
      }
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        setResourceFormError('External URL must begin with https:// or http://');
        return;
      }
    } else {
      if (!editingResource && !selectedUploadFile) {
        setResourceFormError('Please select a file to upload (.pdf, .epub, .doc, .zip).');
        return;
      }
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', resourceForm.title.trim());
      formData.append('description', resourceForm.description.trim());
      formData.append('author', resourceForm.author.trim());
      formData.append('publisher', resourceForm.publisher.trim());
      formData.append('category', resourceForm.category);
      formData.append('subject', resourceForm.subject.trim());
      formData.append('department', resourceForm.department);
      formData.append('resource_type', resourceForm.resource_type);
      formData.append('publication_year', resourceForm.publication_year);
      formData.append('access_type', resourceForm.access_type);
      formData.append('publication_status', resourceForm.publication_status);
      formData.append('tags', resourceForm.tags);

      if (resourceSourceMode === 'URL') {
        formData.append('external_url', resourceForm.external_url.trim());
      } else {
        formData.append('external_url', '');
        if (selectedUploadFile) {
          formData.append('file', selectedUploadFile);
        }
      }

      const url = editingResource
        ? `/api/librarian/digital-resources/${editingResource._id}`
        : '/api/librarian/digital-resources';
      const method = editingResource ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setResourceFormError(data.error || 'Failed to save digital resource.');
        setActionLoading(false);
        return;
      }

      showMessage('success', data.message || 'Resource catalogue entry saved successfully.');
      setShowResourceModal(false);
      setEditingResource(null);
      setSelectedUploadFile(null);
      loadDigitalResources();
      loadOverview();
    } catch (err) {
      console.error('Save digital resource error:', err);
      setResourceFormError('Network error while saving resource.');
    }
    setActionLoading(false);
  };

  const handleToggleStatus = async (resource, newStatus) => {
    try {
      const res = await fetch(`/api/librarian/digital-resources/${resource._id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ publication_status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to update status.');
        return;
      }
      showMessage('success', data.message);
      loadDigitalResources();
      loadOverview();
    } catch {
      showMessage('error', 'Network error while updating status.');
    }
  };

  const handleDeleteResource = async () => {
    if (!deleteResourceModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/librarian/digital-resources/${deleteResourceModal._id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage('error', data.error || 'Failed to delete resource.');
        setActionLoading(false);
        return;
      }
      showMessage('success', data.message);
      setDeleteResourceModal(null);
      loadDigitalResources();
      loadOverview();
    } catch {
      showMessage('error', 'Network error while deleting resource.');
    }
    setActionLoading(false);
  };


  const renderChair = (seat) => {
    if (!seat) return <div style={{ width: 28, height: 28 }} />;
    const isSelected = selectedSeatDetails?._id === seat._id;
    const isBoysWing = seat.zone === 'BOYS';
    let chairClass = 'chair-box';
    let indicator = '';

    if (seat.state === 'MAINTENANCE') {
      chairClass += ' maintenance';
      indicator = '⚙';
    } else if (seat.state === 'RESERVED') {
      chairClass += isBoysWing ? ' reserved-boys' : ' reserved-girls';
      indicator = '✕';
    } else {
      chairClass += ' available';
    }

    return (
      <button
        key={seat._id}
        type="button"
        className={chairClass}
        onClick={() => setSelectedSeatDetails(seat)}
        style={{
          outline: isSelected ? '2.5px solid #0f172a' : 'none',
          outlineOffset: isSelected ? '2px' : '0px',
          transform: isSelected ? 'scale(1.15)' : 'none',
          zIndex: isSelected ? 15 : 1
        }}
        title={`Seat: ${seat.seat_number}\nStatus: ${seat.state}${seat.student ? `\nStudent: ${seat.student.name} (${seat.student.roll_number})` : ''}`}
      >
        {indicator}
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

  // Grouped Sidebar Navigation Items
  const navSections = [
    {
      group: 'OVERVIEW & SEATING',
      items: [
        { id: 'OVERVIEW', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'SEATS_TABLE', label: 'Seat Reservations', icon: Armchair, badge: overviewData?.metrics?.seats?.reserved },
        { id: 'FLOOR_MAP', label: 'Interactive Floor Map', icon: Layers },
        { id: 'DAILY_RESET', label: 'Daily Reset & Availability', icon: RotateCcw }
      ]
    },
    {
      group: 'BOOK INVENTORY & CIRCULATION',
      items: [
        { id: 'CATALOGUE', label: 'Book Catalogue', icon: BookOpen },
        { id: 'CIRCULATION', label: 'Circulation Desk (Issue/Return)', icon: ArrowRightLeft },
        { id: 'OVERDUE', label: 'Overdue Books & Fines', icon: AlertTriangle, badge: overviewData?.metrics?.books?.overdue_loans }
      ]
    },
    {
      group: 'DIGITAL RESOURCES & E-LEARNING',
      items: [
        { id: 'DIGITAL_RESOURCES', label: 'Digital Resource Management', icon: GraduationCap, badge: overviewData?.metrics?.digital_resources?.published }
      ]
    },
    {
      group: 'COMMUNITY & STUDENTS',
      items: [
        { id: 'ROOM_REQUESTS', label: 'Room Approvals', icon: MessageSquare, badge: overviewData?.metrics?.rooms?.pending_requests },
        { id: 'ROOM_SCHEDULE', label: 'Room Schedules', icon: CalendarCheck },
        { id: 'STUDENTS', label: 'Student Directory', icon: Users }
      ]
    },
    {
      group: 'ADMINISTRATION & REPORTS',
      items: [
        { id: 'AUDIT_LOGS', label: 'Audit Log & History', icon: History },
        { id: 'REPORTS', label: 'Operational Analytics', icon: BarChart3 }
      ]
    }
  ];

  return (
    <div className="librarian-shell">
      {/* ─────────────────────────────────────────────────────────────
          1. CLEAN WHITE SIDEBAR (MATCHING SEAT BOOKING DESIGN SYSTEM)
      ───────────────────────────────────────────────────────────── */}
      <aside className="librarian-sidebar">
        {/* Brand Header */}
        <div className="librarian-sidebar-header">
          <div className="brand-icon-box" style={{ background: '#0f172a' }}>
            <Building2 size={20} color="#ffffff" />
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <h1 className="brand-title" style={{ fontSize: '1.05rem', margin: 0 }}>BIT Central Library</h1>
            <span className="brand-subtitle" style={{ fontSize: '0.65rem', color: '#64748b' }}>
              LIBRARIAN PORTAL
            </span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div className="librarian-sidebar-scroll">
          {navSections.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '0.65rem' }}>
              <div className="librarian-nav-group-title">{group.group}</div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`librarian-nav-btn ${isActive ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span style={{
                        background: isActive ? '#ef4444' : '#fee2e2',
                        color: isActive ? '#ffffff' : '#991b1b',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info */}
        <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid var(--border-light)', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.82rem'
            }}>
              {user?.name?.charAt(0) || 'L'}
            </div>
            <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'Authorized Librarian'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                {user?.role === 'ADMIN' ? 'Chief Librarian (Admin)' : 'Staff Librarian'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onSwitchToStudentView}
              className="sketch-action-btn"
              style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.74rem', justifyContent: 'center' }}
              title="Preview Student Experience"
            >
              <Eye size={13} />
              <span>Student View</span>
            </button>
            <button
              onClick={onLogout}
              className="sketch-action-btn"
              style={{ padding: '0.35rem 0.6rem', background: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b', boxShadow: '2px 2px 0px #ef4444' }}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA (MATCHES SEAT BOOKING PAGE PALETTE)
      ───────────────────────────────────────────────────────────── */}
      <main className="librarian-content-area">
        {/* Top Operational Bar */}
        <header className="librarian-top-bar">
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
              {activeSection === 'DIGITAL_RESOURCES' && 'Digital Resource Management'}
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              BITSathy Central Library Management System • Live Administrative Console
            </p>
          </div>

          {/* Date & Session Global Controls (Themed matching seat booking) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem' }}>
              <Calendar size={14} color="#64748b" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', outline: 'none', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(parseInt(e.target.value))}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.38rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#0f172a',
                outline: 'none',
                fontFamily: 'var(--font-mono)'
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
              className="sketch-action-btn"
              style={{ padding: '0.4rem 0.6rem' }}
              title="Refresh Current Data"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <div style={{ flex: 1, padding: '1.5rem 1.75rem 3.5rem', overflowY: 'auto' }}>
          {/* ──────────────────────────────────────────────────────────
              SECTION 1: OVERVIEW DASHBOARD
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'OVERVIEW' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Central Library Operational Dashboard
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Real-time operational summary across library seats, book circulation, and community rooms.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Seats remaining</span>
                    <span className="seats-remaining-badge">[ {overviewData?.metrics?.seats?.available || 0} ]</span>
                  </div>
                </div>
              </div>

              {/* Summary Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Seats Total & Available */}
                <div className="light-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--male-blue)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span>Library Seats (3 Floors)</span>
                    <Armchair size={18} color="var(--male-blue)" />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.4rem 0', fontFamily: 'var(--font-mono)' }}>
                    {overviewData?.metrics?.seats?.available || 0} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>available</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong>{overviewData?.metrics?.seats?.reserved || 0}</strong> reserved • <strong>{overviewData?.metrics?.seats?.blocked || 0}</strong> maintenance
                  </div>
                </div>

                {/* Books & Physical Copies */}
                <div className="light-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span>Book Inventory</span>
                    <BookOpen size={18} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.4rem 0', fontFamily: 'var(--font-mono)' }}>
                    {overviewData?.metrics?.books?.available_copies || 0} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>/ {overviewData?.metrics?.books?.total_copies || 0} copies</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong>{overviewData?.metrics?.books?.total_titles || 0}</strong> unique titles in catalogue
                  </div>
                </div>

                {/* Active & Overdue Loans */}
                <div className="light-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span>Active Borrowings</span>
                    <ArrowRightLeft size={18} color="#f59e0b" />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.4rem 0', fontFamily: 'var(--font-mono)' }}>
                    {overviewData?.metrics?.books?.active_loans || 0} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>on loan</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: overviewData?.metrics?.books?.overdue_loans > 0 ? '#b91c1c' : 'var(--text-secondary)', fontWeight: overviewData?.metrics?.books?.overdue_loans > 0 ? 700 : 500 }}>
                    <strong>{overviewData?.metrics?.books?.overdue_loans || 0}</strong> overdue loans (₹{overviewData?.metrics?.books?.pending_fines || 0} fines)
                  </div>
                </div>

                {/* Discussion Rooms */}
                <div className="light-card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <span>Discussion Rooms</span>
                    <MessageSquare size={18} color="#8b5cf6" />
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.4rem 0', fontFamily: 'var(--font-mono)' }}>
                    {overviewData?.metrics?.rooms?.pending_requests || 0} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>pending</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <strong>4</strong> total rooms • <strong>{overviewData?.metrics?.rooms?.approved_bookings || 0}</strong> approved
                  </div>
                </div>
              </div>

              {/* Quick Action Banner (Sketch Border Card) */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #0f172a',
                boxShadow: '3px 3px 0px #0f172a',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                    <RotateCcw size={18} color="#0f172a" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Safe Daily Seat Availability Reset
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    Automatically expires past session reservations, preserves permanent 360-seat floor layouts, and maintains complete historical audit records.
                  </p>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="sketch-action-btn primary"
                >
                  <RotateCcw size={15} />
                  <span>Execute Reset Now</span>
                </button>
              </div>

              {/* Two Column Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                {/* Pending Room Requests */}
                <div className="light-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={17} color="#2563eb" />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Pending Discussion Room Requests</h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('ROOM_REQUESTS')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--male-blue)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View All →
                    </button>
                  </div>

                  {overviewData?.pending_rooms?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                      <div>No pending discussion room requests requiring review.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {overviewData?.pending_rooms?.slice(0, 4).map(req => (
                        <div key={req._id} style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{req.club_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {req.room?.name} • Session {req.session_number} ({req.booking_date})
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Rep: {req.user?.name} ({req.user?.roll_number}) • {req.attendees_count} members
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => { setRoomDecisionModal({ request: req, action: 'APPROVE' }); setAdminRemarks(''); }}
                              className="sketch-action-btn"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: '#ecfdf5', borderColor: '#10b981', color: '#065f46' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setRoomDecisionModal({ request: req, action: 'REJECT' }); setAdminRemarks(''); }}
                              className="sketch-action-btn danger"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <History size={17} color="#0f172a" />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Recent Activity & Audit Log</h3>
                    </div>
                    <button
                      onClick={() => setActiveSection('AUDIT_LOGS')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--male-blue)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View All →
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {overviewData?.recent_activity?.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        No recorded administrative actions yet today.
                      </div>
                    ) : (
                      overviewData?.recent_activity?.slice(0, 5).map(log => (
                        <div key={log._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            background: log.category === 'SEAT' ? 'var(--male-blue-bg)' : log.category === 'BOOK' ? '#f0fdf4' : '#faf5ff',
                            color: log.category === 'SEAT' ? 'var(--male-blue)' : log.category === 'BOOK' ? '#15803d' : '#7e22ce'
                          }}>
                            {log.action}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#0f172a', fontWeight: 600 }}>{log.target_description}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>By {log.actor_name} • {new Date(log.createdAt).toLocaleTimeString()}</div>
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
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Seat Reservations Registry
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Filter, search, inspect, and administratively manage reservations across all three library floors.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Records Loaded</span>
                    <span className="seats-remaining-badge">[ {seatReservations.length} ]</span>
                  </div>
                </div>
              </div>

              <div className="light-card" style={{ padding: '1.25rem' }}>
                {/* Filter Controls Panel */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem' }}>
                      <Search size={14} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Search student, roll, or seat..."
                        value={seatSearch}
                        onChange={(e) => setSeatSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontSize: '0.8rem', width: '200px' }}
                      />
                    </div>

                    <select
                      value={seatFloorFilter}
                      onChange={(e) => setSeatFloorFilter(e.target.value)}
                      style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <option value="ALL">All Floors</option>
                      <option value="1">Floor 1 (Ground)</option>
                      <option value="2">Floor 2 (Digital)</option>
                      <option value="3">Floor 3 (Silent)</option>
                    </select>

                    <select
                      value={seatZoneFilter}
                      onChange={(e) => setSeatZoneFilter(e.target.value)}
                      style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <option value="ALL">All Seating Zones</option>
                      <option value="BOYS">Boys Zone (West / Blue)</option>
                      <option value="GIRLS">Girls Zone (East / Pink)</option>
                    </select>

                    <select
                      value={seatStatusFilter}
                      onChange={(e) => setSeatStatusFilter(e.target.value)}
                      style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <option value="CONFIRMED">Active Confirmed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="COMPLETED">Completed (Historical)</option>
                      <option value="ALL">All Statuses</option>
                    </select>
                  </div>

                  <button
                    onClick={loadSeatReservations}
                    className="sketch-action-btn primary"
                  >
                    Apply Filters
                  </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1.5px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Seat Number</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Student Name</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Roll Number</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Floor & Zone</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Date & Session</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seatReservations.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No reservations found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        seatReservations.map(res => (
                          <tr key={res._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                              {res.seat?.seat_number}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600, color: '#0f172a' }}>
                              {res.user?.name}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {res.user?.roll_number}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              Floor {res.seat?.floor_number} • <span style={{ color: res.seat?.zone === 'BOYS' ? 'var(--male-blue)' : 'var(--female-pink)', fontWeight: 700 }}>{res.seat?.zone}</span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                              {res.booking_date} (Session {res.session_number})
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                background: res.status === 'CONFIRMED' ? '#dcfce7' : res.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                                color: res.status === 'CONFIRMED' ? '#15803d' : res.status === 'CANCELLED' ? '#991b1b' : '#475569'
                              }}>
                                {res.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                              {res.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => setCancelBookingModal({ booking_id: res._id, seat_number: res.seat?.seat_number, student_name: res.user?.name })}
                                  className="sketch-action-btn danger"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                >
                                  Cancel Reservation
                                </button>
                              )}
                              {res.status === 'CANCELLED' && res.cancellation_reason && (
                                <span style={{ fontSize: '0.72rem', color: '#991b1b', fontStyle: 'italic' }}>
                                  "{res.cancellation_reason}"
                                </span>
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
              SECTION 3: INTERACTIVE FLOOR MAP (EXACT SEAT BOOKING BLUEPRINT)
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'FLOOR_MAP' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Interactive Floor Map & Maintenance
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Physical architectural floor blueprint. Click any seat to inspect student reservations or toggle maintenance block.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Seats remaining</span>
                    <span className="seats-remaining-badge">[ {mapLayout ? mapLayout.stats?.available : 120} ]</span>
                  </div>
                </div>
              </div>

              {/* Floor & Session Controls Panel (Matches Seat Booking Page Controls) */}
              <section className="light-card controls-panel">
                <div className="control-row">
                  <span className="control-label">
                    <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Floor:
                  </span>
                  <div className="pills-group">
                    {[1, 2, 3].map(f => (
                      <button
                        key={f}
                        className={`pill-button ${mapFloor === f ? 'active' : ''}`}
                        onClick={() => setMapFloor(f)}
                      >
                        <span>Floor {f}</span>
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
                      style={{ width: 'auto', padding: '0.4rem 0.75rem', fontFamily: 'var(--font-mono)' }}
                      value={selectedDate}
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

              {/* Exact Physical Floor Map Canvas */}
              <section className="floormap-canvas">
                {loading ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading Floor Layout Blueprint...
                  </div>
                ) : mapLayout ? (
                  <div>
                    <div className="floor-zones-wrapper">
                      {/* MALE / BOYS (West / Blue) */}
                      <div className="male-zone">
                        <div className="zone-header-box">
                          <h3 className="zone-title">Seat reservation — male</h3>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--male-blue)', background: 'var(--male-blue-bg)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                            Blue Theme (60 Seats)
                          </span>
                        </div>

                        <div className="tables-columns-container">
                          <div className="table-column">
                            {groupIntoTables(mapLayout.boys_wing)
                              .filter(t => t.col_index === 1)
                              .map(t => renderRectangularTable(t))}
                          </div>
                          <div className="table-column">
                            {groupIntoTables(mapLayout.boys_wing)
                              .filter(t => t.col_index === 2)
                              .map(t => renderRectangularTable(t))}
                          </div>
                          <div className="table-column">
                            {groupIntoTables(mapLayout.boys_wing)
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

                      {/* FEMALE / GIRLS (East / Pink) */}
                      <div className="female-zone">
                        <div className="zone-header-box">
                          <h3 className="zone-title">Seat reservation — female</h3>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--female-pink)', background: 'var(--female-pink-bg)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                            Pink Theme (60 Seats)
                          </span>
                        </div>

                        <div className="tables-columns-container">
                          <div className="table-column">
                            {groupIntoTables(mapLayout.girls_wing)
                              .filter(t => t.col_index === 1)
                              .map(t => renderSquareTable(t))}
                          </div>
                          <div className="table-column">
                            {groupIntoTables(mapLayout.girls_wing)
                              .filter(t => t.col_index === 2)
                              .map(t => renderRectangularTable(t))}
                          </div>
                          <div className="table-column">
                            {groupIntoTables(mapLayout.girls_wing)
                              .filter(t => t.col_index === 3)
                              .map(t => renderRectangularTable(t))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Sketch Legend */}
                    <div className="sketch-legend-bar">
                      <div className="legend-pill-sketch">
                        <div className="legend-sketch-circle" style={{ background: '#fff', borderColor: '#cbd5e1' }} />
                        <span>Available Seat</span>
                      </div>
                      <div className="legend-pill-sketch">
                        <div className="legend-sketch-circle" style={{ background: 'var(--male-blue-bg)', borderColor: 'var(--male-blue)', color: 'var(--male-blue)' }}>✕</div>
                        <span>Booked (Boys Wing)</span>
                      </div>
                      <div className="legend-pill-sketch">
                        <div className="legend-sketch-circle" style={{ background: 'var(--female-pink-bg)', borderColor: 'var(--female-pink)', color: 'var(--female-pink)' }}>✕</div>
                        <span>Booked (Girls Wing)</span>
                      </div>
                      <div className="legend-pill-sketch">
                        <div className="legend-sketch-circle" style={{ background: '#fef3c7', borderColor: '#d97706', color: '#92400e' }}>⚙</div>
                        <span>Maintenance Blocked</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              {/* Seat Inspection Drawer (Themed with Signature Sketch Border) */}
              {selectedSeatDetails && (
                <div style={{
                  marginTop: '1.5rem',
                  background: '#ffffff',
                  border: '1.5px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0f172a' }}>
                        Seat: {selectedSeatDetails.seat_number}
                      </span>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        background: selectedSeatDetails.state === 'RESERVED' ? 'var(--male-blue-bg)' : selectedSeatDetails.state === 'MAINTENANCE' ? '#fef3c7' : '#dcfce7',
                        color: selectedSeatDetails.state === 'RESERVED' ? 'var(--male-blue)' : selectedSeatDetails.state === 'MAINTENANCE' ? '#92400e' : '#15803d'
                      }}>
                        {selectedSeatDetails.state}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Floor {selectedSeatDetails.floor_number} • {selectedSeatDetails.zone} Zone • Table: {selectedSeatDetails.table_number} ({selectedSeatDetails.table_type})
                    </div>

                    {selectedSeatDetails.student && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#0f172a', background: 'var(--bg-app)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        Reserved by: <strong>{selectedSeatDetails.student.name}</strong> ({selectedSeatDetails.student.roll_number}) • {selectedSeatDetails.student.email}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedSeatDetails.state === 'RESERVED' && selectedSeatDetails.booking_id && (
                      <button
                        onClick={() => setCancelBookingModal({
                          booking_id: selectedSeatDetails.booking_id,
                          seat_number: selectedSeatDetails.seat_number,
                          student_name: selectedSeatDetails.student?.name
                        })}
                        className="sketch-action-btn danger"
                      >
                        <Ban size={14} />
                        <span>Cancel Reservation</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleBlock(
                        selectedSeatDetails._id,
                        selectedSeatDetails.state,
                        'Physical maintenance by library staff'
                      )}
                      className="sketch-action-btn"
                      style={{
                        background: selectedSeatDetails.state === 'MAINTENANCE' ? '#dcfce7' : '#fef3c7',
                        borderColor: selectedSeatDetails.state === 'MAINTENANCE' ? '#10b981' : '#f59e0b',
                        color: selectedSeatDetails.state === 'MAINTENANCE' ? '#065f46' : '#92400e'
                      }}
                    >
                      <Wrench size={14} />
                      <span>{selectedSeatDetails.state === 'MAINTENANCE' ? 'Unblock Seat (Set Active)' : 'Block Seat (Maintenance)'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedSeatDetails(null)}
                      className="sketch-action-btn"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 4: DAILY RESET & AVAILABILITY
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'DAILY_RESET' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Daily Seat Availability & Operational Reset
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Safe, scheduled, non-destructive seat availability engine. Preserves permanent physical seat records and marks expired bookings as completed.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Engine Status</span>
                    <span className="seats-remaining-badge" style={{ color: '#10b981' }}>[ ACTIVE ]</span>
                  </div>
                </div>
              </div>

              <div className="light-card" style={{ padding: '1.75rem', maxWidth: '840px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--bg-app)',
                    border: '1.5px solid #0f172a',
                    boxShadow: '2px 2px 0px #0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem'
                  }}>
                    <RotateCcw size={24} color="#0f172a" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Daily Operational Seat Availability Reset</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '540px', margin: '0.5rem auto 0' }}>
                    Run the automated seat reset routine for the selected date. Expired session reservations are marked <span style={{ fontWeight: 800, color: '#0f172a' }}>COMPLETED</span>, historical analytics are preserved, and seats are released for future bookings.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Reset Invariants & Guarantees:</h4>
                  <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                    <li>The 360 physical seats across Floors 1, 2, and 3 are <strong>never deleted</strong>.</li>
                    <li>Student accounts and their past attendance records remain permanently stored.</li>
                    <li>Seats flagged as <span style={{ color: '#b45309', fontWeight: 700 }}>MAINTENANCE</span> remain blocked until explicitly unblocked by staff.</li>
                    <li>Idempotent execution: Triggering multiple times does not duplicate or corrupt booking data.</li>
                    <li>All actions are recorded in the central <span style={{ fontWeight: 700 }}>AuditLog</span> with timestamp and actor ID.</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="sketch-action-btn primary"
                    style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
                  >
                    <RotateCcw size={16} />
                    <span>Trigger Reset for {selectedDate}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 5: BOOK CATALOGUE MANAGEMENT
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'CATALOGUE' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Book Catalogue & Physical Inventory
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Add new book titles, edit metadata, generate physical copy barcodes, and monitor damaged or lost copies.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Titles in Catalogue</span>
                    <span className="seats-remaining-badge">[ {booksList.length} ]</span>
                  </div>
                  <button
                    onClick={() => setShowAddBookModal(true)}
                    className="sketch-action-btn primary"
                  >
                    <Plus size={15} />
                    <span>Add New Book</span>
                  </button>
                </div>
              </div>

              <div className="light-card" style={{ padding: '1.25rem' }}>
                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem' }}>
                      <Search size={14} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Search title, author, or ISBN..."
                        value={bookSearch}
                        onChange={(e) => setBookSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontSize: '0.8rem', width: '220px' }}
                      />
                    </div>

                    <select
                      value={bookCategoryFilter}
                      onChange={(e) => setBookCategoryFilter(e.target.value)}
                      style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={loadBooks}
                    className="sketch-action-btn primary"
                  >
                    Filter Catalogue
                  </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1.5px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Book Title & Author</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>ISBN</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Category</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Total Copies</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Available Copies</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Borrowed</th>
                        <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booksList.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No books found matching the search criteria.
                          </td>
                        </tr>
                      ) : (
                        booksList.map(b => (
                          <tr key={b._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{b.title}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>by {b.author} • {b.publisher} ({b.publication_year})</div>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {b.isbn}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 600 }}>
                                {b.category}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                              {b.total_copies}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#16a34a' }}>
                              {b.available_copies}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#2563eb' }}>
                              {b.borrowed_copies}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  onClick={() => setManageCopiesModal(b)}
                                  className="sketch-action-btn"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                >
                                  Manage Copies
                                </button>
                                <button
                                  onClick={() => setEditBookModal(b)}
                                  className="sketch-action-btn"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
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
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 6: CIRCULATION DESK (ISSUE & RETURN)
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'CIRCULATION' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Circulation Desk (Book Issue & Return)
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Quick issue by student roll number & copy barcode, process returns, and maintain active loan records.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowIssueModal(true)}
                    className="sketch-action-btn primary"
                  >
                    <Plus size={15} />
                    <span>Issue New Book</span>
                  </button>
                </div>
              </div>

              {/* Quick Barcode Return Bar (Signature Sketch Style) */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #0f172a',
                boxShadow: '3px 3px 0px #0f172a',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.2rem' }}>
                    <ArrowRightLeft size={18} color="#0f172a" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rapid Book Return Scan</h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Scan or enter the book copy barcode to immediately mark it returned and compute any overdue fines.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter or scan Barcode (e.g. BIT-CS-0001-01)..."
                    value={returnBarcode}
                    onChange={(e) => setReturnBarcode(e.target.value)}
                    style={{
                      background: 'var(--bg-app)',
                      border: '1.5px solid #0f172a',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.82rem',
                      fontFamily: 'var(--font-mono)',
                      width: '280px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => handleReturnBook()}
                    className="sketch-action-btn primary"
                  >
                    Confirm Return
                  </button>
                </div>
              </div>

              {/* Loans Table */}
              <div className="light-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem' }}>
                      <Search size={14} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Search student, roll, title, barcode..."
                        value={loanSearch}
                        onChange={(e) => setLoanSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', fontSize: '0.8rem', width: '240px' }}
                      />
                    </div>

                    <select
                      value={loanStatusFilter}
                      onChange={(e) => setLoanStatusFilter(e.target.value)}
                      style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <option value="ALL">All Loans</option>
                      <option value="ISSUED">Active Issued</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="RETURNED">Returned (History)</option>
                    </select>
                  </div>

                  <button
                    onClick={loadLoans}
                    className="sketch-action-btn primary"
                  >
                    Apply Filters
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1.5px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Barcode</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Book Title</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Borrower</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Roll Number</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Issue Date</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Due Date</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loansList.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No circulation loan records found.
                          </td>
                        </tr>
                      ) : (
                        loansList.map(loan => {
                          const isOverdue = loan.status === 'OVERDUE' || (loan.status === 'ISSUED' && new Date() > new Date(loan.due_date));
                          return (
                            <tr key={loan._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#0f172a' }}>
                                {loan.copy?.barcode || 'N/A'}
                              </td>
                              <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>
                                {loan.book?.title}
                              </td>
                              <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>
                                {loan.user?.name}
                              </td>
                              <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                {loan.user?.roll_number}
                              </td>
                              <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                                {new Date(loan.issue_date).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: isOverdue ? '#b91c1c' : '#0f172a', fontWeight: isOverdue ? 800 : 500 }}>
                                {new Date(loan.due_date).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '0.75rem 0.85rem' }}>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-mono)',
                                  background: loan.status === 'RETURNED' ? '#dcfce7' : isOverdue ? '#fee2e2' : '#eff6ff',
                                  color: loan.status === 'RETURNED' ? '#15803d' : isOverdue ? '#991b1b' : '#1d4ed8'
                                }}>
                                  {isOverdue ? 'OVERDUE' : loan.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                                {loan.status !== 'RETURNED' && (
                                  <button
                                    onClick={() => handleReturnBook(loan.copy?.barcode)}
                                    className="sketch-action-btn"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                  >
                                    Record Return
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 7: OVERDUE BOOKS & FINE TRACKING
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'OVERDUE' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Overdue Books & Fine Tracker
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Track books exceeding loan periods with automated fine calculation at ₹2.00/day.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box" style={{ borderColor: overdueList.length > 0 ? '#b91c1c' : '#0f172a' }}>
                    <span>Overdue Books</span>
                    <span className="seats-remaining-badge" style={{ color: overdueList.length > 0 ? '#b91c1c' : '#10b981' }}>
                      [ {overdueList.length} ]
                    </span>
                  </div>
                </div>
              </div>

              <div className="light-card" style={{ padding: '1.25rem' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1.5px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Borrower</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Roll Number</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Book Title</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Barcode</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Due Date</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Days Overdue</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Fine (₹2/day)</th>
                        <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueList.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>Clean Record! No overdue books today.</div>
                            <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>All borrowed items are within the allotted borrowing timeframe.</div>
                          </td>
                        </tr>
                      ) : (
                        overdueList.map(item => (
                          <tr key={item._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>
                              {item.user?.name}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {item.user?.roll_number}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>
                              {item.book?.title}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                              {item.copy?.barcode}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: '#b91c1c' }}>
                              {new Date(item.due_date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#b91c1c' }}>
                              {item.days_overdue} days
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#b91c1c' }}>
                              ₹{item.fine_amount}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleReturnBook(item.copy?.barcode)}
                                className="sketch-action-btn primary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                              >
                                Record Return
                              </button>
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
              SECTION 8: DISCUSSION ROOM REQUESTS & APPROVALS
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'ROOM_REQUESTS' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Discussion Room Requests & Approvals
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Review club and community booking requests with automatic room schedule conflict checking.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Requests</span>
                    <span className="seats-remaining-badge">[ {roomRequests.length} ]</span>
                  </div>
                </div>
              </div>

              <div className="light-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status Filter:</span>
                    <select
                      value={roomFilterStatus}
                      onChange={(e) => setRoomFilterStatus(e.target.value)}
                      style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <option value="ALL">All Requests</option>
                      <option value="PENDING">Pending Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  <button
                    onClick={loadRoomRequests}
                    className="sketch-action-btn primary"
                  >
                    Refresh Requests
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1.5px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Club / Representative</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Room</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Date & Slot</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Attendees</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Purpose</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No discussion room booking requests found.
                          </td>
                        </tr>
                      ) : (
                        roomRequests.map(req => (
                          <tr key={req._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{req.club_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{req.user?.name} ({req.user?.roll_number})</div>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>
                              {req.room?.name}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                              {req.booking_date} (Session {req.session_number})
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {req.attendees_count} students
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {req.purpose}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                background: req.status === 'APPROVED' ? '#dcfce7' : req.status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                                color: req.status === 'APPROVED' ? '#15803d' : req.status === 'REJECTED' ? '#991b1b' : '#b45309'
                              }}>
                                {req.status}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                              {req.status === 'PENDING' ? (
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    onClick={() => { setRoomDecisionModal({ request: req, action: 'APPROVE' }); setAdminRemarks(''); }}
                                    className="sketch-action-btn"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', background: '#ecfdf5', borderColor: '#10b981', color: '#065f46' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => { setRoomDecisionModal({ request: req, action: 'REJECT' }); setAdminRemarks(''); }}
                                    className="sketch-action-btn danger"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Reviewed {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}
                                </span>
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
              SECTION 9: DISCUSSION ROOM SCHEDULE
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'ROOM_SCHEDULE' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Discussion Room Timetable & Occupancy
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Visual schedule matrix for all 4 discussion rooms for {selectedDate}.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {[
                  { id: 'R1', name: 'Discussion Room 1 (Turing Hall)', capacity: 8, location: 'Floor 1, West Wing' },
                  { id: 'R2', name: 'Discussion Room 2 (Lovelace Conference)', capacity: 10, location: 'Floor 1, East Wing' },
                  { id: 'R3', name: 'Discussion Room 3 (Ramanujan Suite)', capacity: 6, location: 'Floor 2, South Wing' },
                  { id: 'R4', name: 'Discussion Room 4 (Hopper Seminar)', capacity: 12, location: 'Floor 3, North Wing' }
                ].map(room => (
                  <div key={room.id} className="light-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{room.name}</h3>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9' }}>
                        Cap: {room.capacity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{room.location}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sessions.map(s => {
                        const approvedBooking = roomRequests.find(r => r.session_number === s.session_number && r.status === 'APPROVED' && r.room?.name === room.name);
                        return (
                          <div key={s.session_number} style={{
                            padding: '0.6rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-light)',
                            background: approvedBooking ? '#eff6ff' : 'var(--bg-app)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem'
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>Session {s.session_number}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.start_time} - {s.end_time}</div>
                            </div>
                            <div>
                              {approvedBooking ? (
                                <span style={{ fontWeight: 700, color: 'var(--male-blue)', fontSize: '0.72rem' }}>
                                  {approvedBooking.club_name}
                                </span>
                              ) : (
                                <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.72rem' }}>
                                  Available
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              SECTION 10: STUDENT RECORDS DIRECTORY
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'STUDENTS' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Student Records Directory & Activity Drilldown
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Registry of all enrolled students with drill-down views of active seat reservations, borrowed books, and room requests.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Enrolled Students</span>
                    <span className="seats-remaining-badge">[ {studentsList.length} ]</span>
                  </div>
                </div>
              </div>

              <div className="light-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem' }}>
                    <Search size={14} color="#64748b" />
                    <input
                      type="text"
                      placeholder="Search student by name, roll, or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      style={{ border: 'none', outline: 'none', fontSize: '0.8rem', width: '260px' }}
                    />
                  </div>

                  <button
                    onClick={loadStudents}
                    className="sketch-action-btn primary"
                  >
                    Search Students
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1.5px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Student Name</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Roll Number</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Department & Year</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Gender / Zone</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Active Loans</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Pending Fines</th>
                        <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No student records found.
                          </td>
                        </tr>
                      ) : (
                        studentsList.map(st => (
                          <tr key={st._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{st.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{st.email}</div>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {st.roll_number}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              {st.department} • <span style={{ fontFamily: 'var(--font-mono)' }}>Yr {st.year}</span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                background: st.gender === 'MALE' ? 'var(--male-blue-bg)' : 'var(--female-pink-bg)',
                                color: st.gender === 'MALE' ? 'var(--male-blue)' : 'var(--female-pink)'
                              }}>
                                {st.gender === 'MALE' ? 'Male (Boys Wing)' : 'Female (Girls Wing)'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {st.active_loans_count} / 3 books
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: st.pending_fines > 0 ? '#b91c1c' : '#16a34a' }}>
                              ₹{st.pending_fines || 0}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleOpenStudentDrilldown(st._id)}
                                className="sketch-action-btn"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                              >
                                View Record
                              </button>
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
              SECTION 11: AUDIT LOG & ADMINISTRATIVE HISTORY
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'AUDIT_LOGS' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Administrative Audit Log & Trail
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Tamper-evident record of all seat cancellations, blocks, resets, book transactions, and approvals.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="seats-remaining-box">
                    <span>Audit Events</span>
                    <span className="seats-remaining-badge">[ {auditLogs.length} ]</span>
                  </div>
                </div>
              </div>

              <div className="light-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Category:</span>
                    <select
                      value={auditCategoryFilter}
                      onChange={(e) => setAuditCategoryFilter(e.target.value)}
                      style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.38rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      <option value="ALL">All Categories</option>
                      <option value="SEAT">Seats Operations</option>
                      <option value="BOOK">Books & Loans</option>
                      <option value="ROOM">Discussion Rooms</option>
                      <option value="SYSTEM">System & Resets</option>
                    </select>
                  </div>

                  <button
                    onClick={loadAuditLogs}
                    className="sketch-action-btn primary"
                  >
                    Refresh Audit Log
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-app)', borderBottom: '1.5px solid var(--border-light)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Timestamp</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Action</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Staff Member</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Role</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Description & Target</th>
                        <th style={{ padding: '0.75rem 0.85rem' }}>Reason / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No audit log records recorded.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                background: log.category === 'SEAT' ? 'var(--male-blue-bg)' : log.category === 'BOOK' ? '#f0fdf4' : '#faf5ff',
                                color: log.category === 'SEAT' ? 'var(--male-blue)' : log.category === 'BOOK' ? '#15803d' : '#7e22ce'
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#0f172a' }}>
                              {log.actor_name}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                              {log.actor_role}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', color: '#0f172a' }}>
                              {log.target_description}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                              {log.reason || '—'}
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
              SECTION 12: OPERATIONAL ANALYTICS & REPORTS
          ────────────────────────────────────────────────────────── */}
          {activeSection === 'REPORTS' && (
            <div>
              <div className="page-hero">
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                    Operational Analytics & Summary Reports
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Detailed floor occupancy ratios, category circulation breakdown, and library fine summaries.
                  </p>
                </div>
              </div>

              {reportsData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Floor-wise stats */}
                  <div className="light-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                      Floor-Wise Occupancy Breakdown
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      {reportsData.floors?.map(f => (
                        <div key={f.floor_number} style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Floor {f.floor_number}</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--male-blue)' }}>
                              {f.occupancy_rate}% Booked
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            {f.total_seats} Total Seats • {f.booked_seats} Occupied • {f.available_seats} Available
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${f.occupancy_rate}%`, height: '100%', background: '#0f172a' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financials & Collections */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="light-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                        Overdue Fines Summary
                      </h3>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Total Collected Fines</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#16a34a' }}>
                            ₹{reportsData.fines?.total_collected || 0}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Pending Outstanding Fines</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#b91c1c' }}>
                            ₹{reportsData.fines?.total_pending || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="light-card" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                        Circulation Status Ratio
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        <div>Total Copies in Physical Library: <strong>{reportsData.circulation?.total_copies}</strong></div>
                        <div>Currently Borrowed Copies: <strong>{reportsData.circulation?.active_loans}</strong></div>
                        <div>Circulation Volume Rate: <strong>{reportsData.circulation?.circulation_rate}%</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              13. DIGITAL RESOURCE MANAGEMENT (CURATION & CRUD)
          ───────────────────────────────────────────────────────────── */}
          {activeSection === 'DIGITAL_RESOURCES' && (
            <div>
              {/* Operations KPI Metrics Row */}
              <div className="librarian-stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '1.25rem' }}>
                <div className="light-card librarian-stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Total Catalogue</span>
                    <span className="stat-value">{digitalStats.total}</span>
                    <span className="stat-subtitle">Curated Academic Materials</span>
                  </div>
                  <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}>
                    <GraduationCap size={20} />
                  </div>
                </div>

                <div className="light-card librarian-stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Published Live</span>
                    <span className="stat-value" style={{ color: '#16a34a' }}>{digitalStats.published}</span>
                    <span className="stat-subtitle">Accessible by Students</span>
                  </div>
                  <div className="stat-icon-wrapper" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <CheckCircle2 size={20} />
                  </div>
                </div>

                <div className="light-card librarian-stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Drafts Pending</span>
                    <span className="stat-value" style={{ color: '#d97706' }}>{digitalStats.draft}</span>
                    <span className="stat-subtitle">Under Review</span>
                  </div>
                  <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <Clock size={20} />
                  </div>
                </div>

                <div className="light-card librarian-stat-card">
                  <div className="stat-content">
                    <span className="stat-label">Total Student Views</span>
                    <span className="stat-value">{digitalStats.views}</span>
                    <span className="stat-subtitle">Academic Impressions</span>
                  </div>
                  <div className="stat-icon-wrapper" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    <Eye size={20} />
                  </div>
                </div>

                <div className="light-card librarian-stat-card">
                  <div className="stat-content">
                    <span className="stat-label">File Downloads</span>
                    <span className="stat-value">{digitalStats.downloads}</span>
                    <span className="stat-subtitle">Offline Study Copies</span>
                  </div>
                  <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}>
                    <Download size={20} />
                  </div>
                </div>
              </div>

              {/* Action Bar & Search / Filter Toolbar */}
              <div className="light-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                      <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.1rem' }}
                        placeholder="Search resources by title, author, subject..."
                        value={digitalSearch}
                        onChange={(e) => { setDigitalSearch(e.target.value); setDigitalPage(1); }}
                      />
                    </div>

                    <select
                      className="form-input"
                      style={{ width: 'auto' }}
                      value={digitalCatFilter}
                      onChange={(e) => { setDigitalCatFilter(e.target.value); setDigitalPage(1); }}
                    >
                      <option value="ALL">All 8 Categories</option>
                      <option value="E-books and Textbooks">E-books and Textbooks</option>
                      <option value="Research Papers and Journals">Research Papers and Journals</option>
                      <option value="Previous-Year Question Papers">Previous-Year Question Papers</option>
                      <option value="Lecture Notes and Study Materials">Lecture Notes and Study Materials</option>
                      <option value="Laboratory Manuals">Laboratory Manuals</option>
                      <option value="Programming and Technical Tutorials">Programming and Technical Tutorials</option>
                      <option value="Online Courses and Educational Videos">Online Courses and Educational Videos</option>
                      <option value="Other Academic Resources">Other Academic Resources</option>
                    </select>

                    <select
                      className="form-input"
                      style={{ width: 'auto' }}
                      value={digitalStatusFilter}
                      onChange={(e) => { setDigitalStatusFilter(e.target.value); setDigitalPage(1); }}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>

                    <select
                      className="form-input"
                      style={{ width: 'auto' }}
                      value={digitalTypeFilter}
                      onChange={(e) => { setDigitalTypeFilter(e.target.value); setDigitalPage(1); }}
                    >
                      <option value="ALL">All Types</option>
                      <option value="PDF">PDF</option>
                      <option value="EBOOK">E-Book</option>
                      <option value="JOURNAL">Journal</option>
                      <option value="VIDEO">Video</option>
                      <option value="EXTERNAL_LINK">External Link</option>
                      <option value="LAB_MANUAL">Lab Manual</option>
                      <option value="TUTORIAL">Tutorial</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <button
                      onClick={loadDigitalResources}
                      className="sketch-action-btn"
                      title="Refresh Digital Catalogue"
                    >
                      <RefreshCw size={14} />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={handleOpenAddResource}
                      className="sketch-action-btn primary"
                    >
                      <Plus size={14} />
                      <span>Add New Digital Resource</span>
                    </button>
                  </div>
                </div>

                {(digitalSearch || digitalCatFilter !== 'ALL' || digitalStatusFilter !== 'ALL' || digitalTypeFilter !== 'ALL') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Active Filters:</span>
                    {digitalSearch && <span className="chip">Query: "{digitalSearch}"</span>}
                    {digitalCatFilter !== 'ALL' && <span className="chip">Category: {digitalCatFilter}</span>}
                    {digitalStatusFilter !== 'ALL' && <span className="chip">Status: {digitalStatusFilter}</span>}
                    {digitalTypeFilter !== 'ALL' && <span className="chip">Type: {digitalTypeFilter}</span>}
                    <button
                      onClick={() => {
                        setDigitalSearch('');
                        setDigitalCatFilter('ALL');
                        setDigitalStatusFilter('ALL');
                        setDigitalTypeFilter('ALL');
                        setDigitalPage(1);
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', marginLeft: '0.5rem' }}
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {/* Digital Resources Table */}
              <div className="light-card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading Digital Resources Catalogue...
                  </div>
                ) : digitalList.length === 0 ? (
                  <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                    <GraduationCap size={44} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                      No digital resources found
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Add an academic e-book, research paper, question bank, or external educational link.
                    </p>
                    <button onClick={handleOpenAddResource} className="sketch-action-btn primary">
                      <Plus size={14} />
                      <span>Add First Digital Resource</span>
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="librarian-table">
                      <thead>
                        <tr>
                          <th>Resource Title & Description</th>
                          <th>Category & Dept</th>
                          <th>Format & Source</th>
                          <th>Access Level</th>
                          <th>Status</th>
                          <th>Engagement</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {digitalList.map(res => (
                          <tr key={res._id}>
                            <td style={{ maxWidth: '300px' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', lineHeight: 1.3, marginBottom: '0.2rem' }}>
                                {res.title}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                                By: {res.author || 'BITSathy Academic Staff'} {res.publisher ? `• ${res.publisher}` : ''}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {res.description}
                              </div>
                            </td>

                            <td>
                              <span style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                display: 'block',
                                color: '#0f172a',
                                marginBottom: '0.2rem'
                              }}>
                                {res.category}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {res.department}
                              </span>
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                <span className="resource-type-pill" style={{ fontSize: '0.65rem' }}>
                                  {res.resource_type}
                                </span>
                              </div>
                              {res.file_reference ? (
                                <span style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                                  <Download size={11} /> File ({Math.round((res.file_reference.file_size || 0) / 1024)} KB)
                                </span>
                              ) : res.external_url ? (
                                <a
                                  href={res.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '0.7rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
                                >
                                  <ExternalLink size={11} /> External Link
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No file attached</span>
                              )}
                            </td>

                            <td>
                              <span className={`access-type-pill ${res.access_type.toLowerCase()}`}>
                                {res.access_type === 'OPEN_ACCESS' ? 'Open Access' : res.access_type === 'INSTITUTIONAL' ? 'Institutional' : 'Restricted'}
                              </span>
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-mono)',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '12px',
                                  background: res.publication_status === 'PUBLISHED' ? '#ecfdf5' : res.publication_status === 'DRAFT' ? '#fef3c7' : '#f1f5f9',
                                  color: res.publication_status === 'PUBLISHED' ? '#047857' : res.publication_status === 'DRAFT' ? '#b45309' : '#475569',
                                  border: `1px solid ${res.publication_status === 'PUBLISHED' ? '#a7f3d0' : res.publication_status === 'DRAFT' ? '#fde68a' : '#cbd5e1'}`
                                }}>
                                  {res.publication_status}
                                </span>

                                <select
                                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem', border: '1px solid var(--border-light)', borderRadius: '4px', background: '#fff' }}
                                  value={res.publication_status}
                                  onChange={(e) => handleToggleStatus(res, e.target.value)}
                                  title="Change Publication Status"
                                >
                                  <option value="PUBLISHED">Publish</option>
                                  <option value="DRAFT">Draft</option>
                                  <option value="ARCHIVED">Archive</option>
                                </select>
                              </div>
                            </td>

                            <td>
                              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                <div><Eye size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> <strong>{res.views_count}</strong> views</div>
                                <div><Download size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} /> <strong>{res.downloads_count}</strong> downloads</div>
                              </div>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                                <button
                                  onClick={() => handleOpenEditResource(res)}
                                  className="sketch-action-btn"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                  title="Edit Resource Metadata"
                                >
                                  <Edit size={12} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => setDeleteResourceModal(res)}
                                  className="sketch-action-btn danger"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                  title="Delete Resource"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {digitalTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-light)', background: '#f8fafc' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Page {digitalPage} of {digitalTotalPages}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="sketch-action-btn"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                        disabled={digitalPage <= 1}
                        onClick={() => setDigitalPage(prev => Math.max(1, prev - 1))}
                      >
                        Previous
                      </button>
                      <button
                        className="sketch-action-btn"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                        disabled={digitalPage >= digitalTotalPages}
                        onClick={() => setDigitalPage(prev => Math.min(digitalTotalPages, prev + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>


      {/* ─────────────────────────────────────────────────────────────
          MODALS SECTION (SIGNATURE CLEAN LIGHT SKETCH THEME)
      ───────────────────────────────────────────────────────────── */}

      {/* 1. Modal: Cancel Seat Reservation */}
      {cancelBookingModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Cancel Seat Reservation</h3>
              <button onClick={() => setCancelBookingModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to cancel the reservation for Seat <strong style={{ fontFamily: 'var(--font-mono)', color: '#0f172a' }}>{cancelBookingModal.seat_number}</strong> booked by <strong>{cancelBookingModal.student_name}</strong>?
            </p>

            <form onSubmit={handleCancelReservation}>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
                <label className="form-label">Operational Reason for Cancellation *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Electrical maintenance, faculty inspection, floor cleaning..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="sketch-action-btn"
                  onClick={() => setCancelBookingModal(null)}
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="sketch-action-btn danger"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Execute Daily Reset */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Execute Daily Availability Reset</h3>
              <button onClick={() => setShowResetModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              This operation safely completes expired reservations for date <strong>{selectedDate}</strong>.
            </p>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#166534', marginBottom: '1.25rem' }}>
              ✓ Physical seats (360 count) are preserved.<br />
              ✓ Completed records remain in student history.<br />
              ✓ Action logged in administrative audit trail.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="sketch-action-btn"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleDailyReset}
                className="sketch-action-btn primary"
              >
                {resetting ? 'Resetting...' : 'Execute Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Add New Book */}
      {showAddBookModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '540px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Add New Book to Catalogue</h3>
              <button onClick={() => setShowAddBookModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBook}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Book Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Designing Data-Intensive Applications"
                    value={newBookForm.title}
                    onChange={(e) => setNewBookForm({ ...newBookForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Author *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Martin Kleppmann"
                    value={newBookForm.author}
                    onChange={(e) => setNewBookForm({ ...newBookForm, author: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ISBN *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 978-1449373320"
                    value={newBookForm.isbn}
                    onChange={(e) => setNewBookForm({ ...newBookForm, isbn: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={newBookForm.category}
                    onChange={(e) => setNewBookForm({ ...newBookForm, category: e.target.value })}
                    required
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Biotechnology">Biotechnology</option>
                    <option value="Literature & Humanities">Literature & Humanities</option>
                    <option value="General Reference">General Reference</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Initial Physical Copies *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="form-input"
                    value={newBookForm.copies_count}
                    onChange={(e) => setNewBookForm({ ...newBookForm, copies_count: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Shelf Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CS-RACK-03"
                    value={newBookForm.shelf_location}
                    onChange={(e) => setNewBookForm({ ...newBookForm, shelf_location: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="sketch-action-btn"
                  onClick={() => setShowAddBookModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="sketch-action-btn primary"
                >
                  {actionLoading ? 'Adding...' : 'Add Book to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Issue Book */}
      {showIssueModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Issue Book to Student</h3>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueBook}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Student Register / Roll Number *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 7376231IT101"
                  value={issueForm.roll_number}
                  onChange={(e) => setIssueForm({ ...issueForm, roll_number: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Book Copy Barcode *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. BIT-CO-0001-01"
                  value={issueForm.barcode}
                  onChange={(e) => setIssueForm({ ...issueForm, barcode: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Lending Duration (Days)</label>
                <select
                  className="form-input"
                  value={issueForm.lending_days}
                  onChange={(e) => setIssueForm({ ...issueForm, lending_days: parseInt(e.target.value) })}
                >
                  <option value={7}>7 Days (Short Loan)</option>
                  <option value={14}>14 Days (Standard Student Loan)</option>
                  <option value={21}>21 Days (Extended Research Loan)</option>
                  <option value={30}>30 Days (Faculty / Project Loan)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="sketch-action-btn"
                  onClick={() => setShowIssueModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="sketch-action-btn primary"
                >
                  {actionLoading ? 'Issuing...' : 'Confirm Book Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Review Discussion Room Request */}
      {roomDecisionModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {roomDecisionModal.action === 'APPROVE' ? 'Approve Discussion Room Request' : 'Reject Discussion Room Request'}
              </h3>
              <button onClick={() => setRoomDecisionModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              <div>Club: <strong>{roomDecisionModal.request.club_name}</strong></div>
              <div>Room: <strong>{roomDecisionModal.request.room?.name}</strong></div>
              <div>Slot: <strong>{roomDecisionModal.request.booking_date} (Session {roomDecisionModal.request.session_number})</strong></div>
              <div>Purpose: <em>{roomDecisionModal.request.purpose}</em></div>
            </div>

            <form onSubmit={handleReviewRoomRequest}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">
                  {roomDecisionModal.action === 'APPROVE' ? 'Approval Remarks (optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={roomDecisionModal.action === 'APPROVE' ? 'e.g. Approved. Please maintain cleanliness.' : 'e.g. Schedule conflict with department faculty meeting.'}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  required={roomDecisionModal.action === 'REJECT'}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="sketch-action-btn"
                  onClick={() => setRoomDecisionModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={roomDecisionModal.action === 'APPROVE' ? 'sketch-action-btn primary' : 'sketch-action-btn danger'}
                >
                  {actionLoading ? 'Processing...' : roomDecisionModal.action === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Student Record Drilldown */}
      {selectedStudentDrilldown && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Student Central Library Record</h3>
              <button onClick={() => setSelectedStudentDrilldown(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {!studentDetailsData ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading student profile...</div>
            ) : (
              <div>
                <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{studentDetailsData.student?.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Roll: {studentDetailsData.student?.roll_number} • {studentDetailsData.student?.email}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {studentDetailsData.student?.department} • Year {studentDetailsData.student?.year}
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Current Active Bookings:
                  </h4>
                  {studentDetailsData.active_bookings?.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No active seat reservations.</div>
                  ) : (
                    studentDetailsData.active_bookings?.map(b => (
                      <div key={b._id} style={{ fontSize: '0.78rem', padding: '0.5rem 0.75rem', background: '#eff6ff', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Seat {b.seat?.seat_number} (Floor {b.seat?.floor_number})</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{b.booking_date} (Session {b.session_number})</span>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    Current Borrowed Books:
                  </h4>
                  {studentDetailsData.active_loans?.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No active borrowed books.</div>
                  ) : (
                    studentDetailsData.active_loans?.map(l => (
                      <div key={l._id} style={{ fontSize: '0.78rem', padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{l.book?.title} (Barcode: {l.copy?.barcode})</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>Due: {new Date(l.due_date).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button
                    onClick={() => setSelectedStudentDrilldown(null)}
                    className="sketch-action-btn primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          11. Modal: Add / Edit Digital Resource
      ───────────────────────────────────────────────────────────── */}
      {showResourceModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingResource ? 'Edit Digital Resource' : 'Add New Digital Academic Resource'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  Curate educational materials, papers, lecture notes, or external links for BITSathy students.
                </p>
              </div>
              <button onClick={() => setShowResourceModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {resourceFormError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#991b1b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                <span>{resourceFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveResource}>
              <div className="form-group">
                <label className="form-label">Resource Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS8492 Database Management Systems Question Paper Nov/Dec 2024"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category * (8 Prescribed Categories)</label>
                  <select
                    className="form-input"
                    value={resourceForm.category}
                    onChange={(e) => setResourceForm({ ...resourceForm, category: e.target.value })}
                  >
                    <option value="E-books and Textbooks">1. E-books and Textbooks</option>
                    <option value="Research Papers and Journals">2. Research Papers and Journals</option>
                    <option value="Previous-Year Question Papers">3. Previous-Year Question Papers</option>
                    <option value="Lecture Notes and Study Materials">4. Lecture Notes and Study Materials</option>
                    <option value="Laboratory Manuals">5. Laboratory Manuals</option>
                    <option value="Programming and Technical Tutorials">6. Programming and Technical Tutorials</option>
                    <option value="Online Courses and Educational Videos">7. Online Courses and Educational Videos</option>
                    <option value="Other Academic Resources">8. Other Academic Resources</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Resource Format / Type *</label>
                  <select
                    className="form-input"
                    value={resourceForm.resource_type}
                    onChange={(e) => setResourceForm({ ...resourceForm, resource_type: e.target.value })}
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="EBOOK">E-book</option>
                    <option value="JOURNAL">Journal Reprints</option>
                    <option value="VIDEO">Video Course / Lecture</option>
                    <option value="EXTERNAL_LINK">External Web Link</option>
                    <option value="LAB_MANUAL">Lab Manual</option>
                    <option value="TUTORIAL">Technical Tutorial</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Author / Faculty Creator</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. Senthilkumar / Silberschatz"
                    value={resourceForm.author}
                    onChange={(e) => setResourceForm({ ...resourceForm, author: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Publisher / Institution</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. BITSathy / Pearson / IEEE"
                    value={resourceForm.publisher}
                    onChange={(e) => setResourceForm({ ...resourceForm, publisher: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Department</label>
                  <select
                    className="form-input"
                    value={resourceForm.department}
                    onChange={(e) => setResourceForm({ ...resourceForm, department: e.target.value })}
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                    <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Subject / Academic Domain</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Database Systems / Embedded Systems"
                    value={resourceForm.subject}
                    onChange={(e) => setResourceForm({ ...resourceForm, subject: e.target.value })}
                  />
                </div>
              </div>

              {/* Source Toggle: Upload File vs External URL */}
              <div style={{ background: '#f8fafc', border: '1.5px solid var(--border-light)', borderRadius: '8px', padding: '1rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sourceMode"
                      checked={resourceSourceMode === 'FILE'}
                      onChange={() => setResourceSourceMode('FILE')}
                    />
                    <span>Upload Document File (PDF, EPUB, DOC)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sourceMode"
                      checked={resourceSourceMode === 'URL'}
                      onChange={() => setResourceSourceMode('URL')}
                    />
                    <span>External Academic URL (HTTPS)</span>
                  </label>
                </div>

                {resourceSourceMode === 'FILE' ? (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.epub,.doc,.docx,.ppt,.pptx,.zip,.txt"
                      className="form-input"
                      onChange={(e) => setSelectedUploadFile(e.target.files[0] || null)}
                    />
                    {editingResource?.file_reference && !selectedUploadFile && (
                      <p style={{ fontSize: '0.72rem', color: '#059669', marginTop: '0.35rem' }}>
                        Current file on server: <strong>{editingResource.file_reference.original_name}</strong>. Choose new file only to replace it.
                      </p>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Supported formats: PDF, EPUB, DOC, PPT, ZIP (Max: 50MB). Stored securely on server.
                    </span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://nptel.ac.in/courses/... or https://arxiv.org/abs/..."
                      value={resourceForm.external_url}
                      onChange={(e) => setResourceForm({ ...resourceForm, external_url: e.target.value })}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Enter legitimate academic URL. Safe HTTPS protocol required.
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Access Level</label>
                  <select
                    className="form-input"
                    value={resourceForm.access_type}
                    onChange={(e) => setResourceForm({ ...resourceForm, access_type: e.target.value })}
                  >
                    <option value="INSTITUTIONAL">Institutional (@bitsathy)</option>
                    <option value="OPEN_ACCESS">Open Access (Public)</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Publication Status</label>
                  <select
                    className="form-input"
                    value={resourceForm.publication_status}
                    onChange={(e) => setResourceForm({ ...resourceForm, publication_status: e.target.value })}
                  >
                    <option value="PUBLISHED">Published (Live)</option>
                    <option value="DRAFT">Draft (Hidden)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Year of Publication</label>
                  <input
                    type="number"
                    className="form-input"
                    value={resourceForm.publication_year}
                    onChange={(e) => setResourceForm({ ...resourceForm, publication_year: parseInt(e.target.value) || 2024 })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Description & Academic Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Outline topics covered, key concepts, syllabus relevance..."
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Subject Tags & Keywords (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Database, SQL, RDBMS, Autonomous, Anna University"
                  value={resourceForm.tags}
                  onChange={(e) => setResourceForm({ ...resourceForm, tags: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="sketch-action-btn"
                  onClick={() => setShowResourceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="sketch-action-btn primary"
                >
                  {actionLoading ? 'Saving...' : editingResource ? 'Update Catalogue Entry' : 'Save & Publish Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          12. Modal: Delete Digital Resource Confirmation
      ───────────────────────────────────────────────────────────── */}
      {deleteResourceModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Delete Digital Resource</h3>
              <button onClick={() => setDeleteResourceModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>"{deleteResourceModal.title}"</strong> ({deleteResourceModal.category})?
            </p>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#991b1b', marginBottom: '1.25rem' }}>
              ⚠️ This will remove the resource from the student catalogue and delete any associated bookmarks. Action is logged in the administrative audit trail.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="sketch-action-btn"
                onClick={() => setDeleteResourceModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteResource}
                className="sketch-action-btn danger"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

