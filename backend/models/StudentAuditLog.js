const mongoose = require('mongoose');

const StudentAuditLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'Admission Created',
      'Fee Updated',
      'Payment Added',
      'Invoice Generated',
      'Receipt Sent',
      'Course Enrolled',
      'Course Completed',
      'Certificate Generated',
      'WhatsApp Sent',
      'Student Document Uploaded',
      'Student Document Deleted'
    ],
  },
  details: {
    type: String,
    required: true,
  },
  performedBy: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('StudentAuditLog', StudentAuditLogSchema);
