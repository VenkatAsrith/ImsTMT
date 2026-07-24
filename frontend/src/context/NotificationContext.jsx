import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const Toast = ({ id, message, type, onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onClose(id), 300);
    }, 3700);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  const icons = {
    success: '🎉',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  const borderColors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#0ea5e9',
    warning: '#f59e0b',
  };

  return (
    <div
      className={`toast-message-card ${exiting ? 'exiting' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        borderLeft: `4px solid ${borderColors[type] || borderColors.info}`,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
        color: '#f8fafc',
        fontSize: '13px',
        fontWeight: '500',
        minWidth: '280px',
        maxWidth: '400px',
        pointerEvents: 'auto',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
        <span style={{ fontSize: '16px' }}>{icons[type]}</span>
        <span>{message}</span>
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0 4px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onClose={onClose} />
      ))}
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const { user, apiFetch } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/notifications');
      if (res && res.data) {
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err.message);
    }
  }, [user, apiFetch]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await apiFetch('/api/notifications/mark-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err.message);
    }
  };

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const handleCloseToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Set up global window.alert interceptor
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      let type = 'info';
      const msgLower = String(message).toLowerCase();
      if (msgLower.includes('🎉') || msgLower.includes('success') || msgLower.includes('complete') || msgLower.includes('done') || msgLower.includes('admitted') || msgLower.includes('captured')) {
        type = 'success';
      } else if (msgLower.includes('fail') || msgLower.includes('error') || msgLower.includes('denied')) {
        type = 'error';
      } else if (msgLower.includes('warning') || msgLower.includes('check') || msgLower.includes('required') || msgLower.includes('are you sure')) {
        type = 'warning';
      }
      showToast(message, type);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAllAsRead, toasts, showToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={handleCloseToast} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

