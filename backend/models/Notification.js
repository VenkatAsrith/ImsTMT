const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  recipientRole: {
    type: String,
    enum: ['Super Admin', 'HR Manager', 'Sales Rep', 'Finance', 'Teacher', 'Viewer', 'All'],
    default: 'All',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Info', 'Warning', 'Alert', 'Success'],
    default: 'Info',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String, // Route path e.g. '/org/interns/123'
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', NotificationSchema);
