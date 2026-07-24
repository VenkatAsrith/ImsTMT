import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import KanbanBoard from '../../components/KanbanBoard';
import Modal from '../../components/Modal';
import { IndianRupee, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DealPipeline = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status transition reason dialog state
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [activeTransition, setActiveTransition] = useState(null); // { cardId, nextStage }
  const [transitionReason, setTransitionReason] = useState('');

  const fetchDeals = async () => {
    try {
      const res = await apiFetch('/api/deals');
      if (res && res.data) {
        setDeals(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const handleDealMove = async (dealId, nextStage) => {
    // If transitioning to closed, prompt for reason modal
    if (nextStage === 'Closed Won' || nextStage === 'Closed Lost') {
      setActiveTransition({ dealId, nextStage });
      setTransitionReason('');
      setIsReasonModalOpen(true);
      return;
    }

    try {
      // Execute PUT stage change in backend
      await apiFetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        body: JSON.stringify({ stage: nextStage }),
      });
      fetchDeals();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReasonSubmit = async (e) => {
    e.preventDefault();
    if (!activeTransition) return;
    
    try {
      await apiFetch(`/api/deals/${activeTransition.dealId}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          stage: activeTransition.nextStage, 
          reason: transitionReason 
        }),
      });
      setIsReasonModalOpen(false);
      setActiveTransition(null);
      fetchDeals();
    } catch (err) {
      alert(err.message);
    }
  };

  // Define Kanban columns with WIP limit properties
  const columns = [
    { id: 'New', title: 'New', color: '#0ea5e9', wipLimit: 5 },
    { id: 'Contacted', title: 'Contacted', color: '#6366f1', wipLimit: 4 },
    { id: 'Proposal Sent', title: 'Proposal Sent', color: '#f59e0b', wipLimit: 3 },
    { id: 'Negotiation', title: 'Negotiation', color: '#a855f7', wipLimit: 3 },
    { id: 'Closed Won', title: 'Closed Won', color: '#10b981' },
    { id: 'Closed Lost', title: 'Closed Lost', color: '#ef4444' },
  ];

  // Map backend model properties to fits Kanban card structure
  const kanbanCards = deals.map((d) => ({
    ...d,
    companyName: d.clientId?.companyName || 'Unknown Client',
  }));

  // Render total pipeline sizing metrics
  const totalPipelineValue = deals
    .filter(d => !['Closed Won', 'Closed Lost'].includes(d.stage))
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Deals Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Drag and drop deal cards to change pipeline sales stage. WIP warnings and closure dialog prompt automatically.</p>
        </div>
        <div style={kpiStyles} className="glass-card">
          <IndianRupee size={18} style={{ color: 'var(--success)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Active Pipeline size</span>
            <span style={{ fontSize: '15px', fontWeight: 'bold' }}>₹{totalPipelineValue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>Loading pipeline sales boards...</div>
      ) : (
        <KanbanBoard
          columns={columns}
          cards={kanbanCards}
          onCardMove={handleDealMove}
          onCardClick={(card) => navigate(`/marketing/clients/${card.clientId?._id || card.clientId}`)}
        />
      )}

      {/* Closure Reason Dialog Modal */}
      <Modal 
        isOpen={isReasonModalOpen} 
        onClose={() => {
          setIsReasonModalOpen(false);
          setActiveTransition(null);
        }} 
        title={activeTransition?.nextStage === 'Closed Won' ? '🎉 Close Won Deal' : '😞 Close Lost Deal'}
      >
        <form onSubmit={handleReasonSubmit} style={formStyles}>
          <div className="form-group">
            <label>Provide transition reason / notes summary</label>
            <textarea
              className="form-control"
              rows="4"
              placeholder={
                activeTransition?.nextStage === 'Closed Won'
                  ? 'e.g. Client agreed to licensing structure, contract signed.'
                  : 'e.g. Project cancelled or pricing was outside budget guidelines.'
              }
              required
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Save Closure Details
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
  flexWrap: 'wrap',
  gap: '16px',
};

const kpiStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 18px',
};

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

export default DealPipeline;
