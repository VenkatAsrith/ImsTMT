import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { Plus, Building, User, Eye } from 'lucide-react';

const ClientList = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [source, setSource] = useState('Direct Outreach');
  const [submitError, setSubmitError] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/clients?limit=100');
      if (res && res.data) {
        setClients(res.data.clients || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const newClient = {
        companyName,
        industry,
        priority,
        source,
        contacts: contactName ? [{ name: contactName, email: contactEmail, phone: contactPhone }] : [],
      };

      const res = await apiFetch('/api/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
      });

      if (res && res.data) {
        setIsAddModalOpen(false);
        setCompanyName('');
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        fetchClients();
      }
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const columns = [
    {
      header: 'Company Name',
      accessor: 'companyName',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate(`/marketing/clients/${row._id}`)}>
          <div style={avatarStyles}>
            <Building size={16} />
          </div>
          <span style={{ fontWeight: '600' }}>{row.companyName}</span>
        </div>
      ),
    },
    {
      header: 'Primary Contact',
      accessor: 'contacts',
      render: (row) => {
        const primary = row.contacts && row.contacts[0];
        if (!primary) return <span style={{ color: 'var(--text-muted)' }}>No contact listed</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{primary.name}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{primary.email || primary.phone}</span>
          </div>
        );
      }
    },
    {
      header: 'Industry',
      accessor: 'industry',
    },
    {
      header: 'Account Priority',
      accessor: 'priority',
      render: (row) => {
        let badgeClass = 'badge-muted';
        if (row.priority === 'High') badgeClass = 'badge-danger';
        if (row.priority === 'Medium') badgeClass = 'badge-warning';
        if (row.priority === 'Low') badgeClass = 'badge-success';

        return <span className={`badge ${badgeClass}`}>{row.priority}</span>;
      }
    },
    {
      header: 'CRM Health Score',
      accessor: 'healthScore',
      render: (row) => {
        const score = row.healthScore || 0;
        let color = 'var(--success)';
        if (score < 50) color = 'var(--danger)';
        else if (score < 75) color = 'var(--warning)';

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '40px', height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${score}%`, height: '100%', backgroundColor: color }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color }}>{score}%</span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (row) => (
        <button 
          onClick={() => navigate(`/marketing/clients/${row._id}`)} 
          className="btn btn-secondary" 
          style={{ padding: '6px 10px' }}
        >
          <Eye size={14} style={{ marginRight: '6px' }} />
          <span>Profile</span>
        </button>
      )
    }
  ];

  const filterOptions = [
    { label: 'Technology', value: 'Technology' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Design', value: 'Design' },
    { label: 'Business', value: 'Business' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>CRM B2B Client Accounts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track accounts, corporate points of contact, health metrics, and prioritize corporate relations.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Client Company</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading client catalog...</div>
      ) : (
        <div className="glass-card" style={{ padding: '20px' }}>
          <Table
            columns={columns}
            data={clients}
            searchPlaceholder="Search company names or industry..."
            filterOptions={filterOptions}
          />
        </div>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register B2B Company Account">
        <form onSubmit={handleAddSubmit} style={formStyles}>
          {submitError && (
            <div style={errorBannerStyles}>{submitError}</div>
          )}

          <div className="form-group">
            <label>Company Legal Name</label>
            <input
              type="text"
              className="form-control"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Stark Industries"
            />
          </div>

          <div style={rowGridStyles}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Industry</label>
              <select className="form-control" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="Technology">Technology</option>
                <option value="Operations">Operations</option>
                <option value="Design">Design</option>
                <option value="Business">Business</option>
              </select>
            </div>

            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Account Priority</label>
              <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Lead Acquisition Channel</label>
            <select className="form-control" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="Direct Outreach">Direct Outreach</option>
              <option value="Referral">Referral</option>
              <option value="Inbound">Inbound</option>
              <option value="LinkedIn">LinkedIn</option>
            </select>
          </div>

          <div style={contactBlockStyles}>
            <span style={contactHeaderStyles}>Primary Contact Info (Optional)</span>
            <div className="form-group">
              <label>Contact Person Name</label>
              <input
                type="text"
                className="form-control"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Pepper Potts"
              />
            </div>
            <div style={rowGridStyles}>
              <div className="form-group" style={{ flexGrow: 1 }}>
                <label>Contact Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="pepper@stark.com"
                />
              </div>
              <div className="form-group" style={{ flexGrow: 1 }}>
                <label>Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="555-3000"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '14px' }}>
            <Plus size={16} />
            <span>Create B2B Account</span>
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
  width: '30px',
  height: '30px',
  borderRadius: '6px',
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

const contactBlockStyles = {
  border: '1px solid var(--glass-border)',
  backgroundColor: 'rgba(255,255,255,0.01)',
  padding: '16px',
  borderRadius: '8px',
  marginTop: '10px',
};

const contactHeaderStyles = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  color: 'var(--primary)',
  marginBottom: '12px',
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

export default ClientList;
