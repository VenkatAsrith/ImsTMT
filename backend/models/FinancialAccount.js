const mongoose = require('mongoose');

const FinancialAccountSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
  },
  courseFee: {
    type: Number,
    required: true,
    default: 0,
  },
  scholarshipAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  agreedAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  totalPaid: {
    type: Number,
    required: true,
    default: 0,
  },
  balanceAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Fee Pending', 'Partially Paid', 'Paid'],
    default: 'Unpaid',
  },
  nextDueDate: {
    type: Date,
  },
  remarks: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update agreedAmount, balanceAmount, and paymentStatus pre-save
FinancialAccountSchema.pre('save', function (next) {
  this.agreedAmount = Math.max(0, this.courseFee - this.scholarshipAmount);
  this.balanceAmount = Math.max(0, this.agreedAmount - this.totalPaid);
  
  if (this.balanceAmount <= 0) {
    this.paymentStatus = 'Paid';
  } else if (this.totalPaid > 0) {
    this.paymentStatus = 'Partially Paid';
  } else if (this.agreedAmount > 0) {
    this.paymentStatus = 'Fee Pending';
  } else {
    this.paymentStatus = 'Unpaid';
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FinancialAccount', FinancialAccountSchema);
