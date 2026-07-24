const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  dealName: {
    type: String,
    required: [true, 'Please add a deal name'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Please add a deal amount'],
  },
  currency: {
    type: String,
    default: 'USD',
  },
  stage: {
    type: String,
    enum: ['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'],
    default: 'New',
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 10, // Default for 'New'
  },
  tags: [String],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  nextFollowUp: {
    type: Date,
  },
  stageHistory: [
    {
      stage: String,
      changedAt: {
        type: Date,
        default: Date.now,
      },
      reason: String, // E.g., captured if moved to Closed Won/Lost
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

DealSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Deal', DealSchema);
