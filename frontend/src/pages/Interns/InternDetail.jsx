import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  LineChart as ChartIcon, 
  Mail, 
  History, 
  Upload, 
  Send,
  Plus,
  Trash2,
  Download,
  Eye,
  ExternalLink
} from 'lucide-react';
import DocumentGenerator from './DocumentGenerator';

const InternDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  
  const [intern, setIntern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [audits, setAudits] = useState([]);

  // Tab 1: Profile states
  const [updating, setUpdating] = useState(false);

  // Tab 2: Document upload states
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState(null);

  // Tab 3: Performance states
  const [ratingMonth, setRatingMonth] = useState('Jan 2026');
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingNotes, setRatingNotes] = useState('');
  const [addingRating, setAddingRating] = useState(false);

  // Tab 4: Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  // Submissions states
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subCategory, setSubCategory] = useState('Assignment');
  const [subRemarks, setSubRemarks] = useState('');
  const [subFile, setSubFile] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState({});

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await apiFetch(`/api/interns/${id}/submissions`);
      if (res && res.data) {
        setSubmissions(res.data);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSubmissionUpload = async (e) => {
    e.preventDefault();
    if (!subFile) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('document', subFile);
      formData.append('title', subTitle || subFile.name);
      formData.append('category', subCategory);
      formData.append('remarks', subRemarks);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/interns/${id}/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to upload submission');
      }

      setSubTitle('');
      setSubCategory('Assignment');
      setSubRemarks('');
      setSubFile(null);
      fetchSubmissions();
      fetchInternDetails();
      alert('Submission uploaded successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmission = async (subId, status) => {
    const remarks = reviewRemarks[subId] || '';
    if (!window.confirm(`Are you sure you want to mark this submission as ${status}?`)) return;
    try {
      const res = await apiFetch(`/api/interns/${id}/submissions/${subId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          reviewerRemarks: remarks,
        }),
      });
      if (res && res.data) {
        setReviewRemarks(prev => {
          const updated = { ...prev };
          delete updated[subId];
          return updated;
        });
        fetchSubmissions();
        fetchInternDetails();
        alert(`Submission status updated to ${status}`);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchInternDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/interns/${id}`);
      if (res && res.data) {
        setIntern(res.data);
      }

      // Fetch audit logs matching this intern
      const auditRes = await apiFetch('/api/automations/audits');
      if (auditRes && auditRes.data) {
        const filtered = auditRes.data.filter((a) => a.entityId === id);
        setAudits(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternDetails();
    fetchSubmissions();
  }, [id]);

  const handleUpdateStatus = async (status) => {
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/interns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (res && res.data) {
        setIntern(res.data);
        fetchInternDetails();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateDept = async (department) => {
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/interns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ department }),
      });
      if (res && res.data) {
        setIntern(res.data);
        fetchInternDetails();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadFile = async (url, filename) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response was not ok');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      let ext = '';
      if (url.includes('.')) {
        ext = '.' + url.split('.').pop().split(/\#|\?/)[0];
      }
      const safeFilename = filename.endsWith(ext) ? filename : `${filename}${ext}`;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('File download failed:', err);
      window.open(url, '_blank');
    }
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('name', docName || file.name);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/interns/${id}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to upload document');
      }

      setDocName('');
      setFile(null);
      fetchInternDetails();
      alert('Document uploaded successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddPerformance = async (e) => {
    e.preventDefault();
    setAddingRating(true);
    try {
      const res = await apiFetch(`/api/interns/${id}/performance`, {
        method: 'POST',
        body: JSON.stringify({
          month: ratingMonth,
          rating: parseInt(ratingVal, 10),
          notes: ratingNotes,
        }),
      });
      if (res && res.data) {
        setRatingNotes('');
        fetchInternDetails();
        alert('Performance rating recorded.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingRating(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) return;
    setSendingEmail(true);
    setEmailStatus('');
    try {
      await apiFetch(`/api/interns/${id}/email`, {
        method: 'POST',
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });
      setEmailSubject('');
      setEmailBody('');
      setEmailStatus('✅ Email dispatched successfully! View logs in Dashboard Sandbox.');
      fetchInternDetails();
    } catch (err) {
      setEmailStatus(`❌ Error: ${err.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteDoc = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to delete the document "${docName || 'this document'}"?`)) return;
    try {
      const res = await apiFetch(`/api/interns/${id}/documents/${docId}`, {
        method: 'DELETE',
      });
      if (res && res.data) {
        setIntern(res.data);
        fetchInternDetails();
        alert('Document deleted successfully.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePerformance = async (perfId, month) => {
    if (!window.confirm(`Are you sure you want to delete the performance evaluation for ${month || 'this month'}?`)) return;
    try {
      const res = await apiFetch(`/api/interns/${id}/performance/${perfId}`, {
        method: 'DELETE',
      });
      if (res && res.data) {
        setIntern(res.data);
        fetchInternDetails();
        alert('Performance evaluation deleted successfully.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading intern details profile...</div>;
  if (!intern) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--danger)' }}>Intern record not found!</div>;

  return (
    <div className="animate-fade-in">
      <div style={topBarStyles}>
        <button onClick={() => navigate('/org/interns')} className="btn btn-secondary" style={backBtnStyles}>
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </button>
        <div style={metaBadgeContainerStyles}>
          <span style={roleBadgeStyles}>{intern.role}</span>
          <span style={{ 
            ...statusBadgeStyles,
            backgroundColor: 
              intern.status === 'Active' ? 'var(--success-glow)' :
              intern.status === 'Onboarding Pending' ? 'var(--warning-glow)' : 'rgba(100,116,139,0.1)',
            color: 
              intern.status === 'Active' ? 'var(--success)' :
              intern.status === 'Onboarding Pending' ? 'var(--warning)' : 'var(--text-secondary)'
          }}>
            {intern.status}
          </span>
        </div>
      </div>

      <div style={profileHeaderCardStyles} className="glass-card">
        <div style={headerMainStyles}>
          <div style={avatarLargeStyles}>
            {intern.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ marginBottom: '4px' }}>{intern.name}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Department: {intern.department} | Assigned Title: {intern.role}</p>
          </div>
        </div>
      </div>

      {/* Profile tabs */}
      <div className="tab-header">
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={14} style={{ marginRight: '6px' }} />
          Profile Details
        </button>
        <button className={`tab-btn ${activeTab === 'hr-letters' ? 'active' : ''}`} onClick={() => setActiveTab('hr-letters')}>
          <FileText size={14} style={{ marginRight: '6px' }} />
          HR Letters
        </button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          <FileText size={14} style={{ marginRight: '6px' }} />
          Documents ({intern.documentUrls?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`} onClick={() => setActiveTab('submissions')}>
          <FileText size={14} style={{ marginRight: '6px' }} />
          Submissions ({submissions?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
          <ChartIcon size={14} style={{ marginRight: '6px' }} />
          Performance History
        </button>
        <button className={`tab-btn ${activeTab === 'email' ? 'active' : ''}`} onClick={() => setActiveTab('email')}>
          <Mail size={14} style={{ marginRight: '6px' }} />
          Email Log
        </button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          <History size={14} style={{ marginRight: '6px' }} />
          Activity Log
        </button>
      </div>

      {/* Tabs panels */}
      <div style={tabContentStyles}>
        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <h3 style={sectionTitleStyles}>Basic Details</h3>
              <div style={detailsGridStyles}>
                <p><strong>Full Name:</strong> {intern.name}</p>
                <p><strong>Email:</strong> {intern.email}</p>
                <p><strong>Phone:</strong> {intern.phone}</p>
                <p><strong>Joining Date:</strong> {new Date(intern.joinDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="glass-card" style={{ minWidth: '320px' }}>
              <h3 style={sectionTitleStyles}>Status & Department Control</h3>
              <div className="form-group">
                <label>Active Lifecycle Status</label>
                <select
                  className="form-control"
                  value={intern.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  disabled={updating}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Onboarding Pending">Onboarding Pending</option>
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="Completed">Completed</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              <div className="form-group">
                <label>Change Department</label>
                <select
                  className="form-control"
                  value={intern.department}
                  onChange={(e) => handleUpdateDept(e.target.value)}
                  disabled={updating}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Org Space">Org Space</option>
                  <option value="Learning Space">Learning Space</option>
                  <option value="Marketing Space">Marketing Space</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Documents */}
        {activeTab === 'documents' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <h3 style={sectionTitleStyles}>Submitted Attachments</h3>
              {(!intern.documentUrls || intern.documentUrls.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>No training documents uploaded yet.</p>
              ) : (
                <div style={docListStyles}>
                  {intern.documentUrls.map((doc, idx) => (
                    <div key={doc._id || idx} style={docItemStyles}>
                      <FileText size={18} style={{ color: 'var(--primary)' }} />
                      <div style={{ flexGrow: 1 }}>
                        <span style={{ fontWeight: '500' }}>{doc.name}</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Open document in a new tab"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </a>
                        <button 
                          onClick={() => handleDownloadFile(doc.url, doc.name || 'document')} 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Download document directly"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(doc._id, doc.name)}
                          className="btn btn-secondary" 
                          style={{ padding: '6px 10px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                          title="Delete document"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ minWidth: '320px' }}>
              <h3 style={sectionTitleStyles}>Upload New Document</h3>
              <form onSubmit={handleDocUpload}>
                <div className="form-group">
                  <label>Document Label / Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Contract Agreement"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Select File (PDF / Images, Max 5MB)</label>
                  <input
                    type="file"
                    className="form-control"
                    required
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
                <button type="submit" disabled={uploading} className="btn btn-primary" style={{ width: '100%' }}>
                  <Upload size={16} />
                  <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Performance Ratings */}
        {activeTab === 'performance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={panelGridStyles}>
              <div className="glass-card" style={{ flexGrow: 1 }}>
                <h3 style={sectionTitleStyles}>Performance Metrics Trends</h3>
                {(!intern.performanceMetrics || intern.performanceMetrics.length === 0) ? (
                  <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>No monthly performance ratings recorded yet.</p>
                ) : (
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer>
                      <LineChart
                        data={intern.performanceMetrics}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="var(--text-muted)" />
                        <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} stroke="var(--text-muted)" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--glass-border)' }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Line type="monotone" dataKey="rating" stroke="var(--primary)" strokeWidth={3} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="glass-card" style={{ minWidth: '320px' }}>
                <h3 style={sectionTitleStyles}>Record Monthly Evaluation</h3>
                <form onSubmit={handleAddPerformance}>
                  <div className="form-group">
                    <label>Evaluation Month</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Jun 2026"
                      required
                      value={ratingMonth}
                      onChange={(e) => setRatingMonth(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Rating Score (1 to 5 Stars)</label>
                    <select
                      className="form-control"
                      value={ratingVal}
                      onChange={(e) => setRatingVal(e.target.value)}
                    >
                      <option value="5">5 - Outstanding / Exceeds Expectations</option>
                      <option value="4">4 - High Performance</option>
                      <option value="3">3 - Satisfactory</option>
                      <option value="2">2 - Needs Improvement</option>
                      <option value="1">1 - Unsatisfactory</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Evaluation Notes / Feedback</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={ratingNotes}
                      onChange={(e) => setRatingNotes(e.target.value)}
                      placeholder="Summary of work completed, milestones achieved..."
                    />
                  </div>

                  <button type="submit" disabled={addingRating} className="btn btn-primary" style={{ width: '100%' }}>
                    <Plus size={16} />
                    <span>Submit Evaluation</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Evaluation Text list */}
            {intern.performanceMetrics?.length > 0 && (
              <div className="glass-card">
                <h3 style={sectionTitleStyles}>Evaluation Notes Archive</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {intern.performanceMetrics.map((perf, idx) => (
                    <div key={perf._id || idx} style={evalNotesRowStyles}>
                      <div style={evalNotesHeaderStyles}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <strong>{perf.month}</strong>
                          <span className="badge badge-success">{perf.rating} / 5 Stars</span>
                        </div>
                        <button
                          onClick={() => handleDeletePerformance(perf._id, perf.month)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                          title="Delete evaluation"
                        >
                          <Trash2 size={13} style={{ marginRight: '4px' }} />
                          <span style={{ fontSize: '11px' }}>Delete</span>
                        </button>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                        {perf.notes || 'No notes logged for this month.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Email Correspondence */}
        {activeTab === 'email' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <h3 style={sectionTitleStyles}>Draft HR Correspondence Email</h3>
              <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Onboarding Documents Review Checklist"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email Body Text Content</label>
                  <textarea
                    className="form-control"
                    rows="8"
                    placeholder="Provide details of document deficiencies, probation reviews, or general announcements..."
                    required
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                </div>
                {emailStatus && (
                  <div style={{ fontSize: '12px', fontWeight: '600', color: emailStatus.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>
                    {emailStatus}
                  </div>
                )}
                <button type="submit" disabled={sendingEmail} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                  <Send size={16} />
                  <span>{sendingEmail ? 'Sending...' : 'Dispatch Email'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 5: Activity Audit Log */}
        {activeTab === 'activity' && (
          <div className="glass-card">
            <h3 style={sectionTitleStyles}>Profile Modification & Event Audits</h3>
            {audits.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No audit events logged for this intern.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {audits.map((a) => (
                  <div key={a._id} style={auditItemStyles}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-info">{a.action}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '13px', margin: '4px 0', color: 'var(--text-primary)' }}>{a.details}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Triggered by User: {a.userName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: HR Letters Generator */}
        {activeTab === 'hr-letters' && (
          <DocumentGenerator intern={intern} />
        )}

        {/* Tab: Submissions */}
        {activeTab === 'submissions' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1, minWidth: '450px' }}>
              <h3 style={sectionTitleStyles}>Submissions Archive</h3>
              {loadingSubmissions ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading submissions...</p>
              ) : (!submissions || submissions.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>No submissions found for this intern.</p>
              ) : (
                <div style={docListStyles}>
                  {submissions.map((sub) => {
                    const statusColor = 
                      sub.status === 'Approved' ? 'var(--success)' :
                      sub.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)';
                    const statusBg = 
                      sub.status === 'Approved' ? 'var(--success-glow)' :
                      sub.status === 'Rejected' ? 'var(--danger-glow)' : 'var(--warning-glow)';
                      
                    return (
                      <div key={sub._id} style={{ ...docItemStyles, flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={18} style={{ color: 'var(--primary)' }} />
                            <div>
                              <span style={{ fontWeight: '600', fontSize: '15px' }}>{sub.title}</span>
                              <span style={{ 
                                marginLeft: '10px',
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                backgroundColor: statusBg,
                                color: statusColor,
                                fontWeight: 'bold'
                              }}>
                                {sub.status}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(sub.uploadedDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div style={{ paddingLeft: '28px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <p style={{ margin: '2px 0' }}><strong>Category:</strong> {sub.category}</p>
                          {sub.remarks && <p style={{ margin: '2px 0' }}><strong>Remarks:</strong> {sub.remarks}</p>}
                          {sub.reviewerRemarks && (
                            <p style={{ margin: '4px 0', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid var(--primary)' }}>
                              <strong>Reviewer Notes:</strong> {sub.reviewerRemarks}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a 
                              href={sub.fileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Open submission file in a new tab"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </a>
                            <button 
                              onClick={() => handleDownloadFile(sub.fileUrl, sub.title || 'submission')} 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Download submission directly"
                            >
                              <Download size={13} />
                              <span>Download</span>
                            </button>
                          </div>

                          {/* HR & Super Admin Controls */}
                          {(user?.role === 'HR Manager' || user?.role === 'Super Admin') && sub.status === 'Pending' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '250px', alignSelf: 'flex-end' }}>
                              <input 
                                type="text"
                                className="form-control"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                placeholder="Reviewer comments..."
                                value={reviewRemarks[sub._id] || ''}
                                onChange={(e) => setReviewRemarks({ ...reviewRemarks, [sub._id]: e.target.value })}
                              />
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => handleReviewSubmission(sub._id, 'Approved')}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleReviewSubmission(sub._id, 'Rejected')}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ minWidth: '320px', maxWidth: '380px', flexGrow: 1 }}>
              <h3 style={sectionTitleStyles}>Submit Deliverable</h3>
              <form onSubmit={handleSubmissionUpload}>
                <div className="form-group">
                  <label>Submission Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Assignment 1 Report"
                    required
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-control"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Project Report">Project Report</option>
                    <option value="NDA Signed">NDA Signed</option>
                    <option value="Contract">Contract</option>
                    <option value="ID Proof">ID Proof</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Remarks / Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Provide any instructions or comments..."
                    value={subRemarks}
                    onChange={(e) => setSubRemarks(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Select File (PDF, Word, PPT, ZIP, Images - Max 10MB)</label>
                  <input
                    type="file"
                    className="form-control"
                    required
                    onChange={(e) => setSubFile(e.target.files[0])}
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
                  <Upload size={16} />
                  <span>{submitting ? 'Submitting...' : 'Upload Submission'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
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

const roleBadgeStyles = {
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--glass-border)',
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  color: 'var(--primary)',
  fontWeight: '600',
};

const statusBadgeStyles = {
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
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
  backgroundColor: 'var(--primary)',
  color: 'white',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
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

const docListStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const docItemStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const evalNotesRowStyles = {
  backgroundColor: 'rgba(255, 255, 255, 0.01)',
  padding: '14px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const evalNotesHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const auditItemStyles = {
  backgroundColor: 'rgba(255,255,255,0.01)',
  border: '1px solid var(--glass-border)',
  padding: '10px 14px',
  borderRadius: '8px',
};

export default InternDetail;
