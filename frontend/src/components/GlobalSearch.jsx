import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, Users, Building2, Sparkles, CornerDownLeft, GraduationCap, FileText } from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ interns: [], clients: [], courses: [], students: [], receipts: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ interns: [], clients: [], courses: [], students: [], receipts: [] });
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Perform search fetch on query change
  useEffect(() => {
    if (!query || query.trim() === '') {
      setResults({ interns: [], clients: [], courses: [], students: [], receipts: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res && res.data) {
          setResults({
            interns: res.data.interns || [],
            clients: res.data.clients || [],
            courses: res.data.courses || [],
            students: res.data.students || [],
            receipts: res.data.receipts || [],
          });
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, apiFetch]);

  // Flattened results list to support arrow navigation
  const flatResults = React.useMemo(() => {
    const list = [];
    results.interns.forEach(i => list.push({ ...i, type: 'intern', path: `/org/interns/${i._id}` }));
    results.clients.forEach(c => list.push({ ...c, type: 'client', path: `/marketing/clients/${c._id}` }));
    results.courses.forEach(crs => list.push({ ...crs, type: 'course', path: `/learning/courses` }));
    
    if (results.students) {
      results.students.forEach(s => list.push({ ...s, type: 'student', path: `/learning/students/${s._id}` }));
    }
    if (results.receipts) {
      results.receipts.forEach(r => {
        const studentId = r.paymentId?.studentId?._id || r.paymentId?.studentId;
        const studentName = r.paymentId?.studentId?.name || 'Unknown Student';
        list.push({ 
          ...r, 
          type: 'receipt', 
          studentName,
          path: studentId ? `/learning/students/${studentId}` : `/learning/receipts` 
        });
      });
    }
    return list;
  }, [results]);

  // Keyboard navigation listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % Math.max(1, flatResults.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          navigate(flatResults[selectedIndex].path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div style={backdropStyles} className="modal-backdrop">
      <div style={containerStyles} ref={dropdownRef} className="glass-card animate-fade-in">
        <div style={searchHeaderStyles}>
          <Search size={20} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files, clients, interns, courses, students..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={inputStyles}
          />
        </div>

        <div style={bodyStyles}>
          {loading && <div style={statusStyles}>Searching...</div>}
          
          {!loading && query && flatResults.length === 0 && (
            <div style={statusStyles}>No results found for "{query}"</div>
          )}

          {!query && (
            <div style={tipStyles}>
              <p>Type to search across TMT Operations platform databases.</p>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tip: Use <kbd style={kbdStyles}>↑</kbd> <kbd style={kbdStyles}>↓</kbd> to navigate, and <kbd style={kbdStyles}>Enter</kbd> to open.
              </span>
            </div>
          )}

          {flatResults.length > 0 && (
            <div style={resultsListStyles}>
              {flatResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    style={{
                      ...itemStyles,
                      backgroundColor: isSelected ? 'rgba(225, 29, 72, 0.15)' : 'transparent',
                      borderColor: isSelected ? 'var(--primary)' : 'transparent',
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div style={itemIconTextStyles}>
                      {item.type === 'intern' && <Users size={16} style={{ color: '#10b981' }} />}
                      {item.type === 'client' && <Building2 size={16} style={{ color: '#6366f1' }} />}
                      {item.type === 'course' && <Sparkles size={16} style={{ color: '#f59e0b' }} />}
                      {item.type === 'student' && <GraduationCap size={16} style={{ color: '#0ea5e9' }} />}
                      {item.type === 'receipt' && <FileText size={16} style={{ color: '#10b981' }} />}
                      
                      <div style={itemInfoStyles}>
                        <span style={itemTitleStyles}>
                          {item.type === 'receipt' ? `Receipt: ${item.receiptNumber}` : (item.name || item.companyName || item.title)}
                        </span>
                        <span style={itemDescStyles}>
                          {item.type === 'intern' && `Intern — ${item.department}`}
                          {item.type === 'client' && `Client Account — ${item.industry}`}
                          {item.type === 'course' && `Course — ${item.category}`}
                          {item.type === 'student' && `Student — Phone: ${item.phone || 'N/A'}`}
                          {item.type === 'receipt' && `Receipt — Issued for ${item.studentName}`}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={selectHintStyles}>
                        <span>Jump to</span>
                        <CornerDownLeft size={10} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
  justifyContent: 'center',
  zIndex: 1000,
  padding: '80px 16px 16px 16px', // Shift up slightly
};

const containerStyles = {
  width: '100%',
  maxWidth: '600px',
  height: 'fit-content',
  maxHeight: '450px',
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  borderRadius: 'var(--border-radius)',
  overflow: 'hidden',
  border: '1px solid rgba(99, 102, 241, 0.3)',
};

const searchHeaderStyles = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid var(--glass-border)',
  gap: '12px',
};

const inputStyles = {
  background: 'none',
  border: 'none',
  color: 'white',
  fontSize: '16px',
  width: '100%',
  outline: 'none',
};

const bodyStyles = {
  overflowY: 'auto',
  maxHeight: '380px',
};

const statusStyles = {
  textAlign: 'center',
  padding: '30px 16px',
  color: 'var(--text-secondary)',
};

const tipStyles = {
  padding: '30px 20px',
  textAlign: 'center',
  color: 'var(--text-secondary)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const kbdStyles = {
  fontSize: '10px',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--glass-border)',
  padding: '2px 6px',
  borderRadius: '4px',
  margin: '0 2px',
};

const resultsListStyles = {
  padding: '8px',
};

const itemStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.1s, border-color 0.1s',
  borderLeft: '3px solid transparent',
  marginBottom: '2px',
};

const itemIconTextStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const itemInfoStyles = {
  display: 'flex',
  flexDirection: 'column',
};

const itemTitleStyles = {
  fontWeight: '500',
  fontSize: '13.5px',
};

const itemDescStyles = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
};

const selectHintStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '10px',
  color: 'var(--text-muted)',
};

export default GlobalSearch;
