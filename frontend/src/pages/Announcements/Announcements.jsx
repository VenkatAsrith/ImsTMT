import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { Megaphone, Plus, BellRing, Inbox } from 'lucide-react';

const Announcements = () => {
  const { user, apiFetch } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('Info');
  const [submitError, setSubmitError] = useState('');

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/notifications');
      if (res && res.data) {
        // filter notifications targeting recipientRole: 'All'
        const filtered = res.data.filter((n) => n.recipientRole === 'All');
        setAnnouncements(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const response = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title, message, type, recipientRole: 'All' })
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to post announcement');
      }

      setIsModalOpen(false);
      setTitle('');
      setMessage('');
      fetchAnnouncements();
      alert('Announcement broadcasted successfully!');
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const isHRorAdmin = ['Super Admin', 'HR Manager'].includes(user?.role);

  return (
    <div className="animate-fade-in">
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Notice Board</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Company-wide broadcasts, updates, policy alterations, and event postings.</p>
        </div>
        {isHRorAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading notices...</div>
      ) : announcements.length === 0 ? (
        <div className="glass-card" style={emptyCardStyles}>
          <Inbox size={44} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3>No Announcements Posted</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Check back later or click "Post Announcement" if you have HR credentials.</p>
        </div>
      ) : (
        <div style={noticesGridStyles}>
          {announcements.map((post) => (
            <div key={post._id} className="glass-card animate-fade-in" style={postCardStyles}>
              <div style={postHeaderStyles}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone size={16} style={{ color: 'var(--primary)' }} />
                  <span style={postTitleStyles}>{post.title}</span>
                </div>
                <span style={timeStyles}>{new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p style={postMsgStyles}>{post.message}</p>
              <span className={`badge ${
                post.type === 'Warning' ? 'badge-warning' :
                post.type === 'Alert' ? 'badge-danger' :
                post.type === 'Success' ? 'badge-success' : 'badge-info'
              }`} style={{ alignSelf: 'flex-start', fontSize: '10px' }}>
                {post.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Broadcast Announcement">
        <form onSubmit={handleSubmit} style={formStyles}>
          {submitError && (
            <div style={errorBannerStyles}>{submitError}</div>
          )}

          <div className="form-group">
            <label>Subject / Title</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Scheduled System Upgrades Maintenance" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Category Severity</label>
            <select 
              className="form-control" 
              value={type} 
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Info">Information (Blue)</option>
              <option value="Success">Success (Green)</option>
              <option value="Warning">Warning (Orange)</option>
              <option value="Alert">Urgent / Alert (Red)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Announcement Message</label>
            <textarea 
              className="form-control" 
              rows="6" 
              placeholder="Draft the message content here. This will notify all logged-in staff members." 
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
            <BellRing size={16} />
            <span>Broadcast Announcement</span>
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

const emptyCardStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 20px',
  textAlign: 'center',
};

const noticesGridStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const postCardStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const postHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '8px',
};

const postTitleStyles = {
  fontWeight: '600',
  fontSize: '14.5px',
};

const timeStyles = {
  fontSize: '11px',
  color: 'var(--text-muted)',
};

const postMsgStyles = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
  lineHeight: '1.5',
};

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
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

export default Announcements;
