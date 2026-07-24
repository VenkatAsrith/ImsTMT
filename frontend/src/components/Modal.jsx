import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={backdropStyles} onClick={onClose} className="modal-backdrop">
      <div 
        style={contentStyles} 
        onClick={(e) => e.stopPropagation()} 
        className="glass-card animate-fade-in"
      >
        <div style={headerStyles}>
          <h3>{title}</h3>
          <button onClick={onClose} style={closeBtnStyles}>
            <X size={18} />
          </button>
        </div>
        <div style={bodyStyles}>
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Styles objects ---
const backdropStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(5, 7, 12, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '16px',
};

const contentStyles = {
  width: '100%',
  maxWidth: '520px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px',
  borderRadius: 'var(--border-radius)',
};

const headerStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '12px',
  marginBottom: '20px',
};

const closeBtnStyles = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
};

const bodyStyles = {
  overflowY: 'auto',
  flexGrow: 1,
};

export default Modal;
