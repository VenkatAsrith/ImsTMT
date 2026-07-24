const mongoose = require('mongoose');

const ReceiptSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  pdfUrl: {
    type: String,
    required: true,
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Receipt', ReceiptSchema);
