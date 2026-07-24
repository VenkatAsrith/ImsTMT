import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import { CreditCard, CheckCircle, AlertCircle, IndianRupee, Calendar, RefreshCw, Eye, Download, ExternalLink, Share2, Copy, Send, FileText } from 'lucide-react';

const PaymentList = () => {
  const { apiFetch } = useAuth();
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pay capture form modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payReference, setPayReference] = useState('');
  const [paying, setPaying] = useState(false);

  // Sharing options states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [loadingShare, setLoadingShare] = useState(false);

  const handleOpenShareModal = async (paymentId) => {
    setLoadingShare(true);
    try {
      const res = await apiFetch(`/api/payments/${paymentId}/share`);
      if (res && res.data) {
        setShareData(res.data);
        setIsShareModalOpen(true);
      }
    } catch (err) {
      alert(`Failed to load sharing details: ${err.message}`);
    } finally {
      setLoadingShare(false);
    }
  };

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

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [payRes, recRes] = await Promise.all([
        apiFetch('/api/payments'),
        apiFetch('/api/receipts')
      ]);
      setPayments(payRes.data || []);
      setReceipts(recRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const openPayModal = (id, amount) => {
    setActivePaymentId(id);
    setPayAmount(amount || '');
    setPayMethod('UPI');
    setPayReference(`TXN-${Date.now().toString().substring(5)}`);
    setIsPayModalOpen(true);
  };

  const handleSettlePayment = async (e) => {
    e.preventDefault();
    if (!activePaymentId) return;
    setPaying(true);
    try {
      const res = await apiFetch(`/api/payments/${activePaymentId}/pay`, {
        method: 'PUT',
        body: JSON.stringify({
          method: payMethod,
          referenceNumber: payReference,
          amount: parseFloat(payAmount)
        }),
      });

      if (res && res.data) {
        setIsPayModalOpen(false);
        fetchPayments();
        alert('🎉 Payment processed successfully! PDF receipt generated and notifications simulated in Sandbox.');
      }
    } catch (err) {
      alert(`Payment failed: ${err.message}`);
    } finally {
      setPaying(false);
    }
  };

  const columns = [
    {
      header: 'Student Name',
      accessor: 'studentId',
      render: (row) => {
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600' }}>{row.studentId?.name || 'Unknown Student'}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.studentId?.email}</span>
          </div>
        );
      }
    },
    {
      header: 'Reference Number',
      accessor: 'referenceNumber',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <code style={codeStyles}>{row.referenceNumber}</code>
          {row.invoicePdfUrl && (
            <a 
              href={row.invoicePdfUrl} 
              target="_blank" 
              rel="noreferrer" 
              style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
              title="View Invoice PDF"
            >
              <FileText size={13} />
            </a>
          )}
        </div>
      )
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: row.status === 'Overdue' ? 'var(--danger)' : 'inherit' }}>
          <Calendar size={13} />
          <span>{new Date(row.dueDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      )
    },
    {
      header: 'Amount (INR)',
      accessor: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 'bold' }}>
          ₹{row.amount.toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        let badgeClass = 'badge-muted';
        if (row.status === 'Paid') badgeClass = 'badge-success';
        if (row.status === 'Due') badgeClass = 'badge-warning';
        if (row.status === 'Overdue') badgeClass = 'badge-danger';

        return <span className={`badge ${badgeClass}`}>{row.status}</span>;
      }
    },
    {
      header: 'Method',
      accessor: 'method',
      render: (row) => row.status === 'Paid' ? <span style={{ fontSize: '12px' }}>{row.method}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (row) => {
        const receipt = receipts.find(r => r.paymentId?._id === row._id || r.paymentId === row._id);
        return row.status !== 'Paid' ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => openPayModal(row._id, row.amount)} 
              className="btn btn-primary" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Settle Payment
            </button>
            <button 
              onClick={() => handleOpenShareModal(row._id)} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', borderColor: 'var(--primary-glow)' }}
              title="Share Invoice & Payment QR"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '13px', fontWeight: '500' }}>
              <CheckCircle size={14} />
              <span>Settled</span>
            </div>
            {receipt && (
              <>
                <a 
                  href={receipt.pdfUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  title="View Receipt PDF"
                >
                  <Eye size={12} />
                  <span>View</span>
                </a>
                <button 
                  onClick={() => handleDownloadFile(receipt.pdfUrl, `Receipt_${receipt.receiptNumber}`)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  title="Download Receipt PDF"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const filterOptions = [
    { label: 'Paid Invoices', value: 'Paid' },
    { label: 'Due Invoices', value: 'Due' },
    { label: 'Overdue Invoices', value: 'Overdue' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={headerStyles}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Billing Ledger</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage invoices, capture payments, and audit transaction records.</p>
        </div>
        <button onClick={fetchPayments} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading billing records...</div>
      ) : (
        <div className="glass-card" style={{ padding: '20px' }}>
          <Table
            columns={columns}
            data={payments}
            searchPlaceholder="Search invoices by reference number..."
            filterOptions={filterOptions}
          />
        </div>
      )}

      {/* Settle Payment Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Capture Settle Payment Dues">
        <form onSubmit={handleSettlePayment} style={formStyles}>
          <div className="form-group">
            <label>Amount to Settle (INR)</label>
            <input 
              type="number" 
              className="form-control" 
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>

          <div className="form-group">
            <label>Payment Mode / Method</label>
            <select 
              className="form-control" 
              value={payMethod} 
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
              <option value="Stripe">Stripe / Credit Card</option>
              <option value="Bank Transfer">Bank Wire Transfer</option>
              <option value="PayPal">PayPal</option>
              <option value="Cash">Cash Handover</option>
            </select>
          </div>

          <div className="form-group">
            <label>Transaction / Reference ID</label>
            <input 
              type="text" 
              className="form-control" 
              required
              value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
              placeholder="e.g. TXN-123456"
            />
          </div>

          <button type="submit" disabled={paying} className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
            <IndianRupee size={16} />
            <span>{paying ? 'Processing...' : 'Settle Invoice'}</span>
          </button>
        </form>
      </Modal>

      {/* Share Invoice Modal */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Fee Invoice & Pay Link">
        {shareData && (
          <div style={formStyles}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '16px' }}>
              {shareData.qrCode ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={shareData.qrCode} alt="Payment QR Code" style={{ width: '150px', height: '150px', borderRadius: '8px', border: '4px solid #fff' }} />
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '700', letterSpacing: '0.05em' }}>SCAN TO PAY SECURELY</p>
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generating QR Code...</p>
              )}
            </div>

            <div className="form-group">
              <label>Invoice Document (PDF)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href={shareData.invoicePdfUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-secondary" 
                  style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', padding: '10px' }}
                >
                  <Eye size={15} />
                  <span>View Invoice PDF</span>
                </a>
                <button 
                  type="button"
                  onClick={() => handleDownloadFile(shareData.invoicePdfUrl, `Invoice_${shareData.referenceNumber}`)}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', padding: '10px' }}
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Secure Online Payment Link (Razorpay)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  readOnly 
                  value={shareData.paymentLink} 
                  style={{ flexGrow: 1, fontFamily: 'monospace', fontSize: '12px', padding: '10px' }} 
                />
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareData.paymentLink);
                    alert('Payment link copied to clipboard!');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  title="Copy payment link"
                >
                  <Copy size={14} />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>WhatsApp Invoice Text (Editable)</label>
              <textarea 
                className="form-control" 
                rows="5" 
                value={shareData.whatsappMessage} 
                onChange={(e) => setShareData(prev => ({ ...prev, whatsappMessage: e.target.value }))}
                style={{ resize: 'none', fontSize: '12px', lineHeight: '1.4', padding: '10px', color: 'var(--text-secondary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button 
                type="button"
                onClick={async () => {
                  try {
                    await apiFetch(`/api/payments/whatsapp/send-mock`, {
                      method: 'POST',
                      body: JSON.stringify({
                        to: shareData.phone,
                        body: shareData.whatsappMessage,
                        mediaUrl: shareData.invoicePdfUrl
                      })
                    });
                    
                    // Log audit log
                    await apiFetch(`/api/students/${shareData.studentId || ''}/audit-whatsapp`, {
                      method: 'POST',
                      body: JSON.stringify({
                        details: `Invoice Payment Link WhatsApp template sent via Twilio Sandbox: "${shareData.whatsappMessage}"`
                      })
                    });

                    alert('✅ WhatsApp message logged in sandbox simulation!');
                  } catch (err) {
                    alert(`Failed to send WhatsApp: ${err.message}`);
                  }
                }}
                className="btn btn-primary"
                style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px' }}
              >
                <Send size={15} />
                <span>Send via Twilio</span>
              </button>

              <button 
                type="button"
                onClick={async () => {
                  // Log audit log
                  try {
                    if (shareData.studentId) {
                      await apiFetch(`/api/students/${shareData.studentId}/audit-whatsapp`, {
                        method: 'POST',
                        body: JSON.stringify({
                          details: `Invoice Payment Link WhatsApp template sent via deep link redirection: "${shareData.whatsappMessage}"`
                        })
                      });
                    }
                  } catch (e) {
                    console.error(e);
                  }
                  
                  const cleanPhone = shareData.phone.replace(/[^0-9]/g, '');
                  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareData.whatsappMessage)}`;
                  window.open(url, '_blank');
                }}
                className="btn btn-secondary"
                style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px' }}
              >
                <ExternalLink size={15} />
                <span>WhatsApp Web</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// --- Styles objects ---
const headerStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '10px',
  flexWrap: 'wrap',
  gap: '16px',
};

const codeStyles = {
  fontFamily: 'monospace',
  backgroundColor: 'rgba(255,255,255,0.04)',
  padding: '2px 6px',
  borderRadius: '4px',
  color: 'var(--primary)',
};

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

export default PaymentList;
