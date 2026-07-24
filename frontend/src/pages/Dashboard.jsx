import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Building2, 
  IndianRupee, 
  CreditCard, 
  Send, 
  ShieldAlert, 
  FileText,
  Activity,
  Megaphone,
  RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const { user, apiFetch } = useAuth();
  const [metrics, setMetrics] = useState({
    internsCount: 0,
    clientsCount: 0,
    dealsTotal: 0,
    paymentsDues: 0,
  });
  const [sandboxLogs, setSandboxLogs] = useState({ whatsapp: [], email: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringAutomation, setTriggeringAutomation] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch interns count
      const internsRes = await apiFetch('/api/interns?limit=1');
      const clientsRes = await apiFetch('/api/clients?limit=1');
      const dealsRes = await apiFetch('/api/deals');
      const paymentsRes = await apiFetch('/api/payments');

      // Calculate totals
      const activeDealsValue = (dealsRes.data || [])
        .filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
        .reduce((sum, d) => sum + d.amount, 0);

      const overdueAmount = (paymentsRes.data || [])
        .filter(p => p.status !== 'Paid')
        .reduce((sum, p) => sum + p.amount, 0);

      setMetrics({
        internsCount: internsRes.data?.pagination?.total || 0,
        clientsCount: clientsRes.data?.pagination?.total || 0,
        dealsTotal: activeDealsValue,
        paymentsDues: overdueAmount,
      });

      // Fetch Sandbox Logs
      const logsRes = await apiFetch('/api/automations/sandbox-logs');
      if (logsRes && logsRes.data) {
        setSandboxLogs(resData => ({
          whatsapp: logsRes.data.whatsapp || [],
          email: logsRes.data.email || []
        }));
      }

      // Fetch Audits
      const auditsRes = await apiFetch('/api/automations/audits');
      setAuditLogs(auditsRes.data || []);
      
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const triggerAutomations = async () => {
    setTriggeringAutomation(true);
    try {
      await apiFetch('/api/automations/run', { method: 'POST' });
      alert('🤖 Background rule checks completed! Overdue bills and stale lead parameters verified.');
      fetchDashboardData();
    } catch (err) {
      alert(`Error triggering automation: ${err.message}`);
    } finally {
      setTriggeringAutomation(false);
    }
  };

  const clearSandboxLogs = async () => {
    if (!window.confirm('Clear all mock WhatsApp & Email logs?')) return;
    try {
      await apiFetch('/api/automations/sandbox-logs', { method: 'DELETE' });
      setSandboxLogs({ whatsapp: [], email: [] });
    } catch (err) {
      alert(err.message);
    }
  };

  // Compile full simulated logs array for dashboard viewing
  const combinedLogs = React.useMemo(() => {
    const list = [];
    sandboxLogs.whatsapp.forEach((w) => list.push({ ...w, logType: 'WhatsApp' }));
    sandboxLogs.email.forEach((e) => list.push({ ...e, logType: 'Email' }));
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [sandboxLogs]);

  return (
    <div className="animate-fade-in">
      <div style={headerSectionStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '4px' }}>Welcome back, {user.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>System operating normally. Quick links and logs metrics available below.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {user.role === 'Super Admin' && (
            <button 
              onClick={triggerAutomations} 
              disabled={triggeringAutomation} 
              className="btn btn-primary"
            >
              <RefreshCw size={16} className={triggeringAutomation ? 'animate-spin' : ''} />
              <span>{triggeringAutomation ? 'Checking rules...' : 'Run Daily Sweeps'}</span>
            </button>
          )}
          <button onClick={fetchDashboardData} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        <div className="kpi-card glass-card">
          <div>
            <span style={kpiLabelStyles}>Total Interns</span>
            <h3>{metrics.internsCount}</h3>
          </div>
          <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div>
            <span style={kpiLabelStyles}>Active CRM Clients</span>
            <h3>{metrics.clientsCount}</h3>
          </div>
          <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <Building2 size={24} />
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div>
            <span style={kpiLabelStyles}>CRM Deal Value</span>
            <h3>₹{metrics.dealsTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
          </div>
          <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--info)' }}>
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div>
            <span style={kpiLabelStyles}>Unpaid Tuition / Balances</span>
            <h3>₹{metrics.paymentsDues.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</h3>
          </div>
          <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* Two columns logs split */}
      <div style={splitGridStyles}>
        {/* Section 1: Developer Sandbox Logs */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <div style={sectionHeaderStyles}>
            <div style={headerTextStyles}>
              <Send size={18} style={{ color: 'var(--primary)' }} />
              <h3>Dev Sandbox Logs (WhatsApp & Emails)</h3>
            </div>
            {combinedLogs.length > 0 && user.role === 'Super Admin' && (
              <button onClick={clearSandboxLogs} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
                Clear Logs
              </button>
            )}
          </div>

          <div style={logsContainerStyles}>
            {combinedLogs.length === 0 ? (
              <div style={emptyLogsStyles}>
                <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <p>No sandbox transmissions logged.</p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dispatched email & Twilio WhatsApp notifications will appear here.</span>
              </div>
            ) : (
              combinedLogs.map((log, idx) => (
                <div key={idx} style={logItemStyles}>
                  <div style={logItemHeaderStyles}>
                    <span style={{ 
                      ...badgeStyles, 
                      backgroundColor: log.logType === 'WhatsApp' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                      color: log.logType === 'WhatsApp' ? 'var(--success)' : 'var(--primary)'
                    }}>
                      {log.logType}
                    </span>
                    <span style={logTimeStyles}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={logBodyStyles}>
                    <p><strong>To:</strong> {log.to}</p>
                    {log.subject && <p><strong>Subject:</strong> {log.subject}</p>}
                    <p style={{ marginTop: '4px', color: 'var(--text-primary)' }}>{log.body || log.bodyPreview}</p>
                    {log.mediaUrl && <p style={{ fontSize: '11px', color: 'var(--info)' }}><strong>Media Attach:</strong> {log.mediaUrl}</p>}
                    {log.attachments && log.attachments.length > 0 && (
                      <p style={{ fontSize: '11px', color: 'var(--info)' }}><strong>Mail PDF Attach:</strong> {log.attachments.join(', ')}</p>
                    )}
                  </div>
                  <span style={logStatusStyles}>{log.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Audit Activities Trail */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <div style={sectionHeaderStyles}>
            <div style={headerTextStyles}>
              <Activity size={18} style={{ color: 'var(--success)' }} />
              <h3>Compliance Operations Audit Trail</h3>
            </div>
          </div>

          <div style={logsContainerStyles}>
            {auditLogs.length === 0 ? (
              <div style={emptyLogsStyles}>
                <Activity size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                <p>No activities recorded in audit logs.</p>
              </div>
            ) : (
              auditLogs.map((audit) => (
                <div key={audit._id} style={logItemStyles}>
                  <div style={logItemHeaderStyles}>
                    <span style={{ 
                      ...badgeStyles, 
                      backgroundColor: 
                        audit.action === 'CREATE' ? 'rgba(16, 185, 129, 0.1)' :
                        audit.action === 'UPDATE' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: 
                        audit.action === 'CREATE' ? 'var(--success)' :
                        audit.action === 'UPDATE' ? 'var(--info)' : 'var(--danger)'
                    }}>
                      {audit.action} ({audit.entity})
                    </span>
                    <span style={logTimeStyles}>{new Date(audit.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div style={logBodyStyles}>
                    <p>{audit.details}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Triggered by: {audit.userName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles objects ---
const headerSectionStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '30px',
  flexWrap: 'wrap',
  gap: '16px',
};

const kpiLabelStyles = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  fontWeight: '600',
};

const splitGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '24px',
};

const sectionHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '12px',
  marginBottom: '16px',
};

const headerTextStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const logsContainerStyles = {
  overflowY: 'auto',
  maxHeight: '450px',
  flexGrow: 1,
};

const emptyLogsStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: '60px 20px',
  textAlign: 'center',
};

const logItemStyles = {
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const logItemHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const badgeStyles = {
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
};

const logTimeStyles = {
  fontSize: '11px',
  color: 'var(--text-muted)',
};

const logBodyStyles = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
};

const logStatusStyles = {
  alignSelf: 'flex-start',
  fontSize: '10px',
  backgroundColor: 'rgba(255,255,255,0.05)',
  padding: '2px 6px',
  borderRadius: '4px',
  color: 'var(--text-muted)',
};

export default Dashboard;
