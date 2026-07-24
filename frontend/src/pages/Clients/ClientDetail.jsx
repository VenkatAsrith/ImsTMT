import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  FileText, 
  Activity, 
  MessageSquare, 
  IndianRupee, 
  Plus,
  Trash2,
  Calendar,
  Tag
} from 'lucide-react';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [client, setClient] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [timeline, setTimeline] = useState([]);

  // Contacts modal & form
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Deals modal & form
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealName, setDealName] = useState('');
  const [dealAmount, setDealAmount] = useState('');
  const [dealStage, setDealStage] = useState('New');

  // Comments state
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);

  // Document upload mock
  const [docFile, setDocFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [docs, setDocs] = useState([]);

  const fetchClientDetails = async () => {
    try {
      const res = await apiFetch(`/api/clients/${id}`);
      if (res && res.data) {
        setClient(res.data);
      }

      // Fetch deals matching this client
      const dealsRes = await apiFetch('/api/deals');
      if (dealsRes && dealsRes.data) {
        const filtered = dealsRes.data.filter((d) => d.clientId?._id === id || d.clientId === id);
        setDeals(filtered);
      }

      // Load audit timeline logs
      const auditsRes = await apiFetch('/api/automations/audits');
      if (auditsRes && auditsRes.data) {
        const filtered = auditsRes.data.filter((a) => a.entityId === id);
        setTimeline(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
    // Seed initial mock comments & docs
    setComments([
      { author: 'Michael Scott', text: 'Spoke with Bruce. Interested in standard licenses scaling.', date: new Date(Date.now() - 3600000) },
      { author: 'Jim Halpert', text: 'Proposal sent over, awaiting feedback on operations structure.', date: new Date(Date.now() - 7200000) }
    ]);
    setDocs([
      { name: 'Wayne Master Agreement.pdf', size: '1.2 MB', date: new Date('2026-03-01') },
      { name: 'Wayne Consulting Proposal V2.pdf', size: '420 KB', date: new Date('2026-05-15') }
    ]);
  }, [id]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/clients/${id}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ name: contactName, email: contactEmail, phone: contactPhone }),
      });
      if (res && res.data) {
        setIsContactModalOpen(false);
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        fetchClientDetails();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddDeal = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/deals', {
        method: 'POST',
        body: JSON.stringify({
          clientId: id,
          dealName,
          amount: parseFloat(dealAmount),
          stage: dealStage,
        }),
      });
      if (res && res.data) {
        setIsDealModalOpen(false);
        setDealName('');
        setDealAmount('');
        fetchClientDetails();
        alert('New sales deal registered in pipeline!');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setComments((prev) => [
      { author: 'Active Sales Rep', text: commentText, date: new Date() },
      ...prev,
    ]);
    setCommentText('');
  };

  const handleMockDocUpload = (e) => {
    e.preventDefault();
    if (!docName) return;
    setDocs((prev) => [
      { name: docName, size: 'MOCK SIZE', date: new Date() },
      ...prev,
    ]);
    setDocName('');
    alert('Mock document stored in attachments database.');
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading client details CRM profile...</div>;
  if (!client) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--danger)' }}>Client account not found!</div>;

  return (
    <div className="animate-fade-in">
      <div style={topBarStyles}>
        <button onClick={() => navigate('/marketing/clients')} className="btn btn-secondary" style={backBtnStyles}>
          <ArrowLeft size={16} />
          <span>Back to Accounts</span>
        </button>
        <div style={metaBadgeContainerStyles}>
          <span className="badge badge-info">{client.industry}</span>
          <span className={`badge ${client.priority === 'High' ? 'badge-danger' : 'badge-warning'}`}>
            Priority: {client.priority}
          </span>
        </div>
      </div>

      <div style={profileHeaderCardStyles} className="glass-card">
        <div style={headerMainStyles}>
          <div style={avatarLargeStyles}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 style={{ marginBottom: '4px' }}>{client.companyName}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>CRM Health Score: <strong>{client.healthScore || 0}%</strong> | Marketing Source: {client.source}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-header">
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <Users size={14} style={{ marginRight: '6px' }} />
          Account Profile
        </button>
        <button className={`tab-btn ${activeTab === 'deals' ? 'active' : ''}`} onClick={() => setActiveTab('deals')}>
          <IndianRupee size={14} style={{ marginRight: '6px' }} />
          Linked Deals ({deals.length})
        </button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          <FileText size={14} style={{ marginRight: '6px' }} />
          Documents ({docs.length})
        </button>
        <button className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
          <Activity size={14} style={{ marginRight: '6px' }} />
          Timeline Feed
        </button>
        <button className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>
          <MessageSquare size={14} style={{ marginRight: '6px' }} />
          Notes & Comments ({comments.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div style={tabContentStyles}>
        {/* Tab 1: Profile & Contacts */}
        {activeTab === 'profile' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <h3 style={sectionTitleStyles}>Company Summary</h3>
              <div style={detailsGridStyles}>
                <p><strong>Corporate Name:</strong> {client.companyName}</p>
                <p><strong>Industry:</strong> {client.industry}</p>
                <p><strong>Acquisition Channel:</strong> {client.source}</p>
                <p><strong>Account Health Rating:</strong> {client.healthScore}%</p>
              </div>

              {client.tags?.length > 0 && (
                <div style={tagsContainerStyles}>
                  <strong>Tags:</strong>
                  {client.tags.map((tag, idx) => (
                    <span key={idx} className="badge badge-info" style={{ fontSize: '10px' }}>
                      <Tag size={10} style={{ marginRight: '4px' }} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ minWidth: '340px' }}>
              <div style={sectionHeaderStyles}>
                <h3 style={{ margin: 0 }}>Point of Contacts</h3>
                <button onClick={() => setIsContactModalOpen(true)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                  Add Contact
                </button>
              </div>

              {(!client.contacts || client.contacts.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>No contacts listed for this company.</p>
              ) : (
                <div style={contactListStyles}>
                  {client.contacts.map((c, idx) => (
                    <div key={idx} style={contactItemStyles}>
                      <div style={avatarSmallStyles}>{c.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>{c.name}</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email: {c.email || 'N/A'}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Phone: {c.phone || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Deals */}
        {activeTab === 'deals' && (
          <div className="glass-card">
            <div style={sectionHeaderStyles}>
              <h3 style={{ margin: 0 }}>CRM Sales Deals</h3>
              <button onClick={() => setIsDealModalOpen(true)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                Create Deal Card
              </button>
            </div>

            {deals.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No sales deals registered in pipeline for this client.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {deals.map((deal) => (
                  <div key={deal._id} style={dealRowStyles}>
                    <div>
                      <span style={{ fontWeight: '600' }}>{deal.dealName}</span>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Stage: <strong style={{ color: 'var(--primary)' }}>{deal.stage}</strong> | Probability: {deal.probability}%
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                        ₹{deal.amount.toLocaleString('en-IN')}
                      </span>
                      <button 
                        onClick={() => navigate('/marketing/pipeline')} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        Pipeline Board
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Documents */}
        {activeTab === 'documents' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <h3 style={sectionTitleStyles}>Legal Files & Proposals</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {docs.map((doc, idx) => (
                  <div key={idx} style={docRowStyles}>
                    <FileText size={18} style={{ color: 'var(--primary)' }} />
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontWeight: '500' }}>{doc.name}</span>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>File Size: {doc.size} | Uploaded: {new Date(doc.date).toLocaleDateString()}</p>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ minWidth: '320px' }}>
              <h3 style={sectionTitleStyles}>Attach Document</h3>
              <form onSubmit={handleMockDocUpload}>
                <div className="form-group">
                  <label>Document Label / Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Wayne Proposal Signed"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Choose File</label>
                  <input type="file" className="form-control" />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Upload Document
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Timeline Feed */}
        {activeTab === 'timeline' && (
          <div className="glass-card">
            <h3 style={sectionTitleStyles}>CRM Activity Stream</h3>
            {timeline.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No recent activities logged on client account.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {timeline.map((item) => (
                  <div key={item._id} style={timelineRowStyles}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-info">{item.action}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '4px 0', fontSize: '13px' }}>{item.details}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Logged by user: {item.userName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Comments */}
        {activeTab === 'comments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card">
              <h3 style={sectionTitleStyles}>Write Comment Note</h3>
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Record call updates, follow-up resolutions, or notes..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary">
                  <span>Comment</span>
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {comments.map((c, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '12px' }}>{c.author}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(c.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <Modal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} title="Add Contact Person">
        <form onSubmit={handleAddContact} style={formStyles}>
          <div className="form-group">
            <label>Contact Name</label>
            <input
              type="text"
              className="form-control"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Tony Stark"
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="tony@stark.com"
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              className="form-control"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="555-4000"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Save Contact
          </button>
        </form>
      </Modal>

      {/* Add Deal Modal */}
      <Modal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} title="Register Sales Deal">
        <form onSubmit={handleAddDeal} style={formStyles}>
          <div className="form-group">
            <label>Deal Name / Project Title</label>
            <input
              type="text"
              className="form-control"
              required
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              placeholder="e.g. Phase 2 CRM Licenses Integration"
            />
          </div>
          <div className="form-group">
            <label>Deal Sizing / Amount (INR)</label>
            <input
              type="number"
              className="form-control"
              required
              value={dealAmount}
              onChange={(e) => setDealAmount(e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>
          <div className="form-group">
            <label>Pipeline Pipeline Stage</label>
            <select className="form-control" value={dealStage} onChange={(e) => setDealStage(e.target.value)}>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Register Deal Card
          </button>
        </form>
      </Modal>
    </div>
  );
};

// --- Styles objects ---
const topBarStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};

const backBtnStyles = {
  padding: '8px 16px',
};

const metaBadgeContainerStyles = {
  display: 'flex',
  gap: '10px',
};

const profileHeaderCardStyles = {
  padding: '24px',
  marginBottom: '24px',
};

const headerMainStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
};

const avatarLargeStyles = {
  width: '54px',
  height: '54px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary-glow)',
  color: 'var(--primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const tabContentStyles = {
  marginTop: '20px',
};

const panelGridStyles = {
  display: 'flex',
  gap: '24px',
  flexWrap: 'wrap',
};

const sectionTitleStyles = {
  fontSize: '1rem',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '10px',
  marginBottom: '16px',
};

const detailsGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
};

const tagsContainerStyles = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  marginTop: '20px',
};

const sectionHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '10px',
  marginBottom: '16px',
};

const contactListStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const contactItemStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.01)',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const avatarSmallStyles = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary)',
  color: 'white',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
};

const dealRowStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.01)',
  padding: '14px 20px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const docRowStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  backgroundColor: 'rgba(255,255,255,0.01)',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const timelineRowStyles = {
  backgroundColor: 'rgba(255,255,255,0.01)',
  border: '1px solid var(--glass-border)',
  padding: '10px 14px',
  borderRadius: '8px',
};

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

export default ClientDetail;
