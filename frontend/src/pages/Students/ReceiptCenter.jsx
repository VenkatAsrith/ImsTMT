import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Table from '../../components/Table';
import WhatsAppModal from '../../components/WhatsAppModal';
import { FileDown, Send, MessageCircle, Calendar, FileText } from 'lucide-react';

const ReceiptCenter = () => {
  const { apiFetch } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // WhatsApp Modal state
  const [whatsappState, setWhatsappState] = useState({
    isOpen: false,
    studentName: '',
    phone: '',
    amount: 0,
    receiptUrl: '',
  });

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/receipts');
      setReceipts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const openWhatsApp = (receipt) => {
    const payment = receipt.paymentId;
    const student = payment?.studentId;
    const courseList = student?.coursesTaken?.map(c => c.courseId?.title).filter(Boolean).join(', ') || '';

    setWhatsappState({
      isOpen: true,
      studentName: student?.name || 'Student',
      phone: student?.phone || '',
      amount: payment?.amount || 0,
      receiptUrl: receipt.pdfUrl,
      outstandingBalance: student?.outstandingBalance || 0,
      dueDate: payment?.dueDate ? new Date(payment.dueDate).toLocaleDateString() : '',
      courses: courseList,
      mentor: student?.assignedMentor || '',
      receiptNumber: receipt.receiptNumber || '',
      studentId: student?._id || '',
    });
  };

  const columns = [
    {
      header: 'Receipt Number',
      accessor: 'receiptNumber',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} style={{ color: 'var(--success)' }} />
          <code style={codeStyles}>{row.receiptNumber}</code>
        </div>
      )
    },
    {
      header: 'Student Name',
      accessor: 'paymentId',
      render: (row) => row.paymentId?.studentId?.name || 'Unknown Student'
    },
    {
      header: 'Issue Date',
      accessor: 'issueDate',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={13} style={{ color: 'var(--text-secondary)' }} />
          <span>{new Date(row.issueDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: '_id',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Direct download points to Express static static uploads endpoint */}
          <a 
            href={row.pdfUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <FileDown size={14} style={{ marginRight: '6px' }} />
            <span>Download PDF</span>
          </a>

          <button 
            onClick={() => openWhatsApp(row)} 
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
          >
            <MessageCircle size={14} style={{ marginRight: '6px' }} />
            <span>Send WhatsApp</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Receipt Center</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Access generated tuition receipts, audit invoices compliance, and dispatch WhatsApp receipt links.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading receipt registry...</div>
      ) : (
        <div className="glass-card" style={{ padding: '20px' }}>
          <Table
            columns={columns}
            data={receipts}
            searchPlaceholder="Search by receipt number..."
          />
        </div>
      )}

      {/* WhatsApp Modal Trigger */}
      <WhatsAppModal
        isOpen={whatsappState.isOpen}
        onClose={() => setWhatsappState(prev => ({ ...prev, isOpen: false }))}
        studentName={whatsappState.studentName}
        phoneNumber={whatsappState.phone}
        amount={whatsappState.amount}
        receiptUrl={whatsappState.receiptUrl}
        outstandingBalance={whatsappState.outstandingBalance}
        dueDate={whatsappState.dueDate}
        courses={whatsappState.courses}
        mentor={whatsappState.mentor}
        receiptNumber={whatsappState.receiptNumber}
        studentId={whatsappState.studentId}
      />
    </div>
  );
};

// --- Styles ---
const codeStyles = {
  fontFamily: 'monospace',
  backgroundColor: 'rgba(255,255,255,0.04)',
  padding: '2px 6px',
  borderRadius: '4px',
  color: 'var(--success)',
};

export default ReceiptCenter;
