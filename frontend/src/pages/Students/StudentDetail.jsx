import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  ArrowLeft, 
  GraduationCap, 
  BookOpen, 
  CreditCard, 
  History, 
  Plus, 
  CheckCircle,
  AlertTriangle,
  IndianRupee,
  Trash2,
  ClipboardList,
  X,
  GripVertical,
  AlertOctagon,
  Circle,
  Loader2,
  CheckCircle2,
  Award,
  FileText,
  Upload,
  Download,
  Eye,
  ExternalLink,
  Share2,
  Copy,
  Send
} from 'lucide-react';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]); // All courses catalog for enrollment
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  // Enrollment form states
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Billing form states
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('');

  // Tuition Fee settings states
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [editTotalFee, setEditTotalFee] = useState('');
  const [editPaidAmount, setEditPaidAmount] = useState('');
  const [editFeeRemarks, setEditFeeRemarks] = useState('');
  const [editNextDueDate, setEditNextDueDate] = useState('');
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);

  // Work Log states
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [workLogTitle, setWorkLogTitle] = useState('');
  const [workLogDesc, setWorkLogDesc] = useState('');
  const [workLogStatus, setWorkLogStatus] = useState('To Do');
  const [workLogCategory, setWorkLogCategory] = useState('Other');
  const [draggedLogId, setDraggedLogId] = useState(null);

  // Exam Section states
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examName, setExamName] = useState('');
  const [examTypeOfTest, setExamTypeOfTest] = useState('Quiz');
  const [examTypeOfExam, setExamTypeOfExam] = useState('Online');
  const [examResult, setExamResult] = useState('Pass');
  const [examMarksSecured, setExamMarksSecured] = useState('');
  const [examTotalMarks, setExamTotalMarks] = useState('100');
  const [examDate, setExamDate] = useState('');
  const [examRemarks, setExamRemarks] = useState('');
  const [savingExam, setSavingExam] = useState(false);

  // Manual payment recording states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payReference, setPayReference] = useState('');
  const [paying, setPaying] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // Student documents upload states
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState(null);

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

  const fetchStudentDetails = async () => {
    try {
      const res = await apiFetch(`/api/students/${id}`);
      if (res && res.data) {
        setStudent(res.data);
        setEditTotalFee(res.data.financialAccount?.courseFee || 0);
        setEditPaidAmount(res.data.financialAccount?.scholarshipAmount || 0);
        setEditFeeRemarks(res.data.financialAccount?.remarks || '');
        setEditNextDueDate(res.data.financialAccount?.nextDueDate ? res.data.financialAccount.nextDueDate.substring(0, 10) : '');
      }

      // Load all courses for enrollment dropdown
      const coursesRes = await apiFetch('/api/courses');
      setCourses(coursesRes.data || []);

      // Load payments
      const paymentsRes = await apiFetch(`/api/payments?studentId=${id}`);
      setPayments(paymentsRes.data || []);

      // Load receipts
      const receiptsRes = await apiFetch(`/api/receipts?studentId=${id}`);
      setReceipts(receiptsRes.data || []);

      // Load student specific timeline audit logs
      const auditsRes = await apiFetch(`/api/students/${id}/audit-logs`);
      if (auditsRes && auditsRes.data) {
        setAudits(auditsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentDetails();
  }, [id]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    try {
      await apiFetch(`/api/students/${id}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ courseId: selectedCourseId }),
      });
      setIsEnrollModalOpen(false);
      setSelectedCourseId('');
      fetchStudentDetails();
      alert('Student successfully enrolled in course!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCompleteCourse = async (courseId) => {
    if (!window.confirm('Mark this course as completed?')) return;
    try {
      await apiFetch(`/api/students/${id}/complete-course`, {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      });
      fetchStudentDetails();
      alert('Course completion recorded.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnenrollCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to unenroll the student from "${courseTitle || 'this course'}"?`)) return;
    try {
      await apiFetch(`/api/students/${id}/courses/${courseId}`, {
        method: 'DELETE',
      });
      fetchStudentDetails();
      alert('Student successfully unenrolled from course.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePayment = async (paymentId, referenceNumber) => {
    if (!window.confirm(`Are you sure you want to permanently delete the invoice "${referenceNumber || 'this invoice'}"? This will reverse any settled funds and delete the receipt.`)) return;
    try {
      await apiFetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
      });
      fetchStudentDetails();
      alert('Invoice deleted successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          studentId: id,
          amount: parseFloat(billAmount),
          dueDate: billDueDate,
        }),
      });
      setIsBillModalOpen(false);
      setBillAmount('');
      setBillDueDate('');
      fetchStudentDetails();
      alert('Tuition invoice created successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateFeeDetails = async (e) => {
    e.preventDefault();
    setIsUpdatingFee(true);
    try {
      await apiFetch(`/api/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          courseFee: parseFloat(editTotalFee) || 0,
          scholarshipAmount: parseFloat(editPaidAmount) || 0,
          financialRemarks: editFeeRemarks,
          nextDueDate: editNextDueDate || null,
        }),
      });
      setIsFeeModalOpen(false);
      fetchStudentDetails();
      alert('Fee details updated successfully!');
    } catch (err) {
      alert(`Failed to update fee details: ${err.message}`);
    } finally {
      setIsUpdatingFee(false);
    }
  };

  const handleSettlePayment = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) {
      alert('A valid payment amount is required.');
      return;
    }
    setPaying(true);
    try {
      let res;
      if (selectedInvoiceId) {
        // Settle specific invoice
        res = await apiFetch(`/api/payments/${selectedInvoiceId}/pay`, {
          method: 'PUT',
          body: JSON.stringify({
            method: payMethod,
            referenceNumber: payReference,
            amount: parseFloat(payAmount)
          })
        });
      } else {
        // Record direct payment transaction
        res = await apiFetch('/api/payments', {
          method: 'POST',
          body: JSON.stringify({
            studentId: id,
            amount: parseFloat(payAmount),
            method: payMethod,
            referenceNumber: payReference
          })
        });
      }
      if (res && res.data) {
        setIsPayModalOpen(false);
        setSelectedInvoiceId(null);
        setPayAmount('');
        setPayReference('');
        fetchStudentDetails();
        alert('🎉 Payment captured successfully! Receipt generated and notifications dispatched.');
      }
    } catch (err) {
      alert(`Payment recording failed: ${err.message}`);
    } finally {
      setPaying(false);
    }
  };

  // --- Exam Section Handlers ---
  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!examName.trim() || !examMarksSecured) return;
    setSavingExam(true);
    try {
      await apiFetch(`/api/students/${id}/exams`, {
        method: 'POST',
        body: JSON.stringify({
          test: examName,
          typeOfTest: examTypeOfTest,
          typeOfExam: examTypeOfExam,
          result: examResult,
          marksSecured: parseFloat(examMarksSecured),
          totalMarks: parseFloat(examTotalMarks) || 100,
          dateOfExamination: examDate ? new Date(examDate) : undefined,
          remarks: examRemarks,
        }),
      });
      setIsExamModalOpen(false);
      setExamName('');
      setExamTypeOfTest('Quiz');
      setExamTypeOfExam('Online');
      setExamResult('Pass');
      setExamMarksSecured('');
      setExamTotalMarks('100');
      setExamDate('');
      setExamRemarks('');
      fetchStudentDetails();
      alert('🎉 Exam record added successfully!');
    } catch (err) {
      alert(`Failed to add exam record: ${err.message}`);
    } finally {
      setSavingExam(false);
    }
  };

  const handleDeleteExam = async (examId, examTitle) => {
    if (!window.confirm(`Are you sure you want to delete the exam record "${examTitle}"?`)) return;
    try {
      await apiFetch(`/api/students/${id}/exams/${examId}`, {
        method: 'DELETE',
      });
      fetchStudentDetails();
      alert('Exam record deleted successfully.');
    } catch (err) {
      alert(`Failed to delete exam record: ${err.message}`);
    }
  };

  // --- Work Log Handlers ---
  const handleAddWorkLog = async (e) => {
    e.preventDefault();
    if (!workLogTitle.trim()) return;
    try {
      await apiFetch(`/api/students/${id}/worklog`, {
        method: 'POST',
        body: JSON.stringify({
          title: workLogTitle,
          description: workLogDesc,
          status: workLogStatus,
          category: workLogCategory,
        }),
      });
      setIsWorkLogModalOpen(false);
      setWorkLogTitle('');
      setWorkLogDesc('');
      setWorkLogStatus('To Do');
      setWorkLogCategory('Other');
      fetchStudentDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateWorkLogStatus = async (logId, newStatus) => {
    try {
      await apiFetch(`/api/students/${id}/worklog/${logId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchStudentDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteWorkLog = async (logId, logTitle) => {
    if (!window.confirm(`Remove work log item "${logTitle}"?`)) return;
    try {
      await apiFetch(`/api/students/${id}/worklog/${logId}`, {
        method: 'DELETE',
      });
      fetchStudentDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  // Drag-and-drop handlers for work log
  const handleWLDragStart = (e, logId) => {
    setDraggedLogId(logId);
    e.dataTransfer.setData('text/plain', logId);
    setTimeout(() => {
      const el = document.getElementById(`wl-card-${logId}`);
      if (el) el.style.opacity = '0.4';
    }, 0);
  };

  const handleWLDragEnd = (e, logId) => {
    setDraggedLogId(null);
    const el = document.getElementById(`wl-card-${logId}`);
    if (el) el.style.opacity = '1';
  };

  const handleWLDragOver = (e) => {
    e.preventDefault();
  };

  const handleWLDrop = (e, targetStatus) => {
    e.preventDefault();
    const logId = e.dataTransfer.getData('text/plain') || draggedLogId;
    if (logId) {
      handleUpdateWorkLogStatus(logId, targetStatus);
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

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('name', docName || file.name);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/students/${id}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Failed to upload document');
      }

      setDocName('');
      setFile(null);
      fetchStudentDetails();
      alert('Document uploaded successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to delete the document "${docName || 'this document'}"?`)) return;
    try {
      const res = await apiFetch(`/api/students/${id}/documents/${docId}`, {
        method: 'DELETE',
      });
      if (res && res.data) {
        fetchStudentDetails();
        alert('Document deleted successfully.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Loading student details...</div>;
  if (!student) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--danger)' }}>Student record not found!</div>;

  // Work log computations
  const workLog = student.workLog || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = workLog.filter(w => w.status === 'Done' && new Date(w.updatedAt) >= today).length;
  const inProgressCount = workLog.filter(w => w.status === 'In Progress').length;
  const blockedCount = workLog.filter(w => w.status === 'Blocked').length;

  const workLogColumns = [
    { id: 'To Do', title: 'To Do', color: '#0ea5e9', icon: Circle },
    { id: 'In Progress', title: 'In Progress', color: '#f59e0b', icon: Loader2 },
    { id: 'Done', title: 'Done', color: '#10b981', icon: CheckCircle2 },
    { id: 'Blocked', title: 'Blocked', color: '#ef4444', icon: AlertOctagon },
  ];

  const getCategoryBadge = (category) => {
    const colors = {
      'Assignment': { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.4)', color: '#818cf8' },
      'Project': { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.4)', color: '#34d399' },
      'Exam Prep': { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' },
      'Research': { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.4)', color: '#a78bfa' },
      'Other': { bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.4)', color: '#94a3b8' },
    };
    const c = colors[category] || colors['Other'];
    return c;
  };

  return (
    <div className="animate-fade-in">
      <div style={topBarStyles}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/learning/students')} className="btn btn-secondary" style={backBtnStyles}>
            <ArrowLeft size={16} />
            <span>Back to Directory</span>
          </button>
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to permanently delete student "${student.name}"? This will delete all associated payments and receipts.`)) {
                try {
                  await apiFetch(`/api/students/${student._id}`, { method: 'DELETE' });
                  alert('Student profile deleted successfully.');
                  navigate('/learning/students');
                } catch (err) {
                  alert(`Failed to delete student: ${err.message}`);
                }
              }
            }} 
            className="btn btn-secondary" 
            style={{ ...backBtnStyles, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={16} />
            <span>Delete Student</span>
          </button>
        </div>
        <div style={metaBadgeContainerStyles}>
          <span className="badge badge-info">{student.status}</span>
          <span className={`badge ${(student.financialAccount?.balanceAmount || 0) > 0 ? 'badge-danger' : 'badge-success'}`}>
            Dues: ₹{(student.financialAccount?.balanceAmount || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div style={profileHeaderCardStyles} className="glass-card">
        <div style={headerMainStyles}>
          <div style={avatarLargeStyles}>
            <GraduationCap size={24} />
          </div>
          <div>
            <h2 style={{ marginBottom: '4px' }}>{student.name}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Onboarding Stage: <strong>{student.onboardingStage}</strong> | Registered Phone: {student.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="tab-header">
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          Profile Details
        </button>
        <button className={`tab-btn ${activeTab === 'worklog' ? 'active' : ''}`} onClick={() => setActiveTab('worklog')}>
          <ClipboardList size={14} style={{ marginRight: '6px' }} />
          Work Log ({workLog.length})
        </button>
        <button className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
          <BookOpen size={14} style={{ marginRight: '6px' }} />
          Enrolled Programs ({student.coursesTaken?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => setActiveTab('exams')}>
          <Award size={14} style={{ marginRight: '6px' }} />
          Exam Section ({(student.exams || []).length})
        </button>
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          <CreditCard size={14} style={{ marginRight: '6px' }} />
          Tuition Ledger ({payments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          <FileText size={14} style={{ marginRight: '6px' }} />
          Documents ({student.documentUrls?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          <History size={14} style={{ marginRight: '6px' }} />
          Activity Log
        </button>
      </div>

      {/* Tab Panels */}
      <div style={tabContentStyles}>
        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card">
              <h3 style={sectionTitleStyles}>Student Information</h3>
              <div style={detailsGridStyles}>
                <p><strong>Full Name:</strong> {student.name}</p>
                <p><strong>Email Address:</strong> {student.email}</p>
                <p><strong>Phone Number:</strong> {student.phone}</p>
                <p><strong>Admission Date:</strong> {new Date(student.admissionDate).toLocaleDateString()}</p>
                <p><strong>Start Date:</strong> {student.startDate ? new Date(student.startDate).toLocaleDateString() : 'Not Set'}</p>
                <p><strong>Assigned Mentor:</strong> {student.assignedMentor || 'Not Assigned'}</p>
                <p><strong>Onboarding Stage:</strong> {student.onboardingStage}</p>
                <p><strong>Status:</strong> {student.status}</p>
                <p><strong>Exam Attended:</strong> {student.examAttended ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Exam Score:</strong> {student.examScore !== null && student.examScore !== undefined ? `${student.examScore} / 100` : 'N/A'}</p>
              </div>
            </div>

            {/* Centralized Financial Summary Card */}
            <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ ...sectionTitleStyles, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} />
                <span>Financial Summary Dashboard</span>
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
                <div style={finCardBoxStyles}>
                  <span style={finCardLabelStyles}>Course Fee</span>
                  <div style={finCardValueStyles}>
                    ₹{(student.financialAccount?.courseFee || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                
                <div style={finCardBoxStyles}>
                  <span style={finCardLabelStyles}>Scholarship / Discount</span>
                  <div style={{ ...finCardValueStyles, color: 'var(--primary)' }}>
                    ₹{(student.financialAccount?.scholarshipAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={finCardBoxStyles}>
                  <span style={finCardLabelStyles}>Agreed Fee</span>
                  <div style={finCardValueStyles}>
                    ₹{(student.financialAccount?.agreedAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ ...finCardBoxStyles, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                  <span style={{ ...finCardLabelStyles, color: '#10b981' }}>Total Paid</span>
                  <div style={{ ...finCardValueStyles, color: '#10b981' }}>
                    ₹{(student.financialAccount?.totalPaid || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ 
                  ...finCardBoxStyles, 
                  backgroundColor: (student.financialAccount?.balanceAmount || 0) > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', 
                  borderColor: (student.financialAccount?.balanceAmount || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' 
                }}>
                  <span style={{ 
                    ...finCardLabelStyles, 
                    color: (student.financialAccount?.balanceAmount || 0) > 0 ? 'var(--danger)' : '#10b981' 
                  }}>
                    Balance Due
                  </span>
                  <div style={{ 
                    ...finCardValueStyles, 
                    color: (student.financialAccount?.balanceAmount || 0) > 0 ? 'var(--danger)' : '#10b981' 
                  }}>
                    ₹{(student.financialAccount?.balanceAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={finCardBoxStyles}>
                  <span style={finCardLabelStyles}>Payment Status</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge ${
                      student.financialAccount?.paymentStatus === 'Paid' ? 'badge-success' :
                      student.financialAccount?.paymentStatus === 'Partially Paid' ? 'badge-info' :
                      student.financialAccount?.paymentStatus === 'Fee Pending' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {student.financialAccount?.paymentStatus || 'Unpaid'}
                    </span>
                  </div>
                </div>

                <div style={finCardBoxStyles}>
                  <span style={finCardLabelStyles}>Next Due Date</span>
                  <div style={{ ...finCardValueStyles, fontSize: '0.95rem', fontWeight: '500', marginTop: '6px' }}>
                    {student.financialAccount?.nextDueDate ? new Date(student.financialAccount.nextDueDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              
              {student.financialAccount?.remarks && (
                <div style={{ marginTop: '16px', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', fontSize: '12px' }}>
                  <strong>Remarks: </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>{student.financialAccount.remarks}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button 
                  onClick={() => {
                    setSelectedInvoiceId(null);
                    setPayAmount(student.financialAccount?.balanceAmount || 0);
                    setPayMethod('UPI');
                    setPayReference(`TXN-${Date.now().toString().substring(5)}`);
                    setIsPayModalOpen(true);
                  }}
                  className="btn btn-primary"
                  disabled={!student.financialAccount || student.financialAccount.balanceAmount <= 0}
                >
                  <CreditCard size={15} style={{ marginRight: '6px' }} />
                  <span>Record Payment Capture</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Work Log (Kanban) */}
        {activeTab === 'worklog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Daily Standup Summary */}
            <div style={standupSummaryContainerStyles}>
              <div style={standupCardStyles}>
                <div style={{ ...standupIconStyles, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span style={standupLabelStyles}>Completed Today</span>
                  <span style={standupValueStyles}>{completedToday}</span>
                </div>
              </div>
              <div style={standupCardStyles}>
                <div style={{ ...standupIconStyles, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <Loader2 size={20} />
                </div>
                <div>
                  <span style={standupLabelStyles}>In Progress</span>
                  <span style={standupValueStyles}>{inProgressCount}</span>
                </div>
              </div>
              <div style={standupCardStyles}>
                <div style={{ ...standupIconStyles, backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <span style={standupLabelStyles}>Blocked</span>
                  <span style={standupValueStyles}>{blockedCount}</span>
                </div>
              </div>
              <button onClick={() => setIsWorkLogModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 18px' }}>
                <Plus size={16} />
                <span>Add Task</span>
              </button>
            </div>

            {/* Kanban Columns */}
            <div style={workLogKanbanContainerStyles} className="worklog-kanban-grid">
              {workLogColumns.map((col) => {
                const ColIcon = col.icon;
                const columnItems = workLog.filter(w => w.status === col.id);

                return (
                  <div
                    key={col.id}
                    style={wlColumnStyles}
                  >
                    {/* Column Header */}
                    <div style={wlColumnHeaderStyles}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ ...wlDotStyles, backgroundColor: col.color }} />
                        <span style={{ fontWeight: '600', fontFamily: 'var(--font-headings)' }}>{col.title}</span>
                      </div>
                      <span style={wlCountBadgeStyles}>{columnItems.length}</span>
                    </div>

                    {/* Cards */}
                    <div style={wlCardsWrapperStyles}>
                      {columnItems.length === 0 ? (
                        <div style={wlEmptyStyles}>No tasks in this stage</div>
                      ) : (
                        columnItems.map((item) => {
                          const catStyle = getCategoryBadge(item.category);
                          return (
                            <div
                              key={item._id}
                              id={`wl-card-${item._id}`}
                              style={wlCardStyles}
                              className="kanban-card"
                            >
                              {/* Card header: category + delete */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{
                                  backgroundColor: catStyle.bg,
                                  border: `1px solid ${catStyle.border}`,
                                  color: catStyle.color,
                                  padding: '1px 8px',
                                  borderRadius: '12px',
                                  fontSize: '9px',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}>
                                  {item.category}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorkLog(item._id, item.title);
                                  }}
                                  style={wlDeleteBtnStyles}
                                  className="wl-delete-btn"
                                  title="Remove task"
                                >
                                  <X size={13} />
                                </button>
                              </div>

                              {/* Title */}
                              <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px', lineHeight: '1.3' }}>
                                {item.title}
                              </h4>

                              {/* Description */}
                              {item.description && (
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                                  {item.description.length > 80 ? item.description.substring(0, 80) + '...' : item.description}
                                </p>
                              )}

                              {/* Footer: date & status dropdown selector */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px', marginTop: '4px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <select
                                  value={item.status}
                                  onChange={(e) => handleUpdateWorkLogStatus(item._id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--glass-border)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                  }}
                                >
                                  <option value="To Do">To Do</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Done">Done</option>
                                  <option value="Blocked">Blocked</option>
                                </select>
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
          </div>
        )}

        {/* Tab 3: Courses */}
        {activeTab === 'courses' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <div style={sectionHeaderStyles}>
                <h3 style={{ margin: 0 }}>Enrolled Learning Courses</h3>
                <button onClick={() => setIsEnrollModalOpen(true)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Enroll Course
                </button>
              </div>

              {(!student.coursesTaken || student.coursesTaken.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>Student has not enrolled in any programs yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {student.coursesTaken.map((enroll) => (
                    <div key={enroll._id} style={courseRowStyles}>
                      <div>
                        <span style={{ fontWeight: '600' }}>{enroll.courseId?.title || 'Unknown Course'}</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Enrolled: {new Date(enroll.enrolledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {enroll.completionDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '13px', fontWeight: '500' }}>
                            <CheckCircle size={16} />
                            <span>Completed {new Date(enroll.completionDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleCompleteCourse(enroll.courseId?._id || enroll.courseId)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            Mark Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleUnenrollCourse(enroll.courseId?._id || enroll.courseId, enroll.courseId?.title)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                          title="Unenroll Course"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Tuition Billing Ledger */}
        {activeTab === 'payments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Tuition Fee Summary Card */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Tuition Fee Agreement</h4>
                <button 
                  onClick={() => setIsFeeModalOpen(true)} 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Update Fee Summary
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agreed Fee</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '4px', color: 'var(--text-primary)' }}>
                    ₹{(student.financialAccount?.agreedAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                  <span style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Paid</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
                    ₹{(student.financialAccount?.totalPaid || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  backgroundColor: (student.financialAccount?.balanceAmount || 0) > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', 
                  border: (student.financialAccount?.balanceAmount || 0) > 0 ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)' 
                }}>
                  <span style={{ 
                    fontSize: '11px', 
                    color: (student.financialAccount?.balanceAmount || 0) > 0 ? 'var(--danger)' : '#10b981', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    Balance Due
                  </span>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    marginTop: '4px', 
                    color: (student.financialAccount?.balanceAmount || 0) > 0 ? 'var(--danger)' : '#10b981' 
                  }}>
                    ₹{(student.financialAccount?.balanceAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', fontSize: '13px' }}>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Leftover Dues Remarks:</strong>
                <span style={{ color: student.financialAccount?.remarks ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: student.financialAccount?.remarks ? 'normal' : 'italic' }}>
                  {student.financialAccount?.remarks || 'No remarks added.'}
                </span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={sectionHeaderStyles}>
                <h3 style={{ margin: 0 }}>Tuition Billing Invoices</h3>
                <button 
                  onClick={() => {
                    setBillAmount(student.financialAccount?.balanceAmount || 0);
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setBillDueDate(nextWeek.toISOString().substring(0, 10));
                    setIsBillModalOpen(true);
                  }} 
                  className="btn btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Issue Invoice Bill
                </button>
              </div>

              {payments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No financial invoices generated.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {payments.map((p) => {
                    let statusClass = 'badge-muted';
                    if (p.status === 'Paid') statusClass = 'badge-success';
                    if (p.status === 'Due') statusClass = 'badge-warning';
                    if (p.status === 'Overdue') statusClass = 'badge-danger';

                    // Find matching receipt
                    const receipt = receipts.find(r => r.paymentId?._id === p._id || r.paymentId === p._id);

                    return (
                      <div key={p._id} style={paymentRowStyles}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>Invoice: {p.referenceNumber}</span>
                            {p.invoicePdfUrl && (
                              <a 
                                href={p.invoicePdfUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="badge badge-info"
                                style={{ fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <FileText size={11} />
                                <span>Invoice PDF</span>
                              </a>
                            )}
                            {receipt && (
                              <a 
                                href={receipt.pdfUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="badge badge-success"
                                style={{ fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                Receipt: {receipt.receiptNumber}
                              </a>
                            )}
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Due Date: {new Date(p.dueDate).toLocaleDateString()}
                            {p.paidDate && ` | Settled Date: ${new Date(p.paidDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                            ₹{p.amount.toLocaleString('en-IN')}
                          </span>
                          <span className={`badge ${statusClass}`}>{p.status}</span>
                          {p.status !== 'Paid' && (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedInvoiceId(p._id);
                                  setPayAmount(p.amount);
                                  setPayMethod('UPI');
                                  setPayReference(`TXN-${Date.now().toString().substring(5)}`);
                                  setIsPayModalOpen(true);
                                }} 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                              >
                                Settle Payment
                              </button>
                              <button 
                                onClick={() => handleOpenShareModal(p._id)} 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', borderColor: 'var(--primary-glow)' }}
                                title="Share Invoice / Get Payment Link & QR"
                              >
                                <Share2 size={13} />
                                <span>Share / Pay Link</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeletePayment(p._id, p.referenceNumber)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                            title="Delete Invoice"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4.5: Exam Section */}
        {activeTab === 'exams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Exam KPI metrics row */}
            <div style={standupSummaryContainerStyles}>
              <div style={standupCardStyles}>
                <div style={{ ...standupIconStyles, backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
                  <Award size={20} />
                </div>
                <div>
                  <span style={standupLabelStyles}>Exams Attended</span>
                  <span style={standupValueStyles}>{(student.exams || []).length}</span>
                </div>
              </div>
              <div style={standupCardStyles}>
                <div style={{ ...standupIconStyles, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <CheckCircle size={20} />
                </div>
                <div>
                  <span style={standupLabelStyles}>Avg Percentage</span>
                  <span style={standupValueStyles}>
                    {(() => {
                      const exams = student.exams || [];
                      if (exams.length === 0) return 'N/A';
                      const totalPercentage = exams.reduce((acc, ex) => acc + (ex.marksSecured / (ex.totalMarks || 100)) * 100, 0);
                      return `${Math.round(totalPercentage / exams.length)}%`;
                    })()}
                  </span>
                </div>
              </div>
              <div style={standupCardStyles}>
                <div style={{ ...standupIconStyles, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <ClipboardList size={20} />
                </div>
                <div>
                  <span style={standupLabelStyles}>Latest Test Score</span>
                  <span style={standupValueStyles}>
                    {(() => {
                      const exams = student.exams || [];
                      if (exams.length === 0) return '—';
                      const latest = [...exams].sort((a,b) => new Date(b.dateOfExamination) - new Date(a.dateOfExamination))[0];
                      return `${latest.marksSecured}/${latest.totalMarks || 100}`;
                    })()}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setExamDate(new Date().toISOString().substring(0, 10));
                  setIsExamModalOpen(true);
                }} 
                className="btn btn-primary" 
                style={{ padding: '10px 18px' }}
              >
                <Plus size={16} />
                <span>Add Exam Score</span>
              </button>
            </div>

            {/* Performance Trend Graph Section */}
            {(student.exams && student.exams.length > 0) && (
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ ...sectionTitleStyles, borderBottom: 'none', marginBottom: '12px' }}>Student Performance Analytics Trend</h3>
                <div style={{ width: '100%', height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[...(student.exams || [])]
                        .sort((a, b) => new Date(a.dateOfExamination) - new Date(b.dateOfExamination))
                        .map(ex => ({
                          name: ex.test,
                          Percentage: Math.round((ex.marksSecured / (ex.totalMarks || 100)) * 100),
                          Score: `${ex.marksSecured}/${ex.totalMarks}`
                        }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} tickLine={false} />
                      <ChartTooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: '1px solid var(--glass-border)', 
                          borderRadius: '8px', 
                          color: '#fff' 
                        }} 
                      />
                      <Area type="monotone" dataKey="Percentage" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorPercentage)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Exam Records Table */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={sectionHeaderStyles}>
                <h3 style={{ margin: 0 }}>Examination Progress Log</h3>
              </div>

              {(student.exams && student.exams.length > 0) ? (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Test / Exam Title</th>
                        <th>Category Type</th>
                        <th>Exam Mode</th>
                        <th>Examination Date</th>
                        <th>Marks Secured</th>
                        <th>Status</th>
                        <th>Remarks / Comments</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(student.exams || [])]
                        .sort((a,b) => new Date(b.dateOfExamination) - new Date(a.dateOfExamination))
                        .map((ex) => {
                          let badgeClass = 'badge-muted';
                          if (ex.result === 'Pass') badgeClass = 'badge-success';
                          if (ex.result === 'Fail') badgeClass = 'badge-danger';
                          if (ex.result === 'Pending') badgeClass = 'badge-warning';

                          return (
                            <tr key={ex._id}>
                              <td data-label="Test / Exam Title" style={{ fontWeight: '600' }}>{ex.test}</td>
                              <td data-label="Category Type">{ex.typeOfTest}</td>
                              <td data-label="Exam Mode">{ex.typeOfExam}</td>
                              <td data-label="Examination Date">
                                {new Date(ex.dateOfExamination).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td data-label="Marks Secured" style={{ fontWeight: '700' }}>
                                {ex.marksSecured} / {ex.totalMarks || 100} ({Math.round((ex.marksSecured / (ex.totalMarks || 100)) * 100)}%)
                              </td>
                              <td data-label="Status">
                                <span className={`badge ${badgeClass}`}>{ex.result}</span>
                              </td>
                              <td data-label="Remarks / Comments" style={{ color: 'var(--text-secondary)', fontSize: '12.5px', maxWidth: '200px', wordBreak: 'break-word' }}>
                                {ex.remarks || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No remarks</span>}
                              </td>
                              <td data-label="Actions">
                                <button
                                  onClick={() => handleDeleteExam(ex._id, ex.test)}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                                  title="Delete Exam Record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Award size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.5 }} />
                  <p>No exams logged for this student.</p>
                  <span style={{ fontSize: '12px' }}>Click "Add Exam Score" above to create an academic record entry.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Activity Log */}
        {activeTab === 'activity' && (
          <div className="glass-card">
            <h3 style={sectionTitleStyles}>Student Action Logs</h3>
            {audits.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No activities logged for this student profile.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {audits.map((a) => (
                  <div key={a._id} style={auditItemStyles}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-info">{a.action}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '13px', margin: '4px 0' }}>{a.details}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Triggered by: {a.performedBy}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Documents */}
        {activeTab === 'documents' && (
          <div style={panelGridStyles}>
            <div className="glass-card" style={{ flexGrow: 1 }}>
              <h3 style={sectionTitleStyles}>Submitted Student Documents</h3>
              {(!student.documentUrls || student.documentUrls.length === 0) ? (
                <p style={{ color: 'var(--text-muted)' }}>No documents uploaded yet.</p>
              ) : (
                <div style={docListStyles}>
                  {student.documentUrls.map((doc, idx) => (
                    <div key={doc._id || idx} style={docItemStyles}>
                      <FileText size={18} style={{ color: 'var(--primary)' }} />
                      <div style={{ flexGrow: 1 }}>
                        <span style={{ fontWeight: '500' }}>{doc.name}</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Open document in a new tab"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </a>
                        <button 
                          onClick={() => handleDownloadFile(doc.url, doc.name || 'document')} 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Download document directly"
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(doc._id, doc.name)}
                          className="btn btn-secondary" 
                          style={{ padding: '6px 10px', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}
                          title="Delete document"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ minWidth: '320px' }}>
              <h3 style={sectionTitleStyles}>Upload New Document</h3>
              <form onSubmit={handleDocUpload}>
                <div className="form-group">
                  <label>Document Label / Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Identity Proof"
                    required
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Select File (PDF / Images, Max 5MB)</label>
                  <input
                    type="file"
                    className="form-control"
                    required
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
                <button type="submit" disabled={uploading} className="btn btn-primary" style={{ width: '100%' }}>
                  <Upload size={16} />
                  <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Enroll Course Modal */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} title="Enroll Student in Course Program">
        <form onSubmit={handleEnroll} style={formStyles}>
          <div className="form-group">
            <label>Select Course Program</label>
            <select
              className="form-control"
              required
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">Choose Course...</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.title} ({c.category})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Enroll Student
          </button>
        </form>
      </Modal>

      {/* Add Exam Score Modal */}
      <Modal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} title="Add Student Academic Exam Record">
        <form onSubmit={handleAddExam} style={formStyles}>
          <div className="form-group">
            <label>Test / Examination Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. JavaScript Basics Quiz 1"
              required
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Type of Test</label>
              <select className="form-control" value={examTypeOfTest} onChange={(e) => setExamTypeOfTest(e.target.value)}>
                <option value="Quiz">Quiz</option>
                <option value="Midterm">Midterm</option>
                <option value="Final">Final</option>
                <option value="Assignment">Assignment</option>
                <option value="Certification">Certification</option>
              </select>
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Exam Mode (Type of Exam)</label>
              <select className="form-control" value={examTypeOfExam} onChange={(e) => setExamTypeOfExam(e.target.value)}>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Practical">Practical</option>
                <option value="Written">Written</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Marks Secured</label>
              <input
                type="number"
                step="0.5"
                className="form-control"
                placeholder="e.g. 85"
                required
                value={examMarksSecured}
                onChange={(e) => setExamMarksSecured(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Total Marks</label>
              <input
                type="number"
                step="0.5"
                className="form-control"
                placeholder="e.g. 100"
                required
                value={examTotalMarks}
                onChange={(e) => setExamTotalMarks(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Date of Examination</label>
              <input
                type="date"
                className="form-control"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Result / Outcome</label>
              <select className="form-control" value={examResult} onChange={(e) => setExamResult(e.target.value)}>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Remarks / Instructor Comments (Optional)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="e.g. Completed with excellent understanding of DOM concepts."
              value={examRemarks}
              onChange={(e) => setExamRemarks(e.target.value)}
            />
          </div>

          <button type="submit" disabled={savingExam} className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '6px' }}>
            <Award size={16} />
            <span>{savingExam ? 'Saving Record...' : 'Save Academic Record'}</span>
          </button>
        </form>
      </Modal>

      {/* Issue Invoice Modal */}
      <Modal isOpen={isBillModalOpen} onClose={() => setIsBillModalOpen(false)} title="Issue Tuition Fee Invoice">
        <form onSubmit={handleCreateBill} style={formStyles}>
          <div className="form-group">
            <label>Invoice Sizing Amount (INR)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 1500"
              required
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              className="form-control"
              required
              value={billDueDate}
              onChange={(e) => setBillDueDate(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Generate Bill Invoice
          </button>
        </form>
      </Modal>

      {/* Add Work Log Modal */}
      <Modal isOpen={isWorkLogModalOpen} onClose={() => setIsWorkLogModalOpen(false)} title="Add Work Log Task">
        <form onSubmit={handleAddWorkLog} style={formStyles}>
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Complete React component exercise"
              required
              value={workLogTitle}
              onChange={(e) => setWorkLogTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Additional details about the task..."
              value={workLogDesc}
              onChange={(e) => setWorkLogDesc(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Status</label>
              <select className="form-control" value={workLogStatus} onChange={(e) => setWorkLogStatus(e.target.value)}>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
            <div className="form-group" style={{ flexGrow: 1 }}>
              <label>Category</label>
              <select className="form-control" value={workLogCategory} onChange={(e) => setWorkLogCategory(e.target.value)}>
                <option value="Assignment">Assignment</option>
                <option value="Project">Project</option>
                <option value="Exam Prep">Exam Prep</option>
                <option value="Research">Research</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '6px' }}>
            <Plus size={16} />
            <span>Add Task to Work Log</span>
          </button>
        </form>
      </Modal>

      <Modal isOpen={isFeeModalOpen} onClose={() => setIsFeeModalOpen(false)} title="Update Tuition Fee Agreement">
        <form onSubmit={handleUpdateFeeDetails} style={formStyles}>
          <div className="form-group">
            <label>Total Course Fee (INR)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 35000"
              required
              value={editTotalFee}
              onChange={(e) => setEditTotalFee(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Scholarship / Discount (INR)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 5000"
              required
              value={editPaidAmount}
              onChange={(e) => setEditPaidAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Next Due Date</label>
            <input
              type="date"
              className="form-control"
              value={editNextDueDate}
              onChange={(e) => setEditNextDueDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Leftover Dues Remarks</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="e.g. Will pay the remaining 20,000 next month by 10th."
              value={editFeeRemarks}
              onChange={(e) => setEditFeeRemarks(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '6px' }}
            disabled={isUpdatingFee}
          >
            {isUpdatingFee ? 'Saving Changes...' : 'Save Fee Details'}
          </button>
        </form>
      </Modal>

      {/* Settle Payment Modal */}
      <Modal isOpen={isPayModalOpen} onClose={() => { setIsPayModalOpen(false); setSelectedInvoiceId(null); }} title="Capture Settle Payment Dues">
        <form onSubmit={handleSettlePayment} style={formStyles}>
          <div className="form-group">
            <label>Amount to Pay (INR)</label>
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
                    await apiFetch(`/api/students/${student._id}/audit-whatsapp`, {
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
                    await apiFetch(`/api/students/${student._id}/audit-whatsapp`, {
                      method: 'POST',
                      body: JSON.stringify({
                        details: `Invoice Payment Link WhatsApp template sent via deep link redirection: "${shareData.whatsappMessage}"`
                      })
                    });
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
const topBarStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};

const backBtnStyles = {
  padding: '8px 16px',
};

const metaBadgeContainerStyles = {
  display: 'flex',
  gap: '10px',
};

const profileHeaderCardStyles = {
  padding: '24px',
  marginBottom: '24px',
};

const headerMainStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
};

const avatarLargeStyles = {
  width: '54px',
  height: '54px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary-glow)',
  color: 'var(--primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const tabContentStyles = {
  marginTop: '20px',
};

const panelGridStyles = {
  display: 'flex',
  gap: '24px',
  flexWrap: 'wrap',
};

const sectionTitleStyles = {
  fontSize: '1rem',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '10px',
  marginBottom: '16px',
};

const detailsGridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
};

const sectionHeaderStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--glass-border)',
  paddingBottom: '10px',
  marginBottom: '16px',
};

const courseRowStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.01)',
  padding: '14px 20px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const paymentRowStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.01)',
  padding: '14px 20px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};

const auditItemStyles = {
  backgroundColor: 'rgba(255,255,255,0.01)',
  border: '1px solid var(--glass-border)',
  padding: '10px 14px',
  borderRadius: '8px',
};

const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

// --- Work Log Kanban Styles ---
const standupSummaryContainerStyles = {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const standupCardStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--border-radius)',
  padding: '14px 20px',
  backdropFilter: 'blur(12px)',
  flex: '1 1 160px',
  minWidth: '160px',
};

const standupIconStyles = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const standupLabelStyles = {
  display: 'block',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: '700',
};

const standupValueStyles = {
  display: 'block',
  fontSize: '22px',
  fontWeight: '700',
  fontFamily: 'var(--font-headings)',
  lineHeight: '1.2',
};

const workLogKanbanContainerStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  alignItems: 'start',
};

const wlColumnStyles = {
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--border-radius)',
  padding: '14px',
  minHeight: '340px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const wlColumnHeaderStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '6px',
};

const wlDotStyles = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const wlCountBadgeStyles = {
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-secondary)',
  fontSize: '0.75rem',
  padding: '2px 8px',
  borderRadius: '12px',
  fontWeight: 'bold',
};

const wlCardsWrapperStyles = {
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  minHeight: '120px',
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 360px)',
};

const wlEmptyStyles = {
  textAlign: 'center',
  padding: '30px 12px',
  color: 'var(--text-muted)',
  border: '2px dashed var(--glass-border)',
  borderRadius: '8px',
  fontSize: '12px',
};

const wlCardStyles = {
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  padding: '12px',
  cursor: 'grab',
  transition: 'all 0.2s ease',
  position: 'relative',
};

const wlDeleteBtnStyles = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: '4px',
  transition: 'color 0.15s',
};

const finCardBoxStyles = {
  padding: '12px',
  borderRadius: '8px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid var(--glass-border)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const finCardLabelStyles = {
  fontSize: '10px',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const finCardValueStyles = {
  fontSize: '1.15rem',
  fontWeight: '700',
  marginTop: '4px',
  color: 'var(--text-primary)',
};

export default StudentDetail;

const docListStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const docItemStyles = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  backgroundColor: 'rgba(255,255,255,0.02)',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
};
