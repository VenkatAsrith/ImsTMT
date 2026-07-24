import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { Plus, GraduationCap, ArrowRight, IndianRupee, Trash2 } from 'lucide-react';

const StudentList = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);

  // Add Student modal form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [onboardingStage, setOnboardingStage] = useState('Inquiry Received');
  const [status, setStatus] = useState('Registered');
  const [startDate, setStartDate] = useState('');
  const [assignedMentor, setAssignedMentor] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Financial fields inside Admission Modal
  const [courseFee, setCourseFee] = useState('');
  const [financialRemarks, setFinancialRemarks] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onboardingStageFilter, setOnboardingStageFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = '/api/students?limit=1000'; // Default larger limit for dev client-side filtering
      if (totalStudents > 500) {
        url = `/api/students?search=${searchTerm}&status=${statusFilter}&onboardingStage=${onboardingStageFilter}&category=${categoryFilter}&page=${currentPage}&limit=50`;
      }
      const res = await apiFetch(url);
      if (res && res.data) {
        setStudents(res.data.students || []);
        setTotalStudents(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, statusFilter, onboardingStageFilter, categoryFilter, currentPage]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const res = await apiFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify({ 
          name, 
          email, 
          phone, 
          onboardingStage, 
          status, 
          startDate: startDate || undefined, 
          assignedMentor: assignedMentor || undefined,
          courseFee: parseFloat(courseFee) || 0,
          scholarshipAmount: 0,
          financialRemarks,
          nextDueDate: nextDueDate || undefined
        }),
      });
      if (res && res.data) {
        setIsAddModalOpen(false);
        setName('');
        setEmail('');
        setPhone('');
        setStartDate('');
        setAssignedMentor('');
        setCourseFee('');
        setFinancialRemarks('');
        setNextDueDate('');
        fetchStudents();
      }
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const filteredStudents = React.useMemo(() => {
    if (totalStudents > 500) {
      return students;
    }
    return students.filter(student => {
      // 1. Text search
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const matchName = student.name && student.name.toLowerCase().includes(lowerSearch);
        const matchEmail = student.email && student.email.toLowerCase().includes(lowerSearch);
        if (!matchName && !matchEmail) return false;
      }
      // 2. Status
      if (statusFilter && student.status !== statusFilter) {
        return false;
      }
      // 3. Onboarding Stage
      if (onboardingStageFilter && student.onboardingStage !== onboardingStageFilter) {
        return false;
      }
      // 4. Category
      if (categoryFilter) {
        const hasCategory = student.coursesTaken && student.coursesTaken.some(c => 
          c.courseId && c.courseId.category === categoryFilter
        );
        if (!hasCategory) return false;
      }
      return true;
    });
  }, [students, searchTerm, statusFilter, onboardingStageFilter, categoryFilter, totalStudents]);

  const columns = [
    {
      header: 'Student Name',
      accessor: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate(`/learning/students/${row._id}`)}>
          <div style={avatarStyles}>
            <GraduationCap size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600' }}>{row.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Start Date',
      accessor: 'startDate',
      render: (row) => row.startDate ? new Date(row.startDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : <span style={{ color: 'var(--text-muted)' }}>Not Set</span>
    },
    {
      header: 'Mentor',
      accessor: 'assignedMentor',
      render: (row) => row.assignedMentor || <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      header: 'Enrolled Courses',
      accessor: 'coursesTaken',
      render: (row) => {
        const count = row.coursesTaken?.length || 0;
        if (count === 0) return <span style={{ color: 'var(--text-muted)' }}>None enrolled</span>;
        return (
          <span style={{ fontSize: '13px', fontWeight: '500' }}>
            {count} Course{count > 1 ? 's' : ''}
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        let badgeClass = 'badge-muted';
        if (row.status === 'Enrolled') badgeClass = 'badge-success';
        if (row.status === 'Registered') badgeClass = 'badge-warning';
        if (row.status === 'Alumni') badgeClass = 'badge-info';

        return <span className={`badge ${badgeClass}`}>{row.status}</span>;
      }
    },
    {
      header: 'Payment',
      accessor: 'financialAccount.paymentStatus',
      render: (row) => {
        const ps = row.financialAccount?.paymentStatus || 'Unpaid';
        let badgeClass = 'badge-muted';
        if (ps === 'Paid') badgeClass = 'badge-success';
        if (ps === 'Partially Paid') badgeClass = 'badge-info';
        if (ps === 'Fee Pending') badgeClass = 'badge-warning';
        if (ps === 'Unpaid') badgeClass = 'badge-danger';
        return <span className={`badge ${badgeClass}`}>{ps}</span>;
      }
    },
    {
      header: 'Balance',
      accessor: 'financialAccount.balanceAmount',
      render: (row) => {
        const bal = row.financialAccount?.balanceAmount || 0;
        return (
          <span style={{ 
            fontWeight: 'bold', 
            color: bal > 0 ? 'var(--danger)' : 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            <IndianRupee size={14} />
            {bal.toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate(`/learning/students/${row._id}`)} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>View</span>
            <ArrowRight size={14} />
          </button>
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to permanently delete student "${row.name}"? This will also delete all associated payments and receipts.`)) {
                try {
                  await apiFetch(`/api/students/${row._id}`, { method: 'DELETE' });
                  fetchStudents();
                } catch (err) {
                  alert(`Failed to delete student: ${err.message}`);
                }
              }
            }} 
            className="btn btn-secondary" 
            style={{ padding: '6px', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Delete Student"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  const filterOptions = [
    { label: 'Registered', value: 'Registered' },
    { label: 'Enrolled', value: 'Enrolled' },
    { label: 'Alumni', value: 'Alumni' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Students Directory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track admissions, course catalog selections, registration pipelines, outstanding fee collections, and certifications.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Admit Student</span>
        </button>
      </div>

      {/* Custom Multiple Dropdowns Filters Panel */}
      <div style={filterPanelStyles} className="glass-card">
        <input
          type="text"
          placeholder="Search name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
          style={filterInputStyles}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-control"
          style={filterSelectStyles}
        >
          <option value="">All Statuses</option>
          <option value="Registered">Registered</option>
          <option value="Enrolled">Enrolled</option>
          <option value="Alumni">Alumni</option>
        </select>

        <select
          value={onboardingStageFilter}
          onChange={(e) => setOnboardingStageFilter(e.target.value)}
          className="form-control"
          style={filterSelectStyles}
        >
          <option value="">All Onboarding Stages</option>
          <option value="Inquiry Received">Inquiry Received</option>
          <option value="Registered">Registered</option>
          <option value="Fee Pending">Fee Pending</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Paid</option>
          <option value="Enrolled">Enrolled</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-control"
          style={filterSelectStyles}
        >
          <option value="">All Categories</option>
          <option value="Development">Development (Coding)</option>
          <option value="Design">Design (UI/UX)</option>
          <option value="Marketing">Marketing (Growth)</option>
          <option value="Business">Business (Sales)</option>
          <option value="Operations">Operations (Management)</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading student profiles...</div>
      ) : (
        <div className="glass-card" style={{ padding: '20px' }}>
          <Table
            columns={columns}
            data={filteredStudents}
            showSearch={false}
            showFilterDropdown={false}
          />
        </div>
      )}

      {/* Admit Student Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Admit New Student">
        <form onSubmit={handleAddSubmit} style={formStyles}>
          {submitError && (
            <div style={errorBannerStyles}>{submitError}</div>
          )}

          <div className="form-group">
            <label>Student Full Name</label>
            <input
              type="text"
              className="form-control"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sai Kiran"
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@email.com"
            />
          </div>

          <div className="form-group">
            <label>Phone Number (with Country Code for WhatsApp)</label>
            <input
              type="text"
              className="form-control"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 919876543210"
            />
          </div>

          <div style={rowGridStyles}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Assigned Mentor</label>
              <input
                type="text"
                className="form-control"
                value={assignedMentor}
                onChange={(e) => setAssignedMentor(e.target.value)}
                placeholder="e.g. Jaychandra"
              />
            </div>
          </div>

          <div style={rowGridStyles}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Onboarding Pipeline Stage</label>
              <select className="form-control" value={onboardingStage} onChange={(e) => setOnboardingStage(e.target.value)}>
                <option value="Inquiry Received">Inquiry Received</option>
                <option value="Registered">Registered</option>
                <option value="Fee Pending">Fee Pending</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Status</label>
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Registered">Registered</option>
                <option value="Enrolled">Enrolled</option>
              </select>
            </div>
          </div>

          <div style={rowGridStyles}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Course Fee (INR)</label>
              <input
                type="number"
                className="form-control"
                value={courseFee}
                onChange={(e) => setCourseFee(e.target.value)}
                placeholder="e.g. 15000"
              />
            </div>
          </div>

          <div style={rowGridStyles}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Next Due Date</label>
              <input
                type="date"
                className="form-control"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Financial Remarks</label>
              <input
                type="text"
                className="form-control"
                value={financialRemarks}
                onChange={(e) => setFinancialRemarks(e.target.value)}
                placeholder="e.g. Paid first installment"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
            <Plus size={16} />
            <span>Admit Student Profile</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- Styles objects ---
const filterPanelStyles = {
  display: 'flex',
  gap: '12px',
  padding: '16px',
  marginBottom: '16px',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const filterInputStyles = {
  flexGrow: 1,
  minWidth: '200px',
  maxWidth: '300px',
};

const filterSelectStyles = {
  minWidth: '160px',
  cursor: 'pointer',
};

const headerStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  flexWrap: 'wrap',
  gap: '16px',
};

const avatarStyles = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary-glow)',
  color: 'var(--primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

const rowGridStyles = {
  display: 'flex',
  gap: '16px',
};

const errorBannerStyles = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: 'var(--danger)',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  marginBottom: '20px',
  fontWeight: '500',
  textAlign: 'center',
};

export default StudentList;
