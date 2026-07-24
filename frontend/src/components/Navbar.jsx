import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, Menu, CheckCheck, Inbox, ShieldCheck } from 'lucide-react';

const Navbar = ({ toggleSidebar, openSearch }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Determine active space from route path
  const getActiveSpace = () => {
    const path = location.pathname;
    if (path.startsWith('/org')) return { name: 'Org Space', color: '#10b981' }; // Emerald
    if (path.startsWith('/marketing')) return { name: 'Marketing CRM Space', color: '#6366f1' }; // Indigo
    if (path.startsWith('/learning')) return { name: 'Learning Space', color: '#f59e0b' }; // Amber
    return { name: 'Dashboard Space', color: '#0ea5e9' }; // Sky
  };

  const activeSpace = getActiveSpace();

  return (
    <header style={headerStyles}>
      <div style={leftSectionStyles}>
        <button onClick={toggleSidebar} style={menuBtnStyles} className="menu-toggle-btn">
          <Menu size={20} />
        </button>
        <img src="/logo.png" style={{ height: '28px', width: 'auto', borderRadius: '4px' }} alt="TMT Logo" />
        <div style={spaceIndicatorStyles}>
          <span style={{ ...dotStyles, backgroundColor: activeSpace.color }} />
          <span style={spaceTextStyles}>{activeSpace.name}</span>
        </div>
      </div>

      <div style={rightSectionStyles}>
        {/* Search trigger button */}
        <button onClick={openSearch} style={searchTriggerStyles} className="btn-secondary">
          <Search size={16} style={{ color: 'var(--text-secondary)' }} />
          <span style={searchPlaceholderStyles}>Search...</span>
          <kbd style={kbdStyles}>Ctrl+K</kbd>
        </button>

        {/* Notifications Bell Dropdown */}
        <div style={dropdownContainerStyles} ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            style={bellBtnStyles}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={badgeStyles}>{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div style={dropdownListStyles} className="glass-card animate-fade-in">
              <div style={dropdownHeaderStyles}>
                <h3>Alerts & Inboxes</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={markAllReadBtnStyles}>
                    <CheckCheck size={14} />
                    <span>Read All</span>
                  </button>
                )}
              </div>

              <div style={listItemsContainerStyles}>
                {notifications.length === 0 ? (
                  <div style={emptyStateStyles}>
                    <Inbox size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                    <p>All caught up!</p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No unread alerts.</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n._id} 
                      style={{
                        ...notificationItemStyles,
                        backgroundColor: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)'
                      }}
                      onClick={() => {
                        setShowNotifications(false);
                        if (n.link) {
                          window.location.href = n.link;
                        }
                      }}
                    >
                      <div style={itemHeaderStyles}>
                        <span style={itemTitleStyles}>{n.title}</span>
                        {!n.isRead && <span style={unreadDotStyles} />}
                      </div>
                      <p style={itemBodyStyles}>{n.message}</p>
                      <span style={itemTimeStyles}>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile role info */}
        <div style={profileTagStyles}>
          <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
          <span>{user.role}</span>
        </div>
      </div>
    </header>
  );
};

// --- Styles object ---
const headerStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 'var(--header-height)',
  backgroundColor: 'rgba(10, 13, 22, 0.75)',
  borderBottom: '1px solid var(--glass-border)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  zIndex: 90,
};

const leftSectionStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const menuBtnStyles = {
  display: 'none', // Overwritten by CSS media query on mobile
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  padding: '6px',
};

const spaceIndicatorStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'var(--bg-secondary)',
  padding: '6px 12px',
  borderRadius: '20px',
  border: '1px solid var(--glass-border)',
};

const dotStyles = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const spaceTextStyles = {
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.02em',
};

const rightSectionStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '18px',
};

const searchTriggerStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid var(--glass-border)',
  padding: '6px 12px',
  borderRadius: '8px',
  cursor: 'pointer',
  minWidth: '180px',
  textAlign: 'left',
};

const searchPlaceholderStyles = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  flexGrow: 1,
};

const kbdStyles = {
  fontSize: '10px',
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-secondary)',
  padding: '2px 6px',
  borderRadius: '4px',
  fontWeight: 'bold',
};

const dropdownContainerStyles = {
  position: 'relative',
};

const bellBtnStyles = {
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  padding: '8px',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  transition: 'background-color 0.2s',
  outline: 'none',
};

const badgeStyles = {
  position: 'absolute',
  top: '2px',
  right: '2px',
  backgroundColor: 'var(--danger)',
  color: 'white',
  fontSize: '10px',
  fontWeight: 'bold',
  minWidth: '16px',
  height: '16px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 4px',
  boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
};

const dropdownListStyles = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 10px)',
  width: '320px',
  padding: '16px 0',
  borderRadius: 'var(--border-radius)',
  maxHeight: '400px',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
};

const dropdownHeaderStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px 12px 16px',
  borderBottom: '1px solid var(--glass-border)',
};

const markAllReadBtnStyles = {
  background: 'none',
  border: 'none',
  color: 'var(--primary)',
  cursor: 'pointer',
  fontSize: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontWeight: '500',
};

const listItemsContainerStyles = {
  overflowY: 'auto',
  maxHeight: '300px',
};

const emptyStateStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 16px',
  textAlign: 'center',
};

const notificationItemStyles = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--glass-border)',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const itemHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
};

const itemTitleStyles = {
  fontWeight: '600',
  fontSize: '12.5px',
};

const unreadDotStyles = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary)',
};

const itemBodyStyles = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
  marginBottom: '4px',
  wordBreak: 'break-word',
};

const itemTimeStyles = {
  fontSize: '10px',
  color: 'var(--text-muted)',
};

const profileTagStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: 'rgba(16, 185, 129, 0.05)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '600',
  color: 'var(--success)',
};

export default Navbar;
