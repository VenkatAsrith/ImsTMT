import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { Plus, UserPlus, Eye, Trash2 } from 'lucide-react';

const InternList = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Org Space',
    joinDate: '',
    role: '',
  });
  const [submitError, setSubmitError] = useState('');

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/interns?limit=100');
      if (res && res.data) {
        setInterns(res.data.interns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const res = await apiFetch('/api/interns', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res && res.data) {
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          department: 'Org Space',
          joinDate: '',
          role: '',
        });
        fetchInterns();
      }
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const deleteIntern = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove intern "${name}"?`)) return;
    try {
      await apiFetch(`/api/interns/${id}`, { method: 'DELETE' });
      fetchInterns();
    } catch (err) {
      alert(err.message);
    }
  };

  // Define table columns
  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate(`/org/interns/${row._id}`)}>
          <div style={avatarStyles}>
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600' }}>{row.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => <span className="badge badge-info">{row.department}</span>
    },
    {
      header: 'Role / Title',
      accessor: 'role',
    },
    {
      header: 'Joining Date',
      accessor: 'joinDate',
      render: (row) => new Date(row.joinDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        let badgeClass = 'badge-muted';
        if (row.status === 'Active') badgeClass = 'badge-success';
        if (row.status === 'Onboarding Pending') badgeClass = 'badge-warning';
        if (row.status === 'Probation') badgeClass = 'badge-info';
        if (row.status === 'Terminated') badgeClass = 'badge-danger';
        
        return <span className={`badge ${badgeClass}`}>{row.status}</span>;
      }
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => navigate(`/org/interns/${row._id}`)} 
            className="btn btn-secondary" 
            style={{ padding: '6px 10px' }}
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button 
            onClick={() => deleteIntern(row._id, row.name)} 
            className="btn btn-secondary" 
            style={{ padding: '6px 10px', color: 'var(--danger)' }}
            title="Delete Intern"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  const filterOptions = [
    { label: 'Org Space', value: 'Org Space' },
    { label: 'Learning Space', value: 'Learning Space' },
    { label: 'Marketing Space', value: 'Marketing Space' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Intern Directory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage the complete lifecycle, onboarding procedures, and performance parameters of interns.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Intern</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading intern list database...</div>
      ) : (
        <div className="glass-card" style={{ padding: '20px' }}>
          <Table
            columns={columns}
            data={interns}
            searchPlaceholder="Search interns by name/email..."
            filterOptions={filterOptions}
            onFilterChange={(val) => {
              // External filtering is supported internally by search logic in Table
            }}
          />
        </div>
      )}

      {/* Add Intern Form Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Intern">
        <form onSubmit={handleAddSubmit} style={formStyles}>
          {submitError && (
            <div style={errorBannerStyles}>{submitError}</div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Clark Kent"
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. clark@techmechatorque.com"
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +1 555-0100"
            />
          </div>

          <div style={rowGridStyles}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Department</label>
              <select
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Org Space">Org Space</option>
                <option value="Learning Space">Learning Space</option>
                <option value="Marketing Space">Marketing Space</option>
              </select>
            </div>

            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Join Date</label>
              <input
                type="date"
                className="form-control"
                required
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Role / Position Title</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g. Frontend Engineering Intern"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
            <UserPlus size={16} />
            <span>Register & Initialize Onboarding</span>
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- Styles objects ---
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
  border: '1px solid var(--primary)',
  color: 'white',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
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

export default InternList;
