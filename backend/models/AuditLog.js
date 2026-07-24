const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  action: {
    type: String, // CREATE, UPDATE, DELETE, LOGIN
    required: true,
  },
  entity: {
    type: String, // Intern, Client, Deal, Student, Course, Payment, Receipt
    required: true,
  },
  entityId: {
    type: String,
    required: true,
  },
  details: {
    type: String, // Text summary of the action
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed,
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
