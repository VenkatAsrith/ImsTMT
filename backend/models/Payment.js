const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please add a payment amount'],
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add a due date'],
  },
  paidDate: {
    type: Date,
  },
  method: {
    type: String,
    enum: ['Stripe', 'Bank Transfer', 'Cash', 'UPI', 'PayPal', 'None'],
    default: 'None',
  },
  status: {
    type: String,
    enum: ['Paid', 'Due', 'Overdue'],
    default: 'Due',
  },
  referenceNumber: {
    type: String,
    unique: true,
    required: true,
  },
  invoicePdfUrl: {
    type: String,
  },
  razorpayPaymentLinkId: {
    type: String,
  },
  razorpayPaymentLink: {
    type: String,
  },
  razorpayPaymentLinkStatus: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Payment', PaymentSchema);
