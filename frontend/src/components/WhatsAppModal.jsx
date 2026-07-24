import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Send, ExternalLink, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TEMPLATES = [
  {
    id: 'receipt',
    name: 'Receipt Confirmation',
    text: 'Hello {{name}}, thank you for your payment of ${{amount}}. Please find your payment receipt here: {{receipt}}'
  },
  {
    id: 'admission',
    name: 'Admission Confirmation',
    text: 'Hello {{name}}, welcome to TechMecha Torque! We are thrilled to confirm your admission. Your course(s): {{course}}. Assigned Mentor: {{mentor}}. Let\'s get started!'
  },
  {
    id: 'reminder',
    name: 'Payment Reminder',
    text: 'Dear {{name}}, this is a friendly reminder that a payment is due on {{dueDate}}. The outstanding balance is ${{amount}}. Please make the payment at your earliest convenience.'
  },
  {
    id: 'enrollment',
    name: 'Enrollment Confirmation',
    text: 'Dear {{name}}, your enrollment in {{course}} is confirmed. Mentor: {{mentor}}. We look forward to your active participation!'
  },
  {
    id: 'certificate',
    name: 'Certificate Notification',
    text: 'Congratulations {{name}}! You have successfully completed {{course}}. Your certificate is ready. Download it here: {{receipt}}'
  },
  {
    id: 'custom',
    name: 'Custom Message',
    text: ''
  }
];

const WhatsAppModal = ({ 
  isOpen, 
  onClose, 
  studentName, 
  phoneNumber, 
  amount, 
  receiptUrl,
  outstandingBalance,
  dueDate,
  courses,
  mentor,
  receiptNumber,
  studentId
}) => {
  const { apiFetch } = useAuth();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('receipt');

  const parseTemplate = (text) => {
    let fullUrl = '';
    if (receiptUrl) {
      if (receiptUrl.startsWith('http')) {
        fullUrl = receiptUrl;
      } else {
        fullUrl = `${window.location.protocol}//${window.location.host}${receiptUrl}`;
      }
    }

    const replacements = {
      '{{name}}': studentName || 'Student',
      '{{course}}': courses || 'General Training',
      '{{amount}}': parseFloat(amount || 0).toFixed(2),
      '{{receipt}}': fullUrl || 'No link',
      '{{mentor}}': mentor || 'TMT Staff',
      '{{dueDate}}': dueDate || 'N/A'
    };

    let result = text;
    Object.entries(replacements).forEach(([key, val]) => {
      result = result.replaceAll(key, val);
    });
    return result;
  };

  useEffect(() => {
    if (isOpen) {
      setPhone(phoneNumber || '');
      setSelectedTemplateId('receipt');
      const defaultTemplate = TEMPLATES.find(t => t.id === 'receipt');
      if (defaultTemplate) {
        setMessage(parseTemplate(defaultTemplate.text));
      }
      setStatusMsg('');
    }
  }, [
    isOpen, 
    studentName, 
    phoneNumber, 
    amount, 
    receiptUrl, 
    outstandingBalance, 
    dueDate, 
    courses, 
    mentor, 
    receiptNumber
  ]);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      if (templateId === 'custom') {
        setMessage('');
      } else {
        setMessage(parseTemplate(template.text));
      }
    }
  };

  // Option 1: Trigger Twilio Sandbox API send
  const triggerTwilioAPI = async () => {
    if (!phone) {
      setStatusMsg('Phone number is required');
      return;
    }
    setSending(true);
    setStatusMsg('');
    try {
      const sendRes = await fetch('/api/payments/whatsapp/send-mock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ to: phone, body: message, mediaUrl: receiptUrl })
      });
      const resJson = await sendRes.json();
      
      if (!sendRes.ok) {
        throw new Error(resJson.error || 'Failed to trigger API send');
      }

      // Log the audit in the timeline
      if (studentId) {
        await apiFetch(`/api/students/${studentId}/audit-whatsapp`, {
          method: 'POST',
          body: JSON.stringify({
            details: `WhatsApp template "${TEMPLATES.find(t => t.id === selectedTemplateId)?.name || 'Custom'}" sent via Twilio: "${message}"`
          })
        });
      }

      setStatusMsg('✅ WhatsApp message logged in sandbox simulation!');
    } catch (err) {
      console.error(err);
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Option 2: Deep Link (wa.me) Redirect
  const triggerDeepLink = async () => {
    if (!phone) {
      setStatusMsg('Phone number is required');
      return;
    }

    // Log the audit in the timeline before opening WhatsApp Web
    if (studentId) {
      try {
        await apiFetch(`/api/students/${studentId}/audit-whatsapp`, {
          method: 'POST',
          body: JSON.stringify({
            details: `WhatsApp template "${TEMPLATES.find(t => t.id === selectedTemplateId)?.name || 'Custom'}" sent via deep link redirection: "${message}"`
          })
        });
      } catch (err) {
        console.error('Failed to log WhatsApp deep link audit:', err);
      }
    }

    const sanitizedPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(message);
    const deepLinkUrl = `https://wa.me/${sanitizedPhone}?text=${encodedText}`;
    window.open(deepLinkUrl, '_blank');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send WhatsApp Receipt Notification">
      <div style={formStyles}>
        <div className="form-group">
          <label>Student Name</label>
          <input type="text" className="form-control" value={studentName || ''} disabled />
        </div>

        <div className="form-group">
          <label>WhatsApp Template</label>
          <select 
            className="form-control" 
            value={selectedTemplateId} 
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            {TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Recipient Phone Number (with Country Code, e.g., 919876543210)</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="e.g. 919876543210" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>WhatsApp Message Template Text (Editable)</label>
          <textarea 
            className="form-control" 
            rows="5" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>

        {statusMsg && (
          <div style={{ 
            fontSize: '12px', 
            color: statusMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', 
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            {statusMsg}
          </div>
        )}

        <div style={actionsContainerStyles}>
          <button 
            disabled={sending} 
            onClick={triggerTwilioAPI} 
            className="btn btn-primary"
            style={actionBtnStyles}
          >
            <Send size={16} />
            <span>{sending ? 'Sending...' : 'Send via Twilio'}</span>
          </button>

          <button 
            onClick={triggerDeepLink} 
            className="btn btn-secondary"
            style={actionBtnStyles}
          >
            <ExternalLink size={16} />
            <span>WhatsApp Web Link</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Styles objects ---
const formStyles = {
  display: 'flex',
  flexDirection: 'column',
};

const actionsContainerStyles = {
  display: 'flex',
  gap: '12px',
  marginTop: '10px',
};

const actionBtnStyles = {
  flexGrow: 1,
};

export default WhatsAppModal;
