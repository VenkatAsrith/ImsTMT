import React, { useState } from 'react';
import { Calendar, User, IndianRupee, AlertCircle } from 'lucide-react';

const KanbanBoard = ({ columns, cards, onCardMove, onCardClick, CardExtraContent }) => {
  const [draggedCardId, setDraggedCardId] = useState(null);

  // HTML5 Drag Handlers
  const handleDragStart = (e, cardId) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    // Add temporary opacity class
    setTimeout(() => {
      const el = document.getElementById(`kanban-card-${cardId}`);
      if (el) el.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e, cardId) => {
    setDraggedCardId(null);
    const el = document.getElementById(`kanban-card-${cardId}`);
    if (el) el.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
    if (cardId && onCardMove) {
      onCardMove(cardId, targetStage);
    }
  };

  // Group cards by stage attribute
  const cardsByStage = columns.reduce((acc, col) => {
    acc[col.id] = cards.filter(card => card.stage === col.id || card.onboardingStage === col.id);
    return acc;
  }, {});

  return (
    <div className="kanban-container">
      {columns.map((col) => {
        const columnCards = cardsByStage[col.id] || [];
        const isWipExceeded = col.wipLimit && columnCards.length > col.wipLimit;

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`kanban-column ${isWipExceeded ? 'kanban-wip-limit-exceeded' : ''}`}
            style={columnStyles}
          >
            {/* Column Header */}
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span style={{ ...dotStyles, backgroundColor: col.color }} />
                <span>{col.title}</span>
              </div>
              <div style={countContainerStyles}>
                <span className="kanban-card-count">{columnCards.length}</span>
                {col.wipLimit && (
                  <span style={wipLimitStyles}>/ Max {col.wipLimit}</span>
                )}
              </div>
            </div>

            {/* WIP Exceeded warning bar */}
            {isWipExceeded && (
              <div style={wipWarningStyles}>
                <AlertCircle size={14} />
                <span>WIP limit exceeded!</span>
              </div>
            )}

            {/* Cards wrapper */}
            <div className="kanban-cards-wrapper" style={cardsWrapperStyles}>
              {columnCards.length === 0 ? (
                <div style={emptyColumnStyles}>Drop cards here</div>
              ) : (
                columnCards.map((card) => {
                  // Check if deal/student dates are overdue
                  const isOverdue = card.nextFollowUp && new Date(card.nextFollowUp) < new Date() && card.stage !== 'Closed Won' && card.stage !== 'Closed Lost';
                  const isPaymentOverdue = card.dueDate && new Date(card.dueDate) < new Date() && card.status === 'Overdue';
                  const highlightRed = isOverdue || isPaymentOverdue;

                  return (
                    <div
                      key={card._id}
                      id={`kanban-card-${card._id}`}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, card._id)}
                      onDragEnd={(e) => handleDragEnd(e, card._id)}
                      onClick={() => onCardClick && onCardClick(card)}
                      className="kanban-card"
                      style={{
                        ...cardStyles,
                        borderColor: highlightRed ? 'rgba(239, 68, 68, 0.5)' : 'var(--glass-border)',
                        boxShadow: highlightRed ? '0 0 10px rgba(239, 68, 68, 0.15)' : 'none',
                      }}
                    >
                      {/* Overdue alert tab */}
                      {highlightRed && (
                        <span style={overdueBadgeStyles}>Overdue</span>
                      )}

                      <h4 className="kanban-card-title">{card.dealName || card.name}</h4>
                      
                      {card.companyName && (
                        <div className="kanban-card-subtitle">{card.companyName}</div>
                      )}

                      {/* Financial info if present */}
                      {card.amount !== undefined && (
                        <div style={infoRowStyles}>
                          <IndianRupee size={13} style={{ color: 'var(--text-muted)' }} />
                          <span style={amountTextStyles}>
                            {card.amount.toLocaleString('en-IN', { style: 'currency', currency: card.currency || 'INR' })}
                          </span>
                        </div>
                      )}

                      {/* Enrolled course info for student */}
                      {card.plannedCourse && (
                        <div style={infoRowStyles}>
                          <span style={courseTextStyles}>{card.plannedCourse}</span>
                        </div>
                      )}

                      {/* Extra context content hook */}
                      {CardExtraContent && <CardExtraContent card={card} />}

                      {/* Footer information */}
                      <div className="kanban-card-footer" style={cardFooterStyles}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} />
                          <span style={{ fontSize: '11px' }}>
                            {card.assignedTo?.name || card.phone || 'Unassigned'}
                          </span>
                        </div>

                        {/* Date trackers */}
                        {(card.nextFollowUp || card.dueDate) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: highlightRed ? 'var(--danger)' : 'var(--text-muted)' }}>
                            <Calendar size={12} />
                            <span>
                              {new Date(card.nextFollowUp || card.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Styles objects ---
const columnStyles = {
  flexShrink: 0,
  minWidth: '280px',
  transition: 'border-color 0.25s, box-shadow 0.25s',
};

const dotStyles = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const countContainerStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const wipLimitStyles = {
  fontSize: '10px',
  color: 'var(--text-muted)',
};

const wipWarningStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  color: 'var(--danger)',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '600',
  marginBottom: '8px',
};

const cardsWrapperStyles = {
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 250px)',
};

const emptyColumnStyles = {
  textAlign: 'center',
  padding: '30px 16px',
  color: 'var(--text-muted)',
  border: '2px dashed var(--glass-border)',
  borderRadius: '8px',
  fontSize: '12px',
};

const cardStyles = {
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  padding: '14px',
  cursor: 'grab',
  transition: 'all 0.2s ease',
  position: 'relative',
};

const overdueBadgeStyles = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  color: 'var(--danger)',
  fontSize: '9px',
  fontWeight: 'bold',
  padding: '2px 6px',
  borderRadius: '10px',
  textTransform: 'uppercase',
  border: '1px solid rgba(239, 68, 68, 0.3)',
};

const infoRowStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '10px',
};

const amountTextStyles = {
  fontWeight: '600',
  fontSize: '13px',
};

const courseTextStyles = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  padding: '3px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  color: 'var(--text-secondary)',
};

const cardFooterStyles = {
  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  paddingTop: '8px',
  marginTop: '4px',
};

export default KanbanBoard;
