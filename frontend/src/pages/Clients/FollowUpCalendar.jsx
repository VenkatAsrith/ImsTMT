import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, BellRing } from 'lucide-react';

const FollowUpCalendar = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await apiFetch('/api/deals');
        if (res && res.data) {
          // Filter deals containing follow-up dates
          const followUps = res.data.filter(d => d.nextFollowUp);
          setDeals(followUps);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, [apiFetch]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Day names helper
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in month
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  // Generate calendar cells grid
  const cells = React.useMemo(() => {
    const grid = [];
    
    // Fill trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }

    // Fill current month days
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }

    // Pad remaining grid squares to get standard 6-week grid (42 cells)
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }

    return grid;
  }, [year, month, daysInMonth, firstDayIndex, prevMonthDays]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter deals for a specific calendar cell date
  const getDealsForDate = (date) => {
    return deals.filter(deal => {
      const dealDate = new Date(deal.nextFollowUp);
      return (
        dealDate.getFullYear() === date.getFullYear() &&
        dealDate.getMonth() === date.getMonth() &&
        dealDate.getDate() === date.getDate()
      );
    });
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading calendar entries...</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Follow-Up Calendar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track scheduled pipeline outreach calls, customer meetings, and pending engagements.</p>
        </div>

        {/* Month Navigation controls */}
        <div style={navControlsStyles}>
          <button onClick={handlePrevMonth} className="btn btn-secondary" style={navBtnStyles}>
            <ChevronLeft size={16} />
          </button>
          <span style={monthLabelStyles}>{monthName} {year}</span>
          <button onClick={handleNextMonth} className="btn btn-secondary" style={navBtnStyles}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '20px' }}>
        {/* Calendar Grid header week day names */}
        <div style={weekHeaderGridStyles}>
          {dayNames.map((day, idx) => (
            <div key={idx} style={weekHeaderCellStyles}>{day}</div>
          ))}
        </div>

        {/* Days grid cells */}
        <div style={calendarGridStyles}>
          {cells.map((cell, idx) => {
            const dateDeals = getDealsForDate(cell.date);
            const isToday = new Date().toDateString() === cell.date.toDateString();

            return (
              <div 
                key={idx} 
                style={{
                  ...cellStyles,
                  opacity: cell.isCurrentMonth ? 1 : 0.4,
                  backgroundColor: isToday ? 'rgba(99, 102, 241, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                  borderColor: isToday ? 'var(--primary)' : 'var(--glass-border)',
                }}
              >
                <div style={{
                  ...dayNumberStyles,
                  color: isToday ? 'var(--primary)' : 'inherit',
                  fontWeight: isToday ? 'bold' : 'normal'
                }}>
                  {cell.day}
                </div>

                {/* Populate deals list inside calendar cell */}
                <div style={dealListStyles}>
                  {dateDeals.map((deal) => (
                    <div 
                      key={deal._id} 
                      onClick={() => navigate(`/marketing/clients/${deal.clientId?._id || deal.clientId}`)}
                      style={dealItemStyles}
                      title={`${deal.dealName} - Click to view`}
                    >
                      <BellRing size={10} style={{ flexShrink: 0 }} />
                      <span style={dealTitleStyles}>{deal.dealName}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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

const navControlsStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: 'var(--bg-secondary)',
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const navBtnStyles = {
  padding: '6px',
  minWidth: 'auto',
};

const monthLabelStyles = {
  fontWeight: '600',
  fontSize: '15px',
  minWidth: '130px',
  textAlign: 'center',
};

const weekHeaderGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  marginBottom: '10px',
  textAlign: 'center',
};

const weekHeaderCellStyles = {
  fontSize: '12px',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  paddingBottom: '8px',
};

const calendarGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '8px',
};

const cellStyles = {
  minHeight: '100px',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  padding: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  transition: 'border-color 0.2s',
};

const dayNumberStyles = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
};

const dealListStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  overflowY: 'auto',
  maxHeight: '68px',
};

const dealItemStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: 'var(--primary-glow)',
  color: 'var(--text-primary)',
  borderLeft: '2px solid var(--primary)',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '10px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const dealTitleStyles = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export default FollowUpCalendar;
