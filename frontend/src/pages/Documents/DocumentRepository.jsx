import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/Table';
import { FileText, Calendar, Filter, Download, User, Eye, ExternalLink } from 'lucide-react';

const DocumentRepository = () => {
  const { apiFetch } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Filter states
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/documents');
      if (res && res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Get unique categories for dropdown filter
  const uniqueCategories = useMemo(() => {
    const cats = documents.map(d => d.category).filter(Boolean);
    return [...new Set(cats)];
  }, [documents]);

  // Apply custom filters
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // 1. Filter by Type
      if (selectedType && doc.type !== selectedType) {
        return false;
      }
      // 2. Filter by Category
      if (selectedCategory && doc.category !== selectedCategory) {
        return false;
      }
      // 3. Filter by Date range
      if (dateFrom) {
        const docDate = new Date(doc.date);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (docDate < fromDate) return false;
      }
      if (dateTo) {
        const docDate = new Date(doc.date);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (docDate > toDate) return false;
      }
      return true;
    });
  }, [documents, selectedType, selectedCategory, dateFrom, dateTo]);

  const columns = [
    {
      header: 'Document Title',
      accessor: 'title',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: '500' }}>{row.title}</span>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => {
        let badgeColor = 'var(--text-secondary)';
        let badgeBg = 'rgba(100,116,139,0.1)';

        if (row.type === 'Receipt') {
          badgeColor = 'var(--success)';
          badgeBg = 'var(--success-glow)';
        } else if (row.type === 'Intern Submission') {
          badgeColor = 'var(--warning)';
          badgeBg = 'var(--warning-glow)';
        } else if (row.type === 'Generated Letter') {
          badgeColor = 'var(--primary)';
          badgeBg = 'var(--primary-glow)';
        } else if (row.type === 'Student Document' || row.type === 'Intern Document') {
          badgeColor = '#3b82f6';
          badgeBg = 'rgba(59, 130, 246, 0.1)';
        }

        return (
          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '12px',
            backgroundColor: badgeBg,
            color: badgeColor,
            fontWeight: 'bold',
          }}>
            {row.type}
          </span>
        );
      }
    },
    {
      header: 'Category',
      accessor: 'category',
    },
    {
      header: 'Associated Person',
      accessor: 'personName',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={13} style={{ color: 'var(--text-secondary)' }} />
          <span>{row.personName}</span>
        </div>
      )
    },
    {
      header: 'Date Created / Uploaded',
      accessor: 'date',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={13} style={{ color: 'var(--text-secondary)' }} />
          <span>{new Date(row.date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'url',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <a 
            href={row.url} 
            target="_blank" 
            rel="noreferrer" 
            className="btn btn-secondary" 
            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Open document in a new tab"
          >
            <Eye size={13} />
            <span>View</span>
          </a>
          <button 
            onClick={() => handleDownloadFile(row.url, row.title || 'document')} 
            className="btn btn-primary" 
            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Download document directly"
          >
            <Download size={13} />
            <span>Download</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Unified Document Repository</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Access, filter, and audit all receipts, generated letters, profile forms, and intern submission deliverables across the portal.
        </p>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
          <Filter size={16} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '14px', margin: 0, fontWeight: '600' }}>Filter Documents</h3>
        </div>

        <div style={filterGridStyles}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Document Type</label>
            <select 
              className="form-control" 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">All Types</option>
              <option value="Receipt">Receipts</option>
              <option value="Student Document">Student Documents</option>
              <option value="Intern Document">Intern Documents</option>
              <option value="Intern Submission">Intern Submissions</option>
              <option value="Generated Letter">Generated Letters</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
            <select 
              className="form-control" 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date From</label>
            <input 
              type="date" 
              className="form-control" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date To</label>
            <input 
              type="date" 
              className="form-control" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Clear Filters helper */}
        {(selectedType || selectedCategory || dateFrom || dateTo) && (
          <button 
            onClick={() => {
              setSelectedType('');
              setSelectedCategory('');
              setDateFrom('');
              setDateTo('');
            }}
            className="btn btn-secondary"
            style={{ marginTop: '14px', padding: '6px 12px', fontSize: '12px' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading document archives...</div>
      ) : (
        <div className="glass-card" style={{ padding: '20px' }}>
          <Table
            columns={columns}
            data={filteredDocuments}
            searchPlaceholder="Search by document title or person name..."
            showFilterDropdown={false}
          />
        </div>
      )}
    </div>
  );
};

// --- Styles objects ---
const filterGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
};

export default DocumentRepository;
