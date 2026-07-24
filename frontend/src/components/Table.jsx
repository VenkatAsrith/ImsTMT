import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const Table = ({ columns, data, searchPlaceholder = 'Search...', filterOptions = [], onFilterChange, bulkActions = [], showSearch = true, showFilterDropdown = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Handle sorting trigger
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and Search Logic combined
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter by category/dropdown if provided
    if (selectedFilter && !onFilterChange) {
      result = result.filter(item => {
        for (let key in item) {
          const val = item[key];
          if (val && typeof val === 'object') {
            if (Object.values(val).some(nestedVal => String(nestedVal).toLowerCase() === selectedFilter.toLowerCase())) {
              return true;
            }
          }
          if (String(val).toLowerCase() === selectedFilter.toLowerCase()) {
            return true;
          }
        }
        return false;
      });
    }

    // Text search matching
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((row) => {
        return Object.keys(row).some((key) => {
          const val = row[key];
          if (val && typeof val === 'object') {
            // Check nested object strings e.g. client name
            return Object.values(val).some(nestedVal => 
              String(nestedVal).toLowerCase().includes(lowerSearch)
            );
          }
          return val && String(val).toLowerCase().includes(lowerSearch);
        });
      });
    }

    // Sort matching
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // String cleanup
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, selectedFilter, sortConfig, onFilterChange]);

  // Paginated display subset
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  // Selection managers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = paginatedData.map(item => item._id).filter(id => id);
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id, checked) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  // CSV Exporter
  const exportToCSV = () => {
    if (processedData.length === 0) return;
    
    // Header row
    const headers = columns.map(col => col.header).join(',');
    
    // Body rows
    const rows = processedData.map(row => {
      return columns.map(col => {
        let val = '';
        if (typeof col.accessor === 'function') {
          val = col.accessor(row);
        } else {
          val = row[col.accessor];
        }
        // Escape commas and quotes
        const valStr = String(val === undefined || val === null ? '' : val);
        return `"${valStr.replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tmt_operations_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={containerStyles}>
      {/* Controls Header Panel */}
      <div style={controlsStyles}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexGrow: 1 }}>
          {showSearch && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={searchBarStyles}
              className="form-control"
            />
          )}

          {showFilterDropdown && filterOptions.length > 0 && (
            <select
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value);
                setCurrentPage(1);
                if (onFilterChange) onFilterChange(e.target.value);
              }}
              style={selectStyles}
              className="form-control"
            >
              <option value="">All Categories</option>
              {filterOptions.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {selectedIds.size > 0 && bulkActions.length > 0 && (
            <div style={bulkActionPanelStyles}>
              <span style={bulkTextStyles}>{selectedIds.size} selected:</span>
              {bulkActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    action.onClick(Array.from(selectedIds));
                    setSelectedIds(new Set()); // Reset selections
                  }}
                  className={`btn ${action.type === 'danger' ? 'btn-danger' : 'btn-secondary'}`}
                  style={bulkBtnStyles}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={exportToCSV} className="btn btn-secondary" style={exportBtnStyles}>
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Main Table Layout */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              {/* Optional checkbox header */}
              {bulkActions.length > 0 && (
                <th style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} onClick={() => requestSort(col.accessor)}>
                  <div style={headerCellStyles}>
                    <span>{col.header}</span>
                    {sortConfig.key === col.accessor ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)} style={emptyCellStyles}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr key={row._id || rowIdx}>
                  {bulkActions.length > 0 && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row._id)}
                        onChange={(e) => handleSelectRow(row._id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()} // Stop row click trigger
                      />
                    </td>
                  )}
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} data-label={col.header}>
                      {typeof col.render === 'function' 
                        ? col.render(row) 
                        : typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="pagination">
          <div style={paginationInfoStyles}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
          </div>
          <div style={paginationControlsStyles}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="btn btn-secondary"
              style={pageBtnStyles}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={pageIndicatorStyles}>Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="btn btn-secondary"
              style={pageBtnStyles}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Styles objects ---
const containerStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  width: '100%',
};

const controlsStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px',
};

const searchBarStyles = {
  maxWidth: '280px',
  minWidth: '200px',
};

const selectStyles = {
  maxWidth: '200px',
  cursor: 'pointer',
};

const bulkActionPanelStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  backgroundColor: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid rgba(99, 102, 241, 0.2)',
  padding: '4px 12px',
  borderRadius: '8px',
};

const bulkTextStyles = {
  fontSize: '12px',
  color: 'var(--primary)',
  fontWeight: '600',
};

const bulkBtnStyles = {
  padding: '6px 12px',
  fontSize: '12px',
};

const exportBtnStyles = {
  padding: '8px 16px',
};

const headerCellStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const emptyCellStyles = {
  textAlign: 'center',
  padding: '40px 16px',
  color: 'var(--text-secondary)',
};

const paginationInfoStyles = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
};

const paginationControlsStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const pageBtnStyles = {
  padding: '8px',
  minWidth: 'auto',
};

const pageIndicatorStyles = {
  fontSize: '13px',
  color: 'var(--text-primary)',
};

export default Table;
